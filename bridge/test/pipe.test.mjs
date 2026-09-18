import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { sendClaudeMessage } from '../delivery/transport.mjs';

// Sprint 08 / D-H②: the end-to-end delivery tests run on BOTH platforms with
// the unified Node transport as the client (the PowerShell client is retired).
// The fixture server is a named pipe on Windows and a Unix domain socket
// elsewhere; register is the native Node command, and the token follows each
// platform's policy (DPAPI at rest on Windows, live .key read on POSIX).

const claudeId = '22222222-2222-4222-8222-222222222222';
const codexId = '11111111-1111-4111-8111-111111111111';
const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8').trim());

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-bridge-pipe-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const env = { ...process.env, CTC_BRIDGE_DIR: directory, CTC_SESSIONS_DIR: join(directory, 'registry') };
  delete env.CLAUDE_CODE_SESSION_ID;
  delete env.CLAUDE_CODE_MESSAGING_SOCKET;
  delete env.CLAUDE_CODE_MESSAGING_TOKEN;
  delete env.CODEX_THREAD_ID;
  return { directory, env };
}

function lineServer(t, socketPath) {
  const frames = [];
  const sockets = new Set();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    let buffered = '';
    socket.setEncoding('utf8').on('data', (data) => {
      buffered += data;
      let end;
      while ((end = buffered.indexOf('\n')) !== -1) {
        frames.push(JSON.parse(buffered.slice(0, end)));
        buffered = buffered.slice(end + 1);
      }
    });
  });
  return {
    frames,
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

test('registration requires the selected Claude session environment', (t) => {
  const { directory, env } = fixture(t);
  const result = spawnSync(process.execPath, [cli, 'register'], { env, encoding: 'utf8', timeout: 20000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /selected Claude Code session/);
});

test('register + unified delivery preserve auth-then-message framing with priority=next', async (t) => {
  const { directory, env } = fixture(t);
  const socketPath = process.platform === 'win32'
    ? `\\\\.\\pipe\\ctc-bridge-test-${randomUUID()}`
    : join(directory, 'peer.sock');
  const token = randomUUID().replaceAll('-', '');
  const server = lineServer(t, socketPath);
  await server.listen();
  t.after(() => server.close());

  const registration = spawnSync(process.execPath, [cli, 'register'], {
    env: { ...env, CLAUDE_CODE_SESSION_ID: claudeId, CLAUDE_CODE_MESSAGING_SOCKET: socketPath, CLAUDE_CODE_MESSAGING_TOKEN: token },
    encoding: 'utf8', timeout: 20000,
  });
  assert.equal(registration.status, 0, registration.stderr);
  const endpointPath = join(directory, 'endpoints', `claude-${claudeId}.json`);
  const endpoint = readJson(endpointPath);
  let expectedToken = token;
  if (process.platform === 'win32') {
    assert.ok(endpoint.tokenProtected);
    assert.equal(readFileSync(endpointPath, 'utf8').includes(token), false);
  } else {
    // POSIX (D-B): nothing secret at rest; the live registry carries the key
    // the transport reads at send time. The delivery below runs in-process,
    // so the registry override is set on the live environment and restored.
    assert.equal(endpoint.tokenProtected, undefined);
    const registry = env.CTC_SESSIONS_DIR;
    mkdirSync(registry, { recursive: true });
    const previousSessionsDir = process.env.CTC_SESSIONS_DIR;
    process.env.CTC_SESSIONS_DIR = registry;
    t.after(() => {
      if (previousSessionsDir === undefined) delete process.env.CTC_SESSIONS_DIR;
      else process.env.CTC_SESSIONS_DIR = previousSessionsDir;
    });
    writeFileSync(join(registry, `${process.pid}.json`), JSON.stringify({
      pid: process.pid, sessionId: claudeId, name: 'pipe-test', messagingSocketPath: socketPath,
      status: 'running', updatedAt: Date.now(),
    }));
    writeFileSync(join(registry, `${process.pid}.pipe.key`), JSON.stringify({ peerToken: token, pidDomain: 'test' }));
  }

  const messageId = randomUUID();
  const bodyPath = join(directory, 'peer-body.txt');
  const text = 'Peer message: 你好.\nQuotes "stay literal" and so do $variables.';
  writeFileSync(bodyPath, text);
  const recordPath = join(directory, 'wire', `${messageId}.send.json`);
  await sendClaudeMessage({
    endpointPath, replyThreadId: codexId, messageFile: bodyPath, messageId, recordPath,
    // Default tokenLoader: DPAPI unwrap on Windows, live .key read on POSIX.
  });

  assert.equal(server.frames.length, 2);
  assert.deepEqual(server.frames[0], { type: 'auth', token: expectedToken });
  assert.equal(server.frames[1].msgV, 1);
  assert.equal(server.frames[1].msg_id, messageId);
  assert.equal(server.frames[1].priority, 'next');
  assert.equal(server.frames[1].session_id, claudeId);
  assert.equal(server.frames[1].message.role, 'user');
  assert.equal(server.frames[1].message.content, text);
  const record = readJson(recordPath);
  assert.equal(record.pipeWrite, 'completed');
  assert.equal(record.receipt, 'unverified');
  assert.equal(record.priority, 'next');
  assert.equal(readFileSync(recordPath, 'utf8').includes(token), false);
});

test('delivery to a dead endpoint reports failure without throwing away evidence', async (t) => {
  const { directory, env } = fixture(t);
  const deadSocket = process.platform === 'win32'
    ? '\\\\.\\pipe\\ctc-bridge-dead-endpoint'
    : join(directory, 'gone', 'peer.sock');
  const endpointPath = join(directory, 'endpoints', `claude-${claudeId}.json`);
  mkdirSync(join(directory, 'endpoints'), { recursive: true });
  writeFileSync(endpointPath, JSON.stringify({
    schema: 1, sessionId: claudeId, socket: deadSocket,
    tokenProtected: 'unused', registeredAt: 'test', cwd: 'test',
  }));
  const messageId = randomUUID();
  const bodyPath = join(directory, 'peer-body.txt');
  writeFileSync(bodyPath, 'No server is listening here.');
  const recordPath = join(directory, 'wire', `${messageId}.send.json`);
  await assert.rejects(
    sendClaudeMessage({ endpointPath, replyThreadId: codexId, messageFile: bodyPath, messageId, recordPath }),
    /Claude pipe write failed/,
  );
  const record = readJson(recordPath);
  assert.equal(record.pipeWrite, 'not-completed');
  assert.ok(record.error);
  assert.equal(existsSync(bodyPath), true);
});
