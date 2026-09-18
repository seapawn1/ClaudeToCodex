import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Discovery of running Claude Code sessions from the per-user session registry
// (~/.claude/sessions/<pid>.json plus a matching <pid>.<hash>.key peer-key file).
// CTC_SESSIONS_DIR overrides the registry location for tests.
export const sessionsDir = () => process.env.CTC_SESSIONS_DIR ?? join(homedir(), '.claude', 'sessions');

const alive = (pid) => {
  if (!Number.isInteger(pid)) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
};

// Returns [{ pid, sessionId, name, socket, status, cwd, kind, startedAt, updatedAt, alive, hasKey }]
export function listSessions(dir = sessionsDir()) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    let entry;
    try { entry = JSON.parse(readFileSync(join(dir, file), 'utf8')); } catch { continue; }
    const pid = Number.parseInt(file, 10);
    if (!entry?.sessionId || !entry?.messagingSocketPath) continue; // stale or foreign record
    const keyFile = readdirSync(dir).find((f) => f.startsWith(`${pid}.`) && f.endsWith('.key'));
    out.push({
      pid,
      sessionId: entry.sessionId,
      name: entry.name ?? null,
      socket: entry.messagingSocketPath,
      status: entry.status ?? null,
      cwd: entry.cwd ?? null,
      kind: entry.kind ?? null,
      startedAt: entry.startedAt ?? null,
      updatedAt: entry.updatedAt ?? null,
      alive: alive(pid),
      hasKey: Boolean(keyFile),
    });
  }
  return out.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

// Resolves a user-supplied name to exactly one connectable session.
// Throws with actionable messages for the three failure shapes (not found,
// ambiguous, not connectable); never guesses.
export function selectSession(name, dir = sessionsDir()) {
  const sessions = listSessions(dir);
  if (sessions.length === 0) throw new Error('No Claude Code session records found in the registry.');
  const needle = String(name).trim().toLowerCase();
  const matches = sessions.filter((s) => s.name && s.name.toLowerCase().includes(needle));
  if (matches.length === 0) {
    const known = sessions.map((s) => `${s.name ?? '(unnamed)'} [${s.status ?? '?'}${s.alive ? '' : ', dead'}]`).join('; ');
    throw new Error(`No running Claude session name matches "${name}". Known: ${known}`);
  }
  if (matches.length > 1) {
    const candidates = matches.map((s) => `- ${s.name} (sessionId=${s.sessionId}, pid=${s.pid}, ${s.alive ? 'alive' : 'dead'})`).join('\n');
    throw new Error(`Name "${name}" matches ${matches.length} Claude sessions; ask the user to pick one and pass a longer, unique part of the name:\n${candidates}`);
  }
  const [session] = matches;
  if (!session.alive) throw new Error(`The matched Claude session is no longer running (pid ${session.pid}); its registry record is stale.`);
  if (!session.hasKey) throw new Error(`The matched Claude session has no peer key on record; it cannot be contacted directly.`);
  // Sprint 08 / D-F: the endpoint shape is platform-native - a named pipe on
  // Windows, an absolute Unix domain socket path elsewhere.
  if (process.platform === 'win32') {
    if (!session.socket?.startsWith('\\\\.\\pipe\\')) throw new Error('The matched session has no native Windows named pipe.');
  } else if (!session.socket?.startsWith('/')) {
    throw new Error('The matched session has no Unix domain socket endpoint.');
  }
  return session;
}

// Sprint 08 / D-B: send-time peer token for a session, resolved by sessionId
// reverse-lookup over the live registry - never by pid or socket path, which
// are racy identities (a reused pid owns a different session's record). Linux
// keeps zero secret at rest in the bridge root: the key is read here, at
// delivery time, and never persisted. Errors are explicit and never echo key
// material or file contents.
export function peerTokenForSession(sessionId, dir = sessionsDir()) {
  const needle = String(sessionId ?? '').toLowerCase();
  let sawDead = false;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const pid = Number.parseInt(file, 10);
    if (!Number.isInteger(pid)) continue;
    let entry;
    try { entry = JSON.parse(readFileSync(join(dir, file), 'utf8')); } catch { continue; }
    if (String(entry?.sessionId ?? '').toLowerCase() !== needle) continue;
    if (!alive(pid)) { sawDead = true; continue; }
    const keyFile = readdirSync(dir).find((f) => f.startsWith(`${pid}.`) && f.endsWith('.key'));
    if (!keyFile) throw new Error(`The registry record for session ${needle} has no peer key file; it cannot be contacted directly.`);
    let keyRecord;
    try {
      keyRecord = JSON.parse(readFileSync(join(dir, keyFile), 'utf8'));
    } catch {
      throw new Error(`The peer key file for session ${needle} is not valid registry JSON (possibly mid-write); retrying may succeed once the writer finishes.`);
    }
    const token = typeof keyRecord?.peerToken === 'string' ? keyRecord.peerToken.trim() : '';
    if (!token) throw new Error(`The peer key record for session ${needle} has no peerToken field.`);
    return token;
  }
  if (sawDead) throw new Error(`Every registry record for session ${needle} belongs to a process that is no longer running; the session likely restarted - reconnect to refresh the endpoint.`);
  throw new Error(`No Claude session record in the registry matches session ${needle}; the session likely exited.`);
}
