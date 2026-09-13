import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readJson } from './store.mjs';

// Sprint 05 / PBI-15: per-Codex-session bridge roots. The 1.0.0 product had a
// single default root resolved purely from the environment, so a Codex host
// started without CTC_BRIDGE_DIR (the everyday case) had its hooks read the
// default root even when the session's pairs and pending letters lived in an
// isolated root: publish succeeded, the wake arrived, nothing was ever claimed.
// This module gives every Codex original session a discoverable root through a
// user-level index (codexThreadId -> root), resolved identically by the CLI
// (connect / send / reply / status / retire) and by the Codex hooks (from the
// event's session_id). Explicit CTC_BRIDGE_DIR still wins everywhere: it stays
// the test and isolation override and the root carried by Claude reply entries.
// A binding is append-only - one root per Codex session, never rebound, never
// migrated (the identity boundary the multi-pair registry already enforces).

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// Mirrors store.defaultRoot()'s location rule but honors an explicit env so
// resolution is testable without mutating process.env.
const defaultRootOf = (env) => {
  const base = env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local');
  return join(base, 'ClaudeToCodex', 'bridge');
};

export const rootsParent = (env = process.env) => {
  const base = env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local');
  return join(base, 'ClaudeToCodex');
};

// The index is one small JSON file per Codex session under bridge-roots\ - the
// same exclusive-create-per-identity pattern as the pairs registry. Distinct
// sessions bind distinct files, so two concurrent first connects can never
// lose each other's binding; a single read-modify-write index file had exactly
// that lost-update race (SM review S05-SM-REVIEW-06). The same session racing
// itself settles idempotently or refuses a rebind - never overwrites.
// CTC_ROOTS_DIR overrides the index directory for tests and isolated runs.
export const indexDir = (env = process.env) => env.CTC_ROOTS_DIR ?? join(rootsParent(env), 'bridge-roots');

const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function readIndex(dir = indexDir()) {
  const threads = {};
  if (!existsSync(dir)) return { schema: 1, threads };
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.json')) continue;
    try {
      const entry = readJson(join(dir, file));
      if (typeof entry?.root === 'string') threads[file.slice(0, -'.json'.length).toLowerCase()] = entry;
    } catch { /* an unreadable binding is skipped; bind reports it when it matters */ }
  }
  return { schema: 1, threads };
}

// Records which root a Codex session uses, as bridge-roots\<threadId>.json.
// Idempotent for the same root; a different root for an already-bound session
// is refused outright because rebinding would strand the old root's pairs,
// pending letters and evidence. Creation is exclusive (wx): concurrent binds
// of the same session resolve against the winner; concurrent binds of
// different sessions touch different files and cannot interfere.
export function bindThreadRoot(threadId, root, dir = indexDir()) {
  const tid = String(threadId ?? '').toLowerCase();
  if (!UUID.test(tid)) throw new Error('A bridge root binds to an exact Codex session UUID.');
  const target = resolve(root);
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${tid}.json`);
  const unreadable = () => new Error(`Bridge root index entry ${path} is unreadable. Repair or consciously remove it; an unreadable binding is never overwritten automatically.`);
  const settle = (entry) => {
    if (typeof entry?.root !== 'string') throw unreadable();
    if (resolve(entry.root) !== target) {
      throw new Error(`Codex session ${tid} is already bound to bridge root ${entry.root}; rebinding is refused. One root serves one Codex session, and old evidence stays where it is.`);
    }
    return { root: target, index: path, changed: false };
  };
  const readEntry = () => {
    try { return readJson(path); } catch (error) { if (error.code === 'ENOENT') return null; return undefined; }
  };
  let existing = readEntry();
  if (existing === undefined) throw unreadable();
  if (existing !== null) return settle(existing);
  try {
    writeFileSync(path, `${JSON.stringify({ root: target, since: new Date().toISOString() }, null, 2)}\n`, { flag: 'wx' });
    return { root: target, index: path, changed: true };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  // Lost the exclusive create to a concurrent bind of the same session: the
  // winner's write lands within microseconds; retry the read briefly before
  // calling the entry unreadable.
  for (let attempt = 0; ; attempt++) {
    existing = readEntry();
    if (existing !== null && existing !== undefined) break;
    if (attempt >= 50) throw unreadable();
    sleepMs(2);
  }
  return settle(existing);
}

// Which Codex session a root currently serves: the codexId of its first pair
// record, active (legacy pair.json, pairs/) or archived (pairs-retired/). All
// pairs in one root share one codexId by contract; null means the root binds
// nobody yet. Archive records count as occupancy - pair() refuses to rebind a
// root that still holds another Codex's retired pairs, so selection must steer
// around them too rather than pick a root the registry would then reject.
export function rootOwner(root) {
  const candidates = [join(root, 'pair.json')];
  for (const dir of [join(root, 'pairs'), join(root, 'pairs-retired')]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).sort()) {
      if (file.endsWith('.json')) candidates.push(join(dir, file));
    }
  }
  for (const candidate of candidates) {
    try {
      const pair = readJson(candidate);
      if (typeof pair?.codexId === 'string' && UUID.test(pair.codexId)) return pair.codexId.toLowerCase();
    } catch { /* unreadable candidate: the next record decides */ }
  }
  return null;
}

// Pure read - never creates a root and never writes the index; only connect
// binds. Resolution order: explicit CTC_BRIDGE_DIR > index binding for this
// Codex session > the default root when it serves nobody or already serves
// this session (the incumbent-adoption case: no data moves) > a fresh
// per-thread root under bridge-threads\<threadId>.
export function resolveRoot({
  threadId = null, env = process.env,
  index = null, defaultRootPath = null, threadsParent = null,
} = {}) {
  if (env.CTC_BRIDGE_DIR) return { root: resolve(env.CTC_BRIDGE_DIR), source: 'env', indexUsed: false };
  const idx = index ?? readIndex();
  const tid = typeof threadId === 'string' && UUID.test(threadId) ? threadId.toLowerCase() : null;
  if (tid && idx.threads[tid]) return { root: resolve(idx.threads[tid].root), source: 'index', indexUsed: true };
  const def = resolve(defaultRootPath ?? defaultRootOf(env));
  if (!tid) return { root: def, source: 'default', indexUsed: index !== null };
  const owner = rootOwner(def);
  if (owner === null || owner === tid) return { root: def, source: 'default', indexUsed: index !== null };
  return { root: join(resolve(threadsParent ?? rootsParent(env)), 'bridge-threads', tid), source: 'per-thread', indexUsed: index !== null };
}

// Every root this machine could be serving: the default root plus all indexed
// roots, de-duplicated. A malformed index degrades to the default root alone -
// diagnostics limp along honestly instead of failing the hook outright.
export function knownRoots({ env = process.env, index = null, defaultRootPath = null } = {}) {
  const def = resolve(defaultRootPath ?? defaultRootOf(env));
  const out = [def];
  let idx = index;
  if (idx === null) {
    try { idx = readIndex(indexDir(env)); } catch { idx = { schema: 1, threads: {} }; }
  }
  for (const entry of Object.values(idx.threads)) {
    if (entry?.root) {
      const root = resolve(entry.root);
      if (!out.includes(root)) out.push(root);
    }
  }
  return out;
}

// Data-plane fact finding for wake diagnostics (S05-15-5): where does this
// message actually live, if anywhere, excluding the root the caller serves?
// Returns { root, message, owner } or null; unreadable candidates are skipped
// so diagnosis only ever reports clean facts.
export function locateMessage(messageId, exceptRoot, { env = process.env, index = null, defaultRootPath = null } = {}) {
  const mid = String(messageId ?? '').toLowerCase();
  if (!UUID.test(mid)) return null;
  const skip = exceptRoot ? resolve(exceptRoot) : null;
  for (const root of knownRoots({ env, index, defaultRootPath })) {
    if (root === skip) continue;
    let message;
    try {
      message = readJson(join(root, 'messages', `${mid}.json`));
    } catch { continue; }
    return { root, message, owner: rootOwner(root) };
  }
  return null;
}

// Other known roots that also serve this Codex session - a data-plane fact
// worth surfacing next to an unclaimed pending letter (the session may be
// live under a different root than the one holding the letter).
export function otherRootsServing(codexId, exceptRoot, { env = process.env, index = null, defaultRootPath = null } = {}) {
  const tid = String(codexId ?? '').toLowerCase();
  if (!UUID.test(tid)) return [];
  const skip = exceptRoot ? resolve(exceptRoot) : null;
  return knownRoots({ env, index, defaultRootPath })
    .filter((root) => root !== skip && rootOwner(root) === tid);
}
