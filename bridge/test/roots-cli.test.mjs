import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { BridgeStore } from '../store.mjs';
import { readIndex } from '../roots.mjs';

// Sprint 05 / PBI-15 end-to-end resolution: connect without CTC_BRIDGE_DIR
// against an occupied default root, then prove the Codex hook finds the
// per-thread root by the event's session_id alone - the exact mechanism the
// 9-13 incident broke. The children get a private LOCALAPPDATA and index file
// so no machine state is touched.

const execute = promisify(execFile);
const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
const CODEX_A = 'aaaaaaaa-1111-4111-8111-111111111111';
const CODEX_B = 'bbbbbbbb-2222-4222-8222-222222222222';
const CLAUDE_S = 'dddddddd-4444-4444-8444-444444444444';

let base;
let registry;
test.before(() => {
  base = mkdtempSync(join(tmpdir(), 'ctc-roots-cli-'));
  registry = mkdtempSync(join(tmpdir(), 'ctc-roots-reg-'));
  writeSession(process.pid, 'Root cli room', CLAUDE_S);
});
test.after(() => {
  rmSync(base, { recursive: true, force: true });
  rmSync(registry, { recursive: true, force: true });
});

function writeSession(pid, name, sessionId) {
  writeFileSync(join(registry, `${pid}.json`), JSON.stringify({
    pid, sessionId, name, messagingSocketPath: '\\\\.\\pipe\\LOCAL\\ctc-roots-cli-pipe',
    status: 'idle', cwd: 'C:\\nowhere', startedAt: Date.now(), updatedAt: Date.now(),
  }));
  writeFileSync(join(registry, `${pid}.abcdef.key`), JSON.stringify({
    peerToken: 'token-roots-cli', procStartFt: 134333582258617163, pidDomain: 'win32:test',
  }));
}

const paths = () => ({
  parent: join(base, 'ClaudeToCodex'),
  def: join(base, 'ClaudeToCodex', 'bridge'),
  rootB: join(base, 'ClaudeToCodex', 'bridge-threads', CODEX_B),
  indexDir: join(base, 'ClaudeToCodex', 'bridge-roots'),
});

// Child env: private LOCALAPPDATA + index, Codex identity only, and no bridge
// env - the whole point is exercising the no-CTC_BRIDGE_DIR path. Explicit
// overrides arrive via `extra` after the deletes so they truly win.
function childEnv(threadId, extra = {}) {
  const env = {
    ...process.env,
    LOCALAPPDATA: base,
    CTC_ROOTS_DIR: paths().indexDir,
    CODEX_THREAD_ID: threadId,
  };
  delete env.CTC_BRIDGE_DIR;
  delete env.CLAUDE_CODE_SESSION_ID;
  return { ...env, ...extra };
}

async function runCli(args, env) {
  try {
    const { stdout } = await execute('node', [cli, ...args], { env, windowsHide: true, timeout: 30000 });
    return { code: 0, stdout };
  } catch (error) {
    return { code: error.code ?? 1, stdout: String(error.stdout ?? ''), stderr: String(error.stderr ?? error.message) };
  }
}

function runHook(event, env) {
  const result = spawnSync('node', [cli, 'hook'], {
    input: JSON.stringify(event), env, windowsHide: true, timeout: 30000, encoding: 'utf8',
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

// The default root is pre-occupied by another Codex session, exactly like the
// live machine where the incumbent still serves %LOCALAPPDATA%\ClaudeToCodex\bridge.
test.before(async () => {
  const { def } = paths();
  mkdirSync(join(def, 'pairs'), { recursive: true });
  writeFileSync(join(def, 'pairs', 'eeeeeeee-5555-4555-8555-555555555555.json'), JSON.stringify({
    id: 'eeeeeeee-5555-4555-8555-555555555555', codexId: CODEX_A, claudeId: '99999999-9999-4999-8999-999999999999',
    endpointPath: join(def, 'endpoints', 'claude.json'), createdAt: '2026-09-01T00:00:00.000Z',
  }));
});

test('connect adopts a per-thread root when the default root serves another Codex (S05-15-1)', async () => {
  const { rootB, indexDir, def } = paths();
  const r = await runCli(['connect', '--name', 'cli room', '--sessions-dir', registry], childEnv(CODEX_B));
  assert.equal(r.code, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.pair.codexId, CODEX_B);
  assert.equal(out.bridgeRoot, rootB, 'connect must report the per-thread root it selected');
  // Pair, endpoint and events all live in the per-thread root.
  assert.ok(existsSync(join(rootB, 'pairs', `${out.pair.id}.json`)));
  assert.ok(existsSync(out.pair.endpointPath));
  const events = readFileSync(join(rootB, 'events.jsonl'), 'utf8');
  assert.match(events, /"type":"root-bound"/);
  assert.match(events, /"source":"per-thread"/);
  // The index binds this session to that root - and only this session.
  const index = readIndex(indexDir);
  assert.equal(index.threads[CODEX_B].root, rootB);
  assert.deepEqual(Object.keys(index.threads), [CODEX_B]);
  // The incumbent's default root is untouched: no new pairs, no rebind.
  assert.equal(readdirSync(join(def, 'pairs')).length, 1);
});

test('the Codex hook resolves the per-thread root by the event session_id alone (S05-15-3 core)', async () => {
  const { rootB } = paths();
  const store = new BridgeStore(rootB);
  const pair = store.pairs().find((p) => p.codexId === CODEX_B);
  const message = store.prepare(pair, 'claude', 'S05-ROOTS-CLI-BODY from the peer session', null, pair.claudeId);
  store.publish(message);
  // A wake-shaped prompt delivered to the hook with only session_id available.
  const r = runHook({
    hook_event_name: 'UserPromptSubmit', session_id: CODEX_B, turn_id: 't-roots-1',
    prompt: `[CTC-WAKE ${pair.id} ${message.id}]`,
  }, childEnv(CODEX_B));
  assert.equal(r.code, 0, r.stderr);
  const decision = JSON.parse(r.stdout);
  const body = decision.hookSpecificOutput?.additionalContext ?? '';
  assert.ok(body.includes('S05-ROOTS-CLI-BODY'), 'the hook must inject the pending body from the per-thread root');
  assert.ok(body.includes(message.id), 'the injected letter carries its id for the reply entry');
  // The claim is visible: pending released, receipt on disk.
  assert.equal(existsSync(join(rootB, 'pending', pair.id)), false);
  assert.ok(existsSync(join(rootB, 'receipts', `${message.id}.json`)));
});

test('a wake for a message living in another root gets the deterministic cross-root diagnosis (S05-15-5)', async () => {
  const { rootB } = paths();
  const store = new BridgeStore(rootB);
  const pair = store.pairs().find((p) => p.codexId === CODEX_B);
  const message = store.prepare(pair, 'claude', 'S05-ROOTS-CLI-FOREIGN', null, pair.claudeId);
  // The hook serves the DEFAULT root (session_id = its incumbent Codex A) while
  // the woken message lives in B's per-thread root: the 9-13 incident shape.
  const r = runHook({
    hook_event_name: 'UserPromptSubmit', session_id: CODEX_A, turn_id: 't-roots-2',
    prompt: `[CTC-WAKE ${pair.id} ${message.id}]`,
  }, childEnv(CODEX_A));
  assert.equal(r.code, 0, r.stderr);
  const decision = JSON.parse(r.stdout);
  const text = decision.systemMessage ?? '';
  assert.ok(text.includes(rootB), 'the diagnosis names the root the message lives in');
  assert.ok(text.includes(CODEX_B), 'the diagnosis names the Codex session that root serves');
  assert.ok(text.includes('resume'), 'the diagnosis gives a next step');
  assert.ok(!text.includes('received'), 'the diagnosis claims no receipt');
  // The data-plane fact is recorded by the hook in the root it serves.
  assert.match(readFileSync(join(paths().def, 'events.jsonl'), 'utf8'), /"type":"wake-foreign-root"/);
});

test('a wake whose message is known nowhere stays an honest unknown (hook-not-effective boundary)', () => {
  const r = runHook({
    hook_event_name: 'UserPromptSubmit', session_id: CODEX_A, turn_id: 't-roots-3',
    prompt: `[CTC-WAKE ${CODEX_A} 11111111-9999-4999-8999-999999999999]`,
  }, childEnv(CODEX_A));
  assert.equal(r.code, 0, r.stderr);
  const decision = JSON.parse(r.stdout);
  const text = decision.systemMessage ?? '';
  assert.match(text, /unknown/i, 'the notice states the unknown instead of guessing');
  assert.ok(!text.includes('detected'), 'no detection is claimed');
});

test('non-wake events still only serve the root\u2019s own Codex session (gate unchanged)', () => {
  const r = runHook({
    hook_event_name: 'PostToolUse', session_id: '77777777-7777-4777-8777-777777777777', turn_id: 't-roots-4',
  }, childEnv(CODEX_A));
  assert.equal(r.code, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), {}, 'a foreign session without a wake stays silent');
});

test('reconnecting the same session reuses the same root and pair (resume-reuse stand-in, S05-15-2)', async () => {
  const { rootB } = paths();
  const before = readdirSync(join(rootB, 'pairs'));
  const r = await runCli(['connect', '--name', 'cli room', '--sessions-dir', registry], childEnv(CODEX_B));
  assert.equal(r.code, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.bridgeRoot, rootB, 'the binding is reused, not rebound');
  assert.equal(readdirSync(join(rootB, 'pairs')).length, before.length, 'no duplicate pair appears');
  const events = readFileSync(join(rootB, 'events.jsonl'), 'utf8');
  assert.equal((events.match(/"type":"root-bound"/g) ?? []).length, 1, 'an unchanged binding is not re-announced');
});

test('an explicit CTC_BRIDGE_DIR connect never touches the index (isolation stays isolated)', async () => {
  const isolated = mkdtempSync(join(tmpdir(), 'ctc-roots-env-'));
  const isolatedIndex = join(isolated, 'bridge-roots');
  try {
    const r = await runCli(
      ['connect', '--name', 'cli room', '--sessions-dir', registry],
      childEnv(CODEX_B, { CTC_BRIDGE_DIR: isolated, CTC_ROOTS_DIR: isolatedIndex }),
    );
    assert.equal(r.code, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).bridgeRoot, isolated);
    assert.ok(!existsSync(isolatedIndex), 'an env-overridden connect must not write any index');
    assert.doesNotMatch(readFileSync(join(isolated, 'events.jsonl'), 'utf8'), /root-bound/);
  } finally {
    rmSync(isolated, { recursive: true, force: true });
  }
});

test('status names its root and gives the honest unclaimed-pending note (S05-15-4/5)', async () => {
  const { rootB } = paths();
  const store = new BridgeStore(rootB);
  const pair = store.pairs().find((p) => p.codexId === CODEX_B);
  const message = store.prepare(pair, 'claude', 'S05-ROOTS-CLI-STATUS-PENDING', null, pair.claudeId);
  store.publish(message);
  const r = await runCli(['status'], childEnv(CODEX_B));
  assert.equal(r.code, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.root.path, rootB);
  assert.equal(out.root.source, 'index');
  assert.equal(out.root.codexThread, CODEX_B);
  const row = out.pairs.find((p) => p.pairId === pair.id);
  assert.equal(row.pendingMessageId, message.id);
  assert.equal(row.pendingClaimed, false);
  assert.match(row.pendingNote, /possible causes - not detected from here/);
  assert.match(row.pendingNote, /\/hooks/);
  assert.match(row.pendingNote, /resume/);
  assert.ok(!row.pendingNote.includes('received'), 'the note claims no receipt');
});
