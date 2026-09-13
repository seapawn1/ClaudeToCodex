import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { atomicWriteJson, readJson } from './store.mjs';

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

// CTC_ROOTS_FILE overrides the index location for tests and isolated runs.
export const indexPath = (env = process.env) => env.CTC_ROOTS_FILE ?? join(rootsParent(env), 'bridge-roots.json');

export function readIndex(path = indexPath()) {
  if (!existsSync(path)) return { schema: 1, threads: {} };
  const raw = readJson(path);
  if (raw?.schema !== 1 || typeof raw.threads !== 'object' || raw.threads === null || Array.isArray(raw.threads)) {
    throw new Error(`Bridge root index at ${path} has an unrecognized shape. Repair it, or set CTC_BRIDGE_DIR to bypass index resolution.`);
  }
  return raw;
}

// Records which root a Codex session uses. Idempotent for the same root;
// a different root for an already-bound session is refused outright because
// rebinding would strand the old root's pairs, pending letters and evidence.
export function bindThreadRoot(threadId, root, path = indexPath()) {
  const tid = String(threadId ?? '').toLowerCase();
  if (!UUID.test(tid)) throw new Error('A bridge root binds to an exact Codex session UUID.');
  const target = resolve(root);
  const index = readIndex(path);
  const existing = index.threads[tid];
  if (existing) {
    if (resolve(existing.root) !== target) {
      throw new Error(`Codex session ${tid} is already bound to bridge root ${existing.root}; rebinding is refused. One root serves one Codex session, and old evidence stays where it is.`);
    }
    return { root: target, index: path, changed: false };
  }
  const updated = { schema: 1, threads: { ...index.threads, [tid]: { root: target, since: new Date().toISOString() } } };
  mkdirSync(dirname(path), { recursive: true });
  atomicWriteJson(path, updated);
  return { root: target, index: path, changed: true };
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
    try { idx = readIndex(indexPath(env)); } catch { idx = { schema: 1, threads: {} }; }
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
