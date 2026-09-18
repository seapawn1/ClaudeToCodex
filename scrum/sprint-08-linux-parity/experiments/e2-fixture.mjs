// Sprint 08 pre-study E2: fixture a pair + pending letter in the isolated bridge
// root (/tmp/ctc-e2/bridge-root) using the PRODUCT store code paths, so every
// file format is exactly what the hook consumes. Fixture layer, honestly
// labeled: the "Claude" side is a synthetic identity, no real Claude session.
// Usage: node e2-fixture.mjs <codexThreadId> <marker>
// Prints the pair/message ids and the wake text to queue via native codex CLI.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BridgeStore, wakeText } from '../../../bridge/store.mjs';

const [threadId, markerArg] = process.argv.slice(2);
if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(threadId ?? '') || !markerArg) {
  console.error('Usage: node e2-fixture.mjs <codexThreadId> <marker>');
  process.exit(8);
}
const root = '/tmp/ctc-e2/bridge-root';
const claudeFake = randomUUID();
const store = new BridgeStore(root);
store.initialize();
const endpointPath = join(root, 'endpoints', `claude-${claudeFake}.json`);
writeFileSync(endpointPath, JSON.stringify({
  schema: 1, sessionId: claudeFake, socket: 'e2-fixture-unused',
  tokenProtected: 'e2-fixture', registeredAt: new Date().toISOString(),
  cwd: '/tmp/ctc-e2/work', origin: 'e2-fixture',
}, null, 2));
const pair = store.pair(threadId, endpointPath, 'e2peer');
const body = `[${markerArg}] E2 预研排队信件（fixture 层，合成 Claude 身份）。用于验证 Linux hook 领取、注入与续接；内容本身无需处理。`;
const message = store.prepare(pair, 'claude', body, null, claudeFake);
store.publish(message);
store.event('e2-fixture-created', { pairId: pair.id, messageId: message.id, note: 'synthetic claude identity, fixture layer' });
console.log(JSON.stringify({
  pairId: pair.id, messageId: message.id, claudeFake, bridgeRoot: root,
  wakeText: wakeText(pair.id, message.id, message.body, message.createdAt),
}, null, 2));
