import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { bindThreadRoot, indexPath, knownRoots, locateMessage, otherRootsServing, readIndex, resolveRoot, rootOwner } from '../roots.mjs';

// Sprint 05 / PBI-15: the session-root index and resolution policy. All cases
// run against explicit temp paths and a fake env object - no process.env or
// machine LOCALAPPDATA is touched, and no case relies on a real root.

const CODEX_A = 'aaaaaaaa-1111-4111-8111-111111111111';
const CODEX_B = 'bbbbbbbb-2222-4222-8222-222222222222';
const CLAUDE_X = 'cccccccc-3333-4333-8333-333333333333';
const MSG_ID = 'dddddddd-4444-4444-8444-444444444444';

function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'ctc-roots-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  return {
    base,
    parent: join(base, 'ClaudeToCodex'),
    def: join(base, 'ClaudeToCodex', 'bridge'),
    threads: join(base, 'ClaudeToCodex', 'bridge-threads'),
    indexFile: join(base, 'ClaudeToCodex', 'bridge-roots.json'),
  };
}

// A pair record pinned to a root so rootOwner sees the root as occupied.
function seedPair(root, codexId, pairId = 'eeeeeeee-5555-4555-8555-555555555555', dir = 'pairs') {
  mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, dir, `${pairId}.json`), JSON.stringify({
    id: pairId, codexId, claudeId: CLAUDE_X, endpointPath: join(root, 'endpoints', 'claude.json'), createdAt: '2026-09-01T00:00:00.000Z',
  }));
}

const noEnv = {};

test('explicit CTC_BRIDGE_DIR wins over index and everything else', () => {
  const f = fixture(test);
  const index = { schema: 1, threads: { [CODEX_A]: { root: f.def, since: '2026-09-01T00:00:00.000Z' } } };
  const resolved = resolveRoot({
    threadId: CODEX_A, env: { CTC_BRIDGE_DIR: 'C:\\explicit\\root' },
    index, defaultRootPath: f.def, threadsParent: f.parent,
  });
  assert.equal(resolved.source, 'env');
  assert.equal(resolved.root, 'C:\\explicit\\root');
});

test('an index binding is reused before anything else is considered', () => {
  const f = fixture(test);
  const bound = join(f.threads, CODEX_B);
  const index = { schema: 1, threads: { [CODEX_B]: { root: bound, since: '2026-09-01T00:00:00.000Z' } } };
  // Even with the default root occupied by another Codex, the binding wins.
  seedPair(f.def, CODEX_A);
  const resolved = resolveRoot({ threadId: CODEX_B, env: noEnv, index, defaultRootPath: f.def, threadsParent: f.parent });
  assert.equal(resolved.source, 'index');
  assert.equal(resolved.root, bound);
});

test('without a Codex thread the default root is served (manual paths keep 1.0.0 semantics)', () => {
  const f = fixture(test);
  const resolved = resolveRoot({ threadId: null, env: noEnv, index: { schema: 1, threads: {} }, defaultRootPath: f.def, threadsParent: f.parent });
  assert.equal(resolved.source, 'default');
  assert.equal(resolved.root, f.def);
  // A malformed thread id is treated as no thread, not as a per-thread key.
  assert.equal(resolveRoot({ threadId: 'not-a-uuid', env: noEnv, index: { schema: 1, threads: {} }, defaultRootPath: f.def }).root, f.def);
});

test('a free default root is adopted by the first Codex session', () => {
  const f = fixture(test);
  const resolved = resolveRoot({ threadId: CODEX_A, env: noEnv, index: { schema: 1, threads: {} }, defaultRootPath: f.def, threadsParent: f.parent });
  assert.equal(resolved.source, 'default');
  assert.equal(resolved.root, f.def);
});

test('a default root already owned by the same session is reused (incumbent adoption, no data movement)', () => {
  const f = fixture(test);
  seedPair(f.def, CODEX_A);
  const resolved = resolveRoot({ threadId: CODEX_A, env: noEnv, index: { schema: 1, threads: {} }, defaultRootPath: f.def, threadsParent: f.parent });
  assert.equal(resolved.source, 'default');
  assert.equal(resolved.root, f.def);
});

test('a default root owned by another Codex steers the session to a fresh per-thread root', () => {
  const f = fixture(test);
  seedPair(f.def, CODEX_A);
  const resolved = resolveRoot({ threadId: CODEX_B, env: noEnv, index: { schema: 1, threads: {} }, defaultRootPath: f.def, threadsParent: f.parent });
  assert.equal(resolved.source, 'per-thread');
  assert.equal(resolved.root, join(f.threads, CODEX_B));
  assert.ok(!existsSync(resolved.root), 'resolution is a pure read - the per-thread root is not created here');
});

test('archived pairs still occupy the default root (no rebinding around retired evidence)', () => {
  const f = fixture(test);
  seedPair(f.def, CODEX_A, 'eeeeeeee-5555-4555-8555-555555555555', 'pairs-retired');
  const resolved = resolveRoot({ threadId: CODEX_B, env: noEnv, index: { schema: 1, threads: {} }, defaultRootPath: f.def, threadsParent: f.parent });
  assert.equal(resolved.source, 'per-thread');
  assert.equal(resolved.root, join(f.threads, CODEX_B));
});

test('rootOwner reads the codexId from legacy pair.json, pairs/ and pairs-retired/', () => {
  const f = fixture(test);
  assert.equal(rootOwner(f.def), null, 'an absent root owns nobody');
  seedPair(f.def, CODEX_A);
  assert.equal(rootOwner(f.def), CODEX_A);
});

test('bindThreadRoot registers a session and is idempotent for the same root', () => {
  const f = fixture(test);
  const first = bindThreadRoot(CODEX_B, join(f.threads, CODEX_B), f.indexFile);
  assert.equal(first.changed, true);
  const again = bindThreadRoot(CODEX_B, join(f.threads, CODEX_B), f.indexFile);
  assert.equal(again.changed, false);
  const index = readIndex(f.indexFile);
  assert.equal(index.threads[CODEX_B].root, join(f.threads, CODEX_B));
  assert.ok(index.threads[CODEX_B].since, 'the binding records when it was made');
  // A second session can bind its own root in the same index.
  bindThreadRoot(CODEX_A, f.def, f.indexFile);
  assert.equal(Object.keys(readIndex(f.indexFile).threads).length, 2);
});

test('bindThreadRoot refuses to rebind a session to a different root', () => {
  const f = fixture(test);
  bindThreadRoot(CODEX_B, join(f.threads, CODEX_B), f.indexFile);
  assert.throws(() => bindThreadRoot(CODEX_B, f.def, f.indexFile), /rebinding is refused/);
  // The refusal left the original binding untouched.
  assert.equal(readIndex(f.indexFile).threads[CODEX_B].root, join(f.threads, CODEX_B));
});

test('bindThreadRoot rejects non-UUID session ids', () => {
  const f = fixture(test);
  assert.throws(() => bindThreadRoot('01a09805', f.def, f.indexFile), /exact Codex session UUID/);
  assert.ok(!existsSync(f.indexFile), 'a rejected bind writes nothing');
});

test('readIndex returns an empty index for a missing file and rejects a malformed one', () => {
  const f = fixture(test);
  assert.deepEqual(readIndex(f.indexFile), { schema: 1, threads: {} });
  mkdirSync(f.parent, { recursive: true });
  writeFileSync(f.indexFile, '{}');
  assert.throws(() => readIndex(f.indexFile), /unrecognized shape/);
});

test('knownRoots lists the default root plus indexed roots, de-duplicated', () => {
  const f = fixture(test);
  const index = { schema: 1, threads: {
    [CODEX_A]: { root: f.def, since: '2026-09-01T00:00:00.000Z' },
    [CODEX_B]: { root: join(f.threads, CODEX_B), since: '2026-09-01T00:00:00.000Z' },
  } };
  const roots = knownRoots({ env: noEnv, index, defaultRootPath: f.def });
  assert.deepEqual(roots, [f.def, join(f.threads, CODEX_B)]);
});

test('locateMessage finds a message in another indexed root and reports the root owner', () => {
  const f = fixture(test);
  const rootB = join(f.threads, CODEX_B);
  seedPair(rootB, CODEX_B);
  mkdirSync(join(rootB, 'messages'), { recursive: true });
  writeFileSync(join(rootB, 'messages', `${MSG_ID}.json`), JSON.stringify({ id: MSG_ID, pairId: 'eeeeeeee-5555-4555-8555-555555555555' }));
  const index = { schema: 1, threads: { [CODEX_B]: { root: rootB, since: '2026-09-01T00:00:00.000Z' } } };
  const found = locateMessage(MSG_ID, f.def, { env: noEnv, index, defaultRootPath: f.def });
  assert.equal(found.root, rootB);
  assert.equal(found.owner, CODEX_B);
  assert.equal(found.message.id, MSG_ID);
  // The served root itself is excluded even if it were indexed.
  assert.equal(locateMessage(MSG_ID, rootB, { env: noEnv, index, defaultRootPath: f.def }), null, 'the except root is skipped');
  // Unknown message id reports nothing rather than guessing.
  assert.equal(locateMessage('11111111-9999-4999-8999-999999999999', f.def, { env: noEnv, index, defaultRootPath: f.def }), null);
});

test('locateMessage searches the default root even when it is not indexed', () => {
  const f = fixture(test);
  seedPair(f.def, CODEX_A);
  mkdirSync(join(f.def, 'messages'), { recursive: true });
  writeFileSync(join(f.def, 'messages', `${MSG_ID}.json`), JSON.stringify({ id: MSG_ID }));
  const found = locateMessage(MSG_ID, join(f.threads, CODEX_B), { env: noEnv, index: { schema: 1, threads: {} }, defaultRootPath: f.def });
  assert.equal(found.root, f.def);
  assert.equal(found.owner, CODEX_A);
});

test('indexPath derives from the parent unless CTC_ROOTS_FILE overrides it', () => {
  assert.equal(indexPath({ CTC_ROOTS_FILE: 'C:\\elsewhere\\bridge-roots.json' }), 'C:\\elsewhere\\bridge-roots.json');
  const derived = indexPath({ LOCALAPPDATA: 'C:\\Users\\t' });
  assert.equal(derived, join('C:\\Users\\t', 'ClaudeToCodex', 'bridge-roots.json'));
});

test('otherRootsServing reports roots serving the same Codex, excluding the caller\u2019s', () => {
  const f = fixture(test);
  const rootB = join(f.threads, CODEX_B);
  const rootB2 = join(f.threads, CODEX_B + '-2');
  seedPair(rootB, CODEX_B);
  seedPair(rootB2, CODEX_B, 'eeeeeeee-6666-4666-8666-666666666666');
  seedPair(f.def, CODEX_A);
  const index = { schema: 1, threads: {
    [CODEX_B]: { root: rootB, since: '2026-09-01T00:00:00.000Z' },
    [CODEX_A]: { root: rootB2, since: '2026-09-01T00:00:00.000Z' }, // indexed but serves B
  } };
  const opts = { env: noEnv, index, defaultRootPath: f.def };
  const others = otherRootsServing(CODEX_B, rootB2, opts);
  assert.deepEqual(others, [rootB], 'the root serving B, other than the excluded one');
  assert.deepEqual(otherRootsServing(CODEX_A, f.def, opts), [], 'the only root serving A is the excluded default');
});

// The durable evidence rule in miniature: a binding written by bindThreadRoot
// is on disk as complete JSON (temp+rename), never a truncated write.
test('a written index file is complete JSON on disk', () => {
  const f = fixture(test);
  bindThreadRoot(CODEX_A, f.def, f.indexFile);
  const raw = readFileSync(f.indexFile, 'utf8');
  assert.doesNotThrow(() => JSON.parse(raw));
});
