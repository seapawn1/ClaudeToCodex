import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const CODEX = '0a0a0a0a-1111-4111-8111-111111111111';

let root;
let registry;
test.before(() => {
  root = mkdtempSync(join(tmpdir(), 'ctc-connect-'));
  registry = mkdtempSync(join(tmpdir(), 'ctc-sessions-'));
});

test.after(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(registry, { recursive: true, force: true });
});

function writeSession(pid, name, sessionId, { key = true, socket = '\\\\.\\pipe\\LOCAL\\ctc-test-pipe' } = {}) {
  // Drop stale key files for this pid so a keyless rewrite stays keyless.
  for (const f of readdirSync(registry)) {
    if (f.startsWith(`${pid}.`) && f.endsWith('.key')) rmSync(join(registry, f), { force: true });
  }
  writeFileSync(join(registry, `${pid}.json`), JSON.stringify({
    pid, sessionId, name, messagingSocketPath: socket,
    status: 'idle', cwd: 'C:\\nowhere', startedAt: Date.now(), updatedAt: Date.now(),
  }));
  if (key) writeFileSync(join(registry, `${pid}.abcdef.key`), `key-for-${sessionId}`);
}

async function runConnect(name, extraEnv = {}) {
  try {
    const { stdout } = await execute('node', [cli, 'connect', '--name', name, '--sessions-dir', registry], {
      env: { ...process.env, CTC_BRIDGE_DIR: root, CODEX_THREAD_ID: CODEX, ...extraEnv },
      windowsHide: true, timeout: 30000,
    });
    return { code: 0, stdout };
  } catch (error) {
    return { code: error.code ?? 1, stderr: String(error.stderr ?? error.message) };
  }
}

test('connect reports no match with the known session names', async () => {
  writeSession(process.pid, 'Alpha dev room', '11111111-2222-4333-8444-555555555555');
  const r = await runConnect('Zebra');
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /No running Claude session name matches/);
  assert.match(r.stderr, /Alpha dev room/);
});

test('connect refuses an ambiguous name and lists candidates', async () => {
  writeSession(process.ppid, 'Alpha qa room', '22222222-3333-4444-8555-666666666666');
  const r = await runConnect('Alpha');
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /matches 2 Claude sessions/);
  assert.match(r.stderr, /Alpha dev room/);
  assert.match(r.stderr, /Alpha qa room/);
});

test('connect rejects a stale registry record for a dead process', async () => {
  writeSession(3999999, 'Ghost room', '33333333-4444-4555-8666-777777777777');
  const r = await runConnect('Ghost');
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /no longer running/);
});

test('connect rejects an alive session without a peer key', async () => {
  writeSession(process.pid, 'Keyless room', '44444444-5555-4666-8777-888888888888', { key: false });
  const r = await runConnect('Keyless');
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /no peer key/);
});

test('connect pairs a uniquely named live session and synthesizes the endpoint', async () => {
  writeSession(process.pid, 'Alpha dev room', '11111111-2222-4333-8444-555555555555');
  const r = await runConnect('dev room');
  assert.equal(r.code, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.pair.codexId, CODEX);
  assert.equal(out.pair.claudeId, '11111111-2222-4333-8444-555555555555');
  const endpoint = JSON.parse(readFileSync(out.pair.endpointPath, 'utf8'));
  assert.equal(endpoint.schema, 1);
  assert.equal(endpoint.socket, '\\\\.\\pipe\\LOCAL\\ctc-test-pipe');
  assert.ok(endpoint.tokenProtected.length > 50, 'DPAPI-protected token expected');
  assert.match(readFileSync(join(root, 'events.jsonl'), 'utf8'), /"type":"connect"/);
});

test('connect never silently replaces an existing different pair', async () => {
  // Same live session, but the registry now advertises a different Claude session id.
  writeSession(process.pid, 'Alpha dev room', '99999999-8888-4777-8666-555555555555');
  const r = await runConnect('dev room');
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /already has a different pair/);
  const pair = JSON.parse(readFileSync(join(root, 'pair.json'), 'utf8'));
  assert.equal(pair.claudeId, '11111111-2222-4333-8444-555555555555', 'pair must be untouched');
});

test('sessions lists registry entries without secrets', async () => {
  const { stdout } = await execute('node', [cli, 'sessions', '--sessions-dir', registry], {
    env: { ...process.env }, windowsHide: true, timeout: 30000,
  });
  const rows = JSON.parse(stdout);
  const devRoom = rows.find((row) => row.name === 'Alpha dev room');
  assert.ok(devRoom && devRoom.alive === true && devRoom.hasKey === true);
  assert.ok(JSON.stringify(rows).includes('key-for-') === false, 'peer keys must never appear in listings');
});
