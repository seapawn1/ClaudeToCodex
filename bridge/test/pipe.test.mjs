import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const windowsOnly = { skip: process.platform !== 'win32' };
const claudeId = '22222222-2222-4222-8222-222222222222';
const codexId = '11111111-1111-4111-8111-111111111111';
const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const registerScript = fileURLToPath(new URL('../delivery/Register-ClaudeEndpoint.ps1', import.meta.url));
const sendScript = fileURLToPath(new URL('../delivery/Send-ClaudePipe.ps1', import.meta.url));
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8').trim());

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-bridge-pipe-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const env = { ...process.env, CTC_BRIDGE_DIR: directory };
  delete env.CLAUDE_CODE_SESSION_ID;
  delete env.CLAUDE_CODE_MESSAGING_SOCKET;
  delete env.CLAUDE_CODE_MESSAGING_TOKEN;
  delete env.CODEX_THREAD_ID;
  return { directory, env };
}

function runPowerShell(script, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-File', script, ...args], {
      env, windowsHide: true, timeout: 20000,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (data) => { stdout += data; });
    child.stderr.setEncoding('utf8').on('data', (data) => { stderr += data; });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (signal) reject(new Error(`Script interrupted: ${signal}`));
      else resolve({ code, stdout, stderr });
    });
  });
}

test('registration requires the selected Claude session environment', windowsOnly, async (t) => {
  const { directory, env } = fixture(t);
  const result = await runPowerShell(registerScript, ['-Directory', join(directory, 'endpoints')], env);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /selected Claude Code session/);
});

test('register protects the token and pipe sending preserves auth-then-message framing with priority=next', windowsOnly, async (t) => {
  const { directory, env } = fixture(t);
  const socketPath = `\\\\.\\pipe\\ctc-bridge-test-${randomUUID()}`;
  const token = randomUUID().replaceAll('-', '');
  const frames = [];
  const sockets = new Set();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    let pending = '';
    socket.setEncoding('utf8').on('data', (data) => {
      pending += data;
      let end;
      while ((end = pending.indexOf('\n')) !== -1) {
        frames.push(JSON.parse(pending.slice(0, end)));
        pending = pending.slice(end + 1);
      }
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(socketPath, resolve); });
  t.after(() => new Promise((resolve) => {
    for (const socket of sockets) socket.destroy();
    server.close(resolve);
  }));

  const registration = spawnSync(process.execPath, [cli, 'register'], {
    env: { ...env, CLAUDE_CODE_SESSION_ID: claudeId, CLAUDE_CODE_MESSAGING_SOCKET: socketPath, CLAUDE_CODE_MESSAGING_TOKEN: token },
    encoding: 'utf8', timeout: 20000,
  });
  assert.equal(registration.status, 0, registration.stderr);
  assert.equal(registration.stdout.includes(token), false);
  const endpointPath = join(directory, 'endpoints', `claude-${claudeId}.json`);
  assert.equal(readFileSync(endpointPath, 'utf8').includes(token), false);
  assert.ok(readJson(endpointPath).tokenProtected);

  const messageId = randomUUID();
  const bodyPath = join(directory, 'peer-body.txt');
  const text = 'Peer message: 你好.\nQuotes "stay literal" and so do $variables.';
  writeFileSync(bodyPath, text);
  const recordPath = join(directory, 'wire', `${messageId}.send.json`);
  const result = await runPowerShell(sendScript, [
    '-EndpointPath', endpointPath, '-ReplyThreadId', codexId,
    '-MessageFile', bodyPath, '-MessageId', messageId, '-RecordPath', recordPath,
  ], env);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout.includes(token), false);
  assert.equal(frames.length, 2);
  assert.deepEqual(frames[0], { type: 'auth', token });
  assert.equal(frames[1].msgV, 1);
  assert.equal(frames[1].msg_id, messageId);
  assert.equal(frames[1].priority, 'next');
  assert.equal(frames[1].session_id, claudeId);
  assert.equal(frames[1].message.role, 'user');
  assert.equal(frames[1].message.content, text);
  const record = readJson(recordPath);
  assert.equal(record.pipeWrite, 'completed');
  assert.equal(record.receipt, 'unverified');
  assert.equal(record.priority, 'next');
  assert.equal(readFileSync(recordPath, 'utf8').includes(token), false);
});

test('pipe sending to a dead endpoint reports failure without throwing away evidence', windowsOnly, async (t) => {
  const { directory, env } = fixture(t);
  mkdirSync(join(directory, 'endpoints'), { recursive: true });
  const endpointPath = join(directory, 'endpoints', `claude-${claudeId}.json`);
  const secure = spawnSync('powershell.exe', ['-NoProfile', '-Command',
    `ConvertTo-SecureString -String 'unused' -AsPlainText -Force | ConvertFrom-SecureString`], { encoding: 'utf8', timeout: 10000 });
  writeFileSync(endpointPath, JSON.stringify({
    schema: 1, sessionId: claudeId, socket: '\\\\.\\pipe\\ctc-bridge-dead-endpoint',
    tokenProtected: secure.stdout.trim(), registeredAt: 'test', cwd: 'test',
  }));
  const messageId = randomUUID();
  const bodyPath = join(directory, 'peer-body.txt');
  writeFileSync(bodyPath, 'No pipe server is listening here.');
  const recordPath = join(directory, 'wire', `${messageId}.send.json`);
  const result = await runPowerShell(sendScript, [
    '-EndpointPath', endpointPath, '-ReplyThreadId', codexId,
    '-MessageFile', bodyPath, '-MessageId', messageId, '-RecordPath', recordPath,
  ], env);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /pipe write failed/);
  const record = readJson(recordPath);
  assert.equal(record.pipeWrite, 'not-completed');
  assert.ok(record.error);
});
