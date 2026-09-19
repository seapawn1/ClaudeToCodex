// Sprint 08 / W1 hard exit criterion: Windows named-pipe CLIENT probe.
// Runs with Windows-side node and imports the REAL worktree transport module
// (no copy, no drift) through the \\wsl.localhost UNC cwd mapping. Exercises
// the full D-A delivery path against the fixture server: endpoint validation,
// auth line -> 500ms gap -> msgV frame, write callback + end/close completion,
// and the wire/<id>.send.json double-write contract.
// Usage: node.exe w1-probe-client.mjs <pipeName> <evidencePath>
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sendClaudeMessage } from '../../../bridge/delivery/transport.mjs';

const [pipeName, evidencePath] = process.argv.slice(2);
const claudeId = '33333333-3333-4333-8333-333333333333';
const codexId = '44444444-4444-4444-8444-444444444444';
// Fixture value, not a secret; the tokenLoader seam stands in for the DPAPI
// unwrap this probe intentionally does not exercise.
const fixtureToken = 'w1-probe-fixture-token-not-a-secret';
const text = 'W1 Windows pipe probe: auth + frame roundtrip. 你好.';

const work = join(tmpdir(), 'ctc-w1-probe');
mkdirSync(work, { recursive: true });
const endpointPath = join(work, 'endpoint.json');
writeFileSync(endpointPath, JSON.stringify({
  schema: 1, sessionId: claudeId, socket: `\\\\.\\pipe\\${pipeName}`,
  tokenProtected: 'w1-probe-placeholder', registeredAt: new Date().toISOString(), cwd: 'w1-probe',
}));
const messageFile = join(work, 'message.txt');
writeFileSync(messageFile, text);
const messageId = randomUUID();
const recordPath = join(work, `${messageId}.send.json`);

try {
  await sendClaudeMessage({
    endpointPath, replyThreadId: codexId, messageFile, messageId, recordPath,
    tokenLoader: async () => fixtureToken,
  });
  const record = JSON.parse(readFileSync(recordPath, 'utf8'));
  writeFileSync(evidencePath, JSON.stringify({
    ok: true, platform: process.platform, node: process.version,
    messageId, recordPath, text, record,
  }, null, 2));
  console.log('PROBE CLIENT OK');
} catch (error) {
  writeFileSync(evidencePath, JSON.stringify({
    ok: false, platform: process.platform, node: process.version,
    error: String(error.message), recordPath,
  }, null, 2));
  console.log(`PROBE CLIENT FAILED: ${error.message}`);
  process.exitCode = 1;
}
