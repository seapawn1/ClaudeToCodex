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
  if (!session.socket?.startsWith('\\\\.\\pipe\\')) throw new Error('The matched session has no native Windows named pipe.');
  return session;
}
