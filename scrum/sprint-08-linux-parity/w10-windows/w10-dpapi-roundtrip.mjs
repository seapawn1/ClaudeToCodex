// Sprint 08 / W10: Windows DPAPI end-to-end regression. Runs with WINDOWS
// node from the D-drive frozen worktree. Exercises the full Windows token
// path on the installed-candidate code: register (CLI child with synthetic
// Claude env, DPAPI wrap via inline powershell) -> endpoint tokenProtected
// -> sendClaudeMessage with the DEFAULT tokenLoader (DPAPI unwrap) -> pipe
// server receives the auth line carrying the ORIGINAL token.
// Usage: node.exe w10-dpapi-roundtrip.mjs <cliAbsPath> <evidenceAbsPath>
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

const [cliPath, evidencePath] = process.argv.slice(2);
if (process.platform !== 'win32') throw new Error('Windows-only regression');
const claudeId = '99999999-9999-4999-8999-999999999999';
const codexId = '88888888-8888-4888-8888-888888888888';
const token = randomUUID().replaceAll('-', '');
const pipePath = `\\\\.\\pipe\\ctc-w10-dpapi-${randomUUID().slice(0, 8)}`;
const root = join(tmpdir(), 'ctc-w10-dpapi');

const frames = [];
const server = createServer((socket) => {
  let buffered = '';
  socket.setEncoding('utf8').on('data', (data) => {
    buffered += data;
    let end;
    while ((end = buffered.indexOf('\n')) !== -1) {
      frames.push(JSON.parse(buffered.slice(0, end)));
      buffered = buffered.slice(end + 1);
    }
    if (frames.length === 2) socket.end();
  });
});
await new Promise((resolve) => server.listen(pipePath, resolve));

// register through the real CLI in a child with the synthetic Claude env
const registered = spawnSync(process.execPath, [cliPath, 'register'], {
  env: { ...process.env, CTC_BRIDGE_DIR: root, CLAUDE_CODE_SESSION_ID: claudeId, CLAUDE_CODE_MESSAGING_SOCKET: pipePath, CLAUDE_CODE_MESSAGING_TOKEN: token },
  encoding: 'utf8', timeout: 30000,
});
const endpointPath = join(root, 'endpoints', `claude-${claudeId}.json`);
const endpoint = JSON.parse(readFileSync(endpointPath, 'utf8'));

const messageId = randomUUID();
const bodyPath = join(root, 'body.txt');
writeFileSync(bodyPath, 'W10 DPAPI round-trip body.');
const recordPath = join(root, 'wire', `${messageId}.send.json`);

const { sendClaudeMessage } = await import(new URL('./../../../bridge/delivery/transport.mjs', import.meta.url).href);
const result = { platform: process.platform, node: process.version, registered: registered.status, endpointHasBlob: Boolean(endpoint.tokenProtected), blobInFileLeak: readFileSync(endpointPath, 'utf8').includes(token) };
try {
  await sendClaudeMessage({ endpointPath, replyThreadId: codexId, messageFile: bodyPath, messageId, recordPath });
  result.sent = true;
} catch (error) {
  result.sent = false;
  result.error = String(error.message);
}
result.frames = frames.map((f) => ({ type: f.type, tokenMatches: f.token === token }));
result.tokenLeakInRecord = readFileSync(recordPath, 'utf8').includes(token);
result.ok = registered.status === 0 && result.endpointHasBlob && !result.blobInFileLeak && result.sent
  && frames.length === 2 && frames[0].token === token && frames[1].msg_id === messageId && !result.tokenLeakInRecord;
writeFileSync(evidencePath, JSON.stringify(result, null, 2));
console.log(result.ok ? 'W10_DPAPI_ROUNDTRIP=OK' : `W10_DPAPI_ROUNDTRIP=FAILED ${JSON.stringify(result)}`);
server.close();
process.exit(result.ok ? 0 : 1);
