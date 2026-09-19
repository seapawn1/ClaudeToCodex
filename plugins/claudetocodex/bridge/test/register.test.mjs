import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Sprint 08 / W3: register is native Node (was Register-ClaudeEndpoint.ps1).
// Same guard (the three Claude messaging variables), same output lines, and
// the platform-branched token policy of D-B: nothing secret at rest on POSIX,
// DPAPI-wrapped on Windows.

const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const claudeId = '88888888-8888-4888-8888-888888888888';
const fixtureToken = 'w3-register-fixture-token';

function runRegister(t, envOverrides) {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-register-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const env = { ...process.env, CTC_BRIDGE_DIR: directory };
  for (const name of ['CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_MESSAGING_SOCKET', 'CLAUDE_CODE_MESSAGING_TOKEN', 'CODEX_THREAD_ID', 'CLAUDE_CODE_MESSAGING_SOCKET']) delete env[name];
  Object.assign(env, envOverrides);
  const result = spawnSync(process.execPath, [cli, 'register'], { env, encoding: 'utf8', timeout: 20000 });
  return { directory, result };
}

test('register stores the endpoint with zero secret at rest on POSIX', { skip: process.platform === 'win32' ? 'POSIX branch; the DPAPI path is exercised in W10 regression' : false }, (t) => {
  const { directory, result } = runRegister(t, {
    CLAUDE_CODE_SESSION_ID: claudeId,
    CLAUDE_CODE_MESSAGING_SOCKET: '/run/user/1000/cc-socks/4242.sock',
    CLAUDE_CODE_MESSAGING_TOKEN: fixtureToken,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`REGISTERED_CLAUDE_SESSION=${claudeId}`));
  assert.match(result.stdout, /ENDPOINT_FILE=/);
  assert.match(result.stdout, /No token is stored at rest on this platform/);
  const endpointPath = join(directory, 'endpoints', `claude-${claudeId}.json`);
  const endpoint = JSON.parse(readFileSync(endpointPath, 'utf8'));
  assert.equal(endpoint.schema, 1);
  assert.equal(endpoint.sessionId, claudeId);
  assert.equal(endpoint.socket, '/run/user/1000/cc-socks/4242.sock');
  assert.ok(endpoint.registeredAt);
  assert.equal(endpoint.tokenProtected, undefined, 'no secret at rest on POSIX');
  assert.equal(readFileSync(endpointPath, 'utf8').includes(fixtureToken), false);
});

test('register refuses to run outside a Claude session tool environment', (t) => {
  const { result } = runRegister(t, {});
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Run this command from the selected Claude Code session tool/);
});

test('register rejects a non-native socket shape for the platform', (t) => {
  const { result } = runRegister(t, {
    CLAUDE_CODE_SESSION_ID: claudeId,
    CLAUDE_CODE_MESSAGING_SOCKET: process.platform === 'win32' ? '/tmp/not-a-pipe' : '\\\\.\\pipe\\not-a-uds',
    CLAUDE_CODE_MESSAGING_TOKEN: fixtureToken,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not a native socket for this platform/);
});

test('register refuses a malformed session id without writing anything', (t) => {
  const { directory, result } = runRegister(t, {
    CLAUDE_CODE_SESSION_ID: 'not-a-uuid',
    CLAUDE_CODE_MESSAGING_SOCKET: '/run/user/1000/cc-socks/1.sock',
    CLAUDE_CODE_MESSAGING_TOKEN: fixtureToken,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /selected Claude Code session tool/);
  assert.equal(existsSync(join(directory, 'endpoints')), false);
});
