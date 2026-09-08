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

// Codex-side child processes must present ONLY the Codex identity; an ambient
// CLAUDE_CODE_SESSION_ID (e.g. inherited from a Claude-hosted test runner) would make
// caller() reject with "exactly one of the two selected original sessions".
function codexEnv(dataDir, extra = {}) {
  const env = { ...process.env, CTC_BRIDGE_DIR: dataDir, CODEX_THREAD_ID: CODEX, ...extra };
  delete env.CLAUDE_CODE_SESSION_ID;
  return env;
}

async function runConnect(name, extraEnv = {}, dataDir = root) {
  try {
    const { stdout } = await execute('node', [cli, 'connect', '--name', name, '--sessions-dir', registry], {
      env: codexEnv(dataDir, extraEnv),
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

test('peer reply entry carries the data directory and installed CLI path', async () => {
  const { renderPeer } = await import('../store.mjs');
  const { commandString } = await import('../entry.mjs');
  const message = {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    pairId: '11111111-2222-4333-8444-555555555555',
    conversationId: '22222222-3333-4444-8555-666666666666',
    replyTo: null,
    from: { tool: 'codex', sessionId: '0a0a0a0a-1111-4111-8111-111111111111' },
    to: { tool: 'claude', sessionId: '11111111-2222-4333-8444-555555555555' },
    body: 'peer body', createdAt: new Date(0).toISOString(),
  };
  const text = renderPeer(message, 'C:\\isolated\\bridge-data');
  assert.match(text, /\$env:CTC_BRIDGE_DIR='C:\\isolated\\bridge-data';/);
  assert.match(text, new RegExp(`reply --to ${message.id}`));
  // Pin the CLI path to the module under test's own location — this is what makes the
  // entry relocate with the installation instead of depending on any dev-workspace path.
  assert.ok(text.includes(commandString()), 'reply entry must embed commandString() of the running CLI');
});

test('connect rejects a session whose registry socket is not a native pipe', async () => {
  writeSession(process.pid, 'Odd socket room', '55555555-6666-4777-8888-999999999999', { socket: 'tcp://not-a-pipe' });
  const r = await runConnect('Odd socket');
  assert.notEqual(r.code, 0);
  assert.match(r.stderr, /no native Windows named pipe/);
});

test('send to a dead endpoint fails loudly and never reports submitted', async () => {
  // A well-shaped pipe name that nothing listens on: connect pairs, the send must fail.
  const isolated = mkdtempSync(join(tmpdir(), 'ctc-deadpipe-'));
  try {
    writeSession(process.pid, 'Silent pipe room', '66666666-7777-4888-9999-aaaaaaaaaaaa', { socket: '\\\\.\\pipe\\LOCAL\\ctc-no-listener-here' });
    let connect;
    try {
      const { stdout } = await execute('node', [cli, 'connect', '--name', 'Silent pipe', '--sessions-dir', registry], {
        env: codexEnv(isolated),
        windowsHide: true, timeout: 30000,
      });
      connect = { code: 0, stdout };
    } catch (error) {
      connect = { code: error.code ?? 1, stderr: String(error.stderr ?? error.message) };
    }
    assert.equal(connect.code, 0);
    let send;
    try {
      const { stdout } = await execute('node', [cli, 'send', '--body', 'CTC-DEAD-PIPE-PROBE'], {
        env: codexEnv(isolated),
        windowsHide: true, timeout: 60000,
      });
      send = { code: 0, stdout };
    } catch (error) {
      send = { code: error.code ?? 1, stdout: String(error.stdout ?? ''), stderr: String(error.stderr ?? error.message) };
    }
    assert.notEqual(send.code, 0, 'send to a dead pipe must exit non-zero');
    assert.ok(!send.stdout.includes('"submitted"'), 'failed send must not print a submitted receipt');
    const events = readFileSync(join(isolated, 'events.jsonl'), 'utf8');
    assert.match(events, /"type":"send-error"/, 'failure must be recorded as send-error');
    assert.ok(!events.includes('key-for-'), 'peer key must not leak into events');
  } finally {
    rmSync(isolated, { recursive: true, force: true });
    // Restore the registry record other tests rely on.
    writeSession(process.pid, 'Alpha dev room', '11111111-2222-4333-8444-555555555555');
  }
});

test('default data location is product-managed when no bridge env is preset', async () => {
  const { defaultRoot } = await import('../store.mjs');
  const saved = process.env.CTC_BRIDGE_DIR;
  delete process.env.CTC_BRIDGE_DIR;
  try {
    const resolved = defaultRoot();
    const base = process.env.LOCALAPPDATA ?? '';
    assert.ok(resolved.toLowerCase().startsWith(base.toLowerCase()), `default root must live under LOCALAPPDATA, got ${resolved}`);
    assert.ok(resolved.toLowerCase().includes('claudetocodex'));
  } finally {
    if (saved !== undefined) process.env.CTC_BRIDGE_DIR = saved;
  }
});
