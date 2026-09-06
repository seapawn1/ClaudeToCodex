import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const windowsOnly = { skip: process.platform !== 'win32' };
const claudeId = '22222222-2222-4222-8222-222222222222';
const codexId = '11111111-1111-4111-8111-111111111111';
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8').trim());

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'claude-pipe-probe-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const env = { ...process.env, TEMP: directory, TMP: directory, TMPDIR: directory };
  delete env.CLAUDE_CODE_SESSION_ID;
  delete env.CLAUDE_CODE_MESSAGING_SOCKET;
  delete env.CLAUDE_CODE_MESSAGING_TOKEN;
  return { directory, env };
}

function runScript(name, args, env) {
  const script = fileURLToPath(new URL(`../prototype/${name}`, import.meta.url));
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-File', script, ...args], {
      env, windowsHide: true, timeout: 12000,
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
  const { env } = fixture(t);
  const result = await runScript('Register-ClaudeEndpoint.ps1', [], env);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /selected Claude Code session/);
});

test('registration protects the token and pipe sending preserves auth then message framing', windowsOnly, async (t) => {
  const { directory, env } = fixture(t);
  const socketPath = `\\\\.\\pipe\\prototype-test-${randomUUID()}`;
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
  const registration = await runScript('Register-ClaudeEndpoint.ps1', [], {
    ...env, CLAUDE_CODE_SESSION_ID: claudeId,
    CLAUDE_CODE_MESSAGING_SOCKET: socketPath, CLAUDE_CODE_MESSAGING_TOKEN: token,
  });
  assert.equal(registration.code, 0, registration.stderr);
  assert.equal(registration.stdout.includes(token), false);
  const endpointPath = join(directory, 'cross-session-agent-messaging', `claude-${claudeId}.json`);
  assert.equal(readFileSync(endpointPath, 'utf8').includes(token), false);
  assert.ok(readJson(endpointPath).tokenProtected);
  const result = await runScript('Send-ClaudeProbe.ps1', ['-EndpointPath', endpointPath, '-ReplyThreadId', codexId], env);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout.includes(token), false);
  assert.equal(frames.length, 2);
  assert.deepEqual(frames[0], { type: 'auth', token });
  assert.equal(frames[1].msgV, 1);
  assert.equal(frames[1].session_id, claudeId);
  assert.equal(frames[1].message.role, 'user');
  const body = frames[1].message.content;
  const marker = body.match(/P05-[0-9a-f]{32}/)?.[0];
  assert.ok(marker);
  assert.ok(body.includes(`-ThreadId ${codexId} -Marker ${marker}\n`));
  const recordPath = join(directory, 'cross-session-agent-messaging', 'probes', `${marker}-send.json`);
  assert.equal(readJson(recordPath).pipeWrite, 'completed');
  assert.equal(readJson(recordPath).receipt, 'unverified');
  assert.equal(readFileSync(recordPath, 'utf8').includes(token), false);
});

test('reply runs from Claude and queues the marker for the exact original Codex thread', windowsOnly, async (t) => {
  const { directory, env } = fixture(t);
  const capture = join(directory, 'queue-arguments.json');
  writeFileSync(join(directory, 'codex.ps1'), '[IO.File]::WriteAllText($env:PROBE_QUEUE_CAPTURE, ($args | ConvertTo-Json -Compress))\nexit 0\n');
  for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
  env.PATH = `${directory};${process.env.PATH}`;
  env.PROBE_QUEUE_CAPTURE = capture;
  const marker = `P05-${'a'.repeat(32)}`;
  const args = ['-ThreadId', codexId, '-Marker', marker];
  const rejected = await runScript('Reply-CodexProbe.ps1', args, env);
  assert.notEqual(rejected.code, 0);
  const result = await runScript('Reply-CodexProbe.ps1', args, { ...env, CLAUDE_CODE_SESSION_ID: claudeId });
  assert.equal(result.code, 0, result.stderr);
  const queued = readJson(capture);
  assert.deepEqual(queued.slice(0, 4), ['queue', '--thread', codexId, '--message']);
  assert.ok(queued[4].includes(`P05-REPLY ${marker} from Claude session ${claudeId}`));
});
