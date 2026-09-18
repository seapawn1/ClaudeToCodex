import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createConnection, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { sendClaudeMessage } from '../delivery/transport.mjs';

// Sprint 08 / D-A: pins the five equivalence points of the unified Node
// transport against the retired Send-ClaudePipe.ps1 wire contract:
// ① auth -> 500ms gap -> frame, LF newlines, no BOM/CR
// ② wire/<id>.send.json double-write: not-completed record on disk before any
//    network I/O, rewritten in the exit path
// ③ pipeWrite 'completed' only after the frame write callback and end()/close
// ④ self-built connect timeout (5000ms default) and overall delivery budget
// ⑤ honest error taxonomy (ENOENT / ECONNREFUSED / EPIPE / timeouts), no
//    implicit retry, and errors never distinguish a wrong token from unverified

const claudeId = '22222222-2222-4222-8222-222222222222';
const codexId = '11111111-1111-4111-8111-111111111111';
const fixtureToken = 'fixture-peer-token';
const posixHang = {
  skip: process.platform === 'win32'
    ? 'posix-only kernel-level connect hang; the Windows client path is covered by the W1 interop probe'
    : false,
};

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-transport-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

// A line-collecting socket server with per-line arrival timestamps and the raw
// byte stream, so tests can assert framing bytes, not just parsed values.
function lineServer(directory, { onLine } = {}) {
  const socketPath = join(directory, 'peer.sock');
  const sockets = new Set();
  const lines = [];
  const arrivals = [];
  let raw = '';
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    let buffered = '';
    socket.setEncoding('utf8').on('data', (data) => {
      raw += data;
      buffered += data;
      let end;
      while ((end = buffered.indexOf('\n')) !== -1) {
        const line = buffered.slice(0, end);
        buffered = buffered.slice(end + 1);
        arrivals.push(process.hrtime.bigint());
        lines.push(JSON.parse(line));
        onLine?.(socket, lines.length, line);
      }
    });
  });
  return {
    socketPath, lines, arrivals, raw: () => raw,
    listen: () => new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(socketPath, resolve);
    }),
    close: () => new Promise((resolve) => {
      for (const socket of sockets) socket.destroy();
      server.close(resolve);
    }),
  };
}

function endpointFile(directory, socketPath) {
  const endpointPath = join(directory, 'endpoints', `claude-${claudeId}.json`);
  mkdirSync(join(directory, 'endpoints'), { recursive: true });
  writeFileSync(endpointPath, JSON.stringify({
    schema: 1, sessionId: claudeId, socket: socketPath,
    tokenProtected: 'fixture-protected-placeholder', registeredAt: 'test', cwd: 'test',
  }));
  return endpointPath;
}

// deliver() rejects whenever delivery fails, so rejected tests read the one
// record file out of the wire directory instead of using a return value.
function onlyRecord(directory) {
  const wireDir = join(directory, 'wire');
  const [recordFile] = readdirSync(wireDir).filter((f) => f.endsWith('.send.json'));
  return JSON.parse(readFileSync(join(wireDir, recordFile), 'utf8'));
}

async function deliver(directory, { endpointPath, socketPath, text = 'hello', tokenLoader, ...rest }) {
  const messageId = randomUUID();
  const bodyPath = join(directory, 'peer-body.txt');
  writeFileSync(bodyPath, text);
  const recordPath = join(directory, 'wire', `${messageId}.send.json`);
  const outcome = await sendClaudeMessage({
    endpointPath: endpointPath ?? endpointFile(directory, socketPath),
    replyThreadId: codexId, messageFile: bodyPath, messageId, recordPath,
    tokenLoader: tokenLoader ?? (async () => fixtureToken),
    ...rest,
  });
  return { outcome, recordPath, messageId };
}

test('①③ happy path: auth line then frame after the 500ms gap, LF framing, completed only after end/close', async (t) => {
  const directory = fixture(t);
  const server = lineServer(directory);
  await server.listen();
  const text = 'Peer message: 你好.\nQuotes "stay literal" and so do $variables.';
  const { recordPath, messageId } = await deliver(directory, { socketPath: server.socketPath, text });

  // ① exactly two LF-terminated JSON lines, auth first, frame second.
  assert.equal(server.lines.length, 2);
  assert.deepEqual(server.lines[0], { type: 'auth', token: fixtureToken });
  assert.equal(server.lines[1].msgV, 1);
  assert.equal(server.lines[1].type, 'user');
  assert.equal(server.lines[1].msg_id, messageId);
  assert.equal(server.lines[1].priority, 'next');
  assert.equal(server.lines[1].session_id, claudeId);
  assert.equal(server.lines[1].message.role, 'user');
  assert.equal(server.lines[1].message.content, text);
  // ① the observed auth-to-frame arrival gap honors the 500ms pacing.
  const gapMs = Number(server.arrivals[1] - server.arrivals[0]) / 1e6;
  assert.ok(gapMs >= 450, `auth-to-frame gap ${gapMs}ms is below the 500ms pacing`);
  // ① raw bytes: LF-only framing, no CR, no UTF-8 BOM.
  assert.ok(server.raw().endsWith('\n'));
  assert.equal(server.raw().includes('\r'), false);
  assert.equal(server.raw().startsWith('﻿'), false);

  // ③ the promise resolved only after end()/close, so both lines were already
  // on the server; the record claims completed with the parity fields.
  const record = JSON.parse(readFileSync(recordPath, 'utf8'));
  assert.equal(record.pipeWrite, 'completed');
  assert.equal(record.receipt, 'unverified');
  assert.equal(record.priority, 'next');
  assert.equal(record.direction, 'codex-to-claude');
  assert.equal(record.senderThreadId, codexId);
  assert.equal(record.recipientSessionId, claudeId);
  assert.equal(record.message, text);
  assert.ok(record.pipeWriteStartedAt);
  assert.ok(record.pipeWriteFinishedAt >= record.pipeWriteStartedAt);
  assert.equal(record.error, null);
  // ⑤ no key material in the on-disk record.
  assert.equal(readFileSync(recordPath, 'utf8').includes(fixtureToken), false);
  await server.close();
});

test('② attempt evidence: the not-completed record exists before any network I/O and survives a token failure', async (t) => {
  const directory = fixture(t);
  const server = lineServer(directory);
  await server.listen();
  await assert.rejects(
    deliver(directory, {
      socketPath: server.socketPath,
      tokenLoader: async () => { throw new Error('token source unavailable'); },
    }),
    /token source unavailable/,
  );
  // The failure happened before connect, yet the record is on disk.
  const record = onlyRecord(directory);
  assert.equal(record.pipeWrite, 'not-completed');
  assert.equal(record.receipt, 'unverified');
  assert.ok(record.error);
  assert.ok(record.pipeWriteStartedAt);
  assert.ok(record.pipeWriteFinishedAt);
  assert.equal(server.lines.length, 0);
  await server.close();
});

test('⑤ ENOENT: missing socket file is classified honestly and leaves evidence', async (t) => {
  const directory = fixture(t);
  await assert.rejects(
    deliver(directory, { socketPath: join(directory, 'gone', 'peer.sock') }),
    (error) => {
      assert.match(error.message, /Claude pipe write failed: .*ENOENT/);
      return true;
    },
  );
  const record = onlyRecord(directory);
  assert.equal(record.pipeWrite, 'not-completed');
  assert.equal(record.receipt, 'unverified');
  assert.ok(record.error.includes('ENOENT'));
});

test('⑤ ECONNREFUSED: stale socket file is classified honestly, one attempt only', async (t) => {
  const directory = fixture(t);
  // A regular file at the socket path yields ECONNREFUSED on connect.
  writeFileSync(join(directory, 'peer.sock'), '');
  await assert.rejects(
    deliver(directory, { socketPath: join(directory, 'peer.sock') }),
    (error) => {
      assert.match(error.message, /ECONNREFUSED/);
      return true;
    },
  );
  const record = onlyRecord(directory);
  assert.equal(record.pipeWrite, 'not-completed');
  assert.equal(record.receipt, 'unverified');
  assert.ok(record.error.includes('ECONNREFUSED'));
});

test('⑤ EPIPE: server dropping the connection mid-delivery leaves not-completed evidence', async (t) => {
  const directory = fixture(t);
  const server = lineServer(directory, { onLine: (socket, count) => { if (count === 1) socket.destroy(); } });
  await server.listen();
  await assert.rejects(
    deliver(directory, { socketPath: server.socketPath }),
    (error) => {
      assert.match(error.message, /Claude pipe write failed/);
      return true;
    },
  );
  const record = onlyRecord(directory);
  assert.equal(record.pipeWrite, 'not-completed');
  assert.equal(record.receipt, 'unverified');
  assert.ok(record.error);
  // No retry: the server saw the auth line exactly once.
  assert.equal(server.lines.length, 1);
  await server.close();
});

test('④⑤ full-backlog socket: the surfaced connect failure is classified honestly, fast, without retry', posixHang, async (t) => {
  const directory = fixture(t);
  // Linux reality check that shaped this test: a UDS connect either completes
  // while queued (accept not required) or, once the backlog is full, surfaces
  // EAGAIN through libuv's retry loop - a real kernel connect hang is not
  // manufacturable here. So this exercises the reachable branch (a busy socket
  // that never accepts) and asserts the honest fast failure; the self-built
  // connect timeout's blocking-path proof runs in the W1 Windows pipe probe,
  // where a server that never calls ConnectNamedPipe hangs clients reliably.
  const hangScript = join(directory, 'hang.py');
  writeFileSync(hangScript, [
    'import socket, sys, time',
    'path = sys.argv[1]',
    's = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)',
    's.bind(path)',
    's.listen(1)',
    'print("listening", flush=True)',
    'time.sleep(60)',
  ].join('\n'));
  const socketPath = join(directory, 'hang.sock');
  const child = spawn('python3', [hangScript, socketPath], { stdio: ['ignore', 'pipe', 'ignore'] });
  t.after(() => { child.kill('SIGKILL'); });
  await new Promise((resolve) => child.stdout.once('data', resolve));
  // listen(1) empirically admits two queued connects on this kernel; taking
  // both slots leaves the transport's connect against a full backlog.
  const fillers = [createConnection({ path: socketPath }), createConnection({ path: socketPath })];
  t.after(() => { for (const filler of fillers) filler.destroy(); });

  const started = Date.now();
  await assert.rejects(
    deliver(directory, { socketPath, connectTimeoutMs: 400, budgetMs: 5000 }),
    (error) => {
      assert.match(error.message, /Claude pipe write failed: /);
      // Whatever the kernel surfaced (EAGAIN here, a timeout elsewhere), the
      // failure is classified, and the budget watchdog did not mask it.
      assert.doesNotMatch(error.message, /budget/);
      return true;
    },
  );
  assert.ok(Date.now() - started < 5000, 'failure surfaced fast, without retry loops');
  const record = onlyRecord(directory);
  assert.equal(record.pipeWrite, 'not-completed');
  assert.equal(record.receipt, 'unverified');
  assert.ok(record.error);
});

test('④ overall delivery budget destroys the socket and records the overrun', async (t) => {
  const directory = fixture(t);
  const server = lineServer(directory);
  await server.listen();
  await assert.rejects(
    deliver(directory, { socketPath: server.socketPath, gapMs: 1500, budgetMs: 300 }),
    (error) => {
      assert.match(error.message, /Delivery budget \(300ms\) exceeded/);
      return true;
    },
  );
  const record = onlyRecord(directory);
  assert.equal(record.pipeWrite, 'not-completed');
  assert.match(record.error, /budget/);
  // The watchdog fired during the auth-to-frame gap: exactly one line out.
  assert.equal(server.lines.length, 1);
  await server.close();
});

test('endpoint and argument validation reject bad input before any record is written', async (t) => {
  const directory = fixture(t);
  mkdirSync(join(directory, 'endpoints'), { recursive: true });
  const bodyPath = join(directory, 'peer-body.txt');
  writeFileSync(bodyPath, 'x');
  const recordPath = join(directory, 'wire', `${randomUUID()}.send.json`);
  const base = {
    replyThreadId: codexId, messageFile: bodyPath, messageId: randomUUID(), recordPath,
    tokenLoader: async () => fixtureToken,
  };

  // tokenProtected is required only on Windows (D-B: Linux stores no secret).
  const overrides = [{ schema: 2 }, { sessionId: 'not-a-uuid' }, { socket: '' }];
  if (process.platform === 'win32') overrides.push({ tokenProtected: '' });
  for (const override of overrides) {
    const endpointPath = join(directory, 'endpoints', 'bad.json');
    writeFileSync(endpointPath, JSON.stringify({
      schema: 1, sessionId: claudeId, socket: '/valid/path', tokenProtected: 'x', ...override,
    }));
    await assert.rejects(sendClaudeMessage({ ...base, endpointPath }), /Invalid Claude endpoint registration/);
  }
  // A Windows pipe name is invalid on a POSIX host and vice versa on Windows.
  const wrongPlatform = process.platform === 'win32' ? '/tmp/peer.sock' : '\\\\.\\pipe\\ctc-x';
  const wrongPath = join(directory, 'endpoints', 'wrong-platform.json');
  writeFileSync(wrongPath, JSON.stringify({
    schema: 1, sessionId: claudeId, socket: wrongPlatform, tokenProtected: 'x',
  }));
  await assert.rejects(sendClaudeMessage({ ...base, endpointPath: wrongPath }), /Invalid Claude endpoint registration/);
  // Non-UUID ids and empty message text are rejected like the old client.
  const goodEndpoint = endpointFile(directory, '/valid/path');
  await assert.rejects(sendClaudeMessage({ ...base, endpointPath: goodEndpoint, replyThreadId: 'nope' }), /Expected an exact thread UUID/);
  await assert.rejects(sendClaudeMessage({ ...base, endpointPath: goodEndpoint, messageId: 'nope' }), /Expected an exact message UUID/);
  const emptyBody = join(directory, 'empty.txt');
  writeFileSync(emptyBody, '   \n  ');
  await assert.rejects(sendClaudeMessage({ ...base, endpointPath: goodEndpoint, messageFile: emptyBody }), /Bridge message text is empty/);
  assert.equal(existsSync(recordPath), false);
});
