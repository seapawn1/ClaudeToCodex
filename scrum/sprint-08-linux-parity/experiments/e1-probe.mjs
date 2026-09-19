// Sprint 08 pre-study E1: Claude UDS frame acceptance probe.
// Throwaway experiment script (built to learn, not product code).
// Usage: node e1-probe.mjs <sessionNameSubstring|session:<uuid>> <auth|noauth> <marker>
//
// Reads the target session's registry record (~/.claude/sessions/<pid>.json) and
// its peer key file, connects to the target's inbox Unix domain socket, and sends
// the Windows-verified frame set: optional auth line + one msgV user frame with
// priority=next. Prints one JSON status line; never prints the token value.
// Targeting by "session:<uuid>" is exact and immune to the observed auto-rename
// name collisions (a passive sibling session can pick up a content-derived name
// containing the probe needle).
import { readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { randomUUID } from 'node:crypto';

const [needle, variant, marker] = process.argv.slice(2);
if (!needle || !variant || !marker || !['auth', 'noauth'].includes(variant)) {
  console.error('Usage: node e1-probe.mjs <sessionNameSubstring|session:<uuid>> <auth|noauth> <marker>');
  process.exit(8);
}

const dir = join(homedir(), '.claude', 'sessions');
const records = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    try { return { pid: Number.parseInt(f, 10), ...JSON.parse(readFileSync(join(dir, f), 'utf8')) }; }
    catch { return null; }
  })
  .filter(Boolean)
  .filter((r) => (needle.startsWith('session:')
    ? r.sessionId === needle.slice('session:'.length)
    : String(r.name ?? '').includes(needle)));
if (records.length !== 1) { console.log(`PROBE_ABORT distinct_target=${records.length}`); process.exit(9); }
const target = records[0];
if (!target.messagingSocketPath) { console.log('PROBE_ABORT no_socket_path'); process.exit(9); }
try { process.kill(target.pid, 0); } catch { console.log('PROBE_ABORT target_dead'); process.exit(9); }

const keyFile = readdirSync(dir).find((f) => f.startsWith(`${target.pid}.`) && f.endsWith('.key'));
let token = null;
if (keyFile) {
  try { token = JSON.parse(readFileSync(join(dir, keyFile), 'utf8')).peerToken ?? null; } catch { token = null; }
}
if (variant === 'auth' && !token) { console.log('PROBE_ABORT no_peer_token'); process.exit(9); }

const msgId = randomUUID();
// Frame shape mirrors Send-ClaudePipe.ps1 exactly: msgV=1, type=user, priority=next, session_id.
const frame = {
  msgV: 1,
  msg_id: msgId,
  type: 'user',
  message: { role: 'user', content: `[${marker}] Sprint08 E1 实验探测消息（${variant} 变体）。这是预研探测，内容本身无需处理。` },
  priority: 'next',
  session_id: target.sessionId,
};
const socketPath = target.messagingSocketPath.replace(/^uds:/, '');
let closedBy = 'n/a';
let err = null;
const finish = (code) => {
  console.log(JSON.stringify({ marker, variant, msgId, socketPath, targetSession: target.sessionId, closedBy, err }));
  process.exit(code);
};

const sock = net.createConnection({ path: socketPath });
sock.setTimeout(8000, () => { err = 'timeout'; sock.destroy(); finish(3); });
sock.on('error', (e) => { err = e.message; finish(2); });
sock.on('close', (hadError) => {
  if (closedBy === 'n/a') { closedBy = hadError ? 'server-error' : 'server'; finish(hadError ? 4 : 0); }
});
sock.on('connect', () => {
  // Windows product behavior: auth line first, brief pause, then the message frame.
  if (variant === 'auth') sock.write(`${JSON.stringify({ type: 'auth', token })}\n`);
  setTimeout(() => {
    sock.write(`${JSON.stringify(frame)}\n`);
    setTimeout(() => { closedBy = 'client'; sock.end(() => finish(0)); }, 800);
  }, 500);
});
