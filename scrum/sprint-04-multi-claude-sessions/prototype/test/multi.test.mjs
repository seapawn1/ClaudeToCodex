import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { BridgeStore, dailyRoot, defaultRoot, handleHook, wakeText } from '../bridge/store.mjs';

const cli = fileURLToPath(new URL('../bridge/cli.mjs', import.meta.url));

const codexId = '11111111-1111-4111-8111-111111111111';
const claudeA = '22222222-2222-4222-8222-222222222222';
const claudeB = '44444444-4444-4444-8444-444444444444';
const otherCodex = '33333333-3333-4333-8333-333333333333';

function setup(t, { withB = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ctc-multi-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const epA = join(root, 'endpoint-a.json');
  writeFileSync(epA, JSON.stringify({ sessionId: claudeA }));
  const epB = join(root, 'endpoint-b.json');
  writeFileSync(epB, JSON.stringify({ sessionId: claudeB }));
  const store = new BridgeStore(root);
  const pairA = store.pair(codexId, epA, 'alpha');
  const pairB = withB ? store.pair(codexId, epB, 'beta') : null;
  return { root, store, pairA, pairB, epA, epB };
}

function hookEvent(name, extra = {}) {
  return { session_id: codexId, turn_id: 'test-turn', tool_use_id: 'test-tool', hook_event_name: name, ...extra };
}

function incoming(store, pair, body = 'External question from a peer session.') {
  const message = store.prepare(pair, 'claude', body, null, pair.claudeId);
  store.publish(message);
  return message;
}

const tick = () => new Promise((resolvePromise) => setTimeout(resolvePromise, 6));

test('pairs coexist and reconnection never disturbs the other target (S04-11-1)', (t) => {
  const { store, pairA, pairB, epA } = setup(t);
  assert.equal(store.pairs().length, 2);
  assert.notEqual(pairA.id, pairB.id);
  assert.equal(pairA.codexId, pairB.codexId);
  // Same {codex, claude} reconnect reuses the pair idempotently; B is untouched.
  const again = store.pair(codexId, epA, 'alpha');
  assert.equal(again.id, pairA.id);
  assert.equal(store.pairs().length, 2);
  // One bridge root serves exactly one Codex original session.
  assert.throws(() => store.pair(otherCodex, epA, 'alpha'), /different Codex session/);
  // claudeName is snapshotted at connect time and readable for targeting.
  assert.equal(store.resolveTarget('beta').id, pairB.id);
});

test('legacy single-pair data stays visible and can coexist with new pairs', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'ctc-multi-legacy-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const epA = join(root, 'endpoint-a.json');
  writeFileSync(epA, JSON.stringify({ sessionId: claudeA }));
  const legacy = {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', codexId, claudeId: claudeA,
    endpointPath: resolve(epA), createdAt: '2026-09-01T00:00:00.000Z',
  };
  writeFileSync(join(root, 'pair.json'), `${JSON.stringify(legacy, null, 2)}\n`);
  const store = new BridgeStore(root);
  assert.equal(store.pairs().length, 1);
  assert.equal(store.pairById(legacy.id).claudeId, claudeA);
  assert.equal(store.findPairByClaude(claudeA).id, legacy.id);
  // Reconnect with the same identity and endpoint reuses the legacy entry.
  assert.equal(store.pair(codexId, epA).id, legacy.id);
  // A different claude endpoint becomes an additional pair, not a replacement.
  const epB = join(root, 'endpoint-b.json');
  writeFileSync(epB, JSON.stringify({ sessionId: claudeB }));
  const pairB = store.pair(codexId, epB, 'beta');
  assert.equal(store.pairs().length, 2);
  assert.equal(store.pairById(legacy.id).claudeId, claudeA);
  assert.notEqual(pairB.id, legacy.id);
  assert.throws(() => store.pair(otherCodex, epB, 'beta'), /different Codex session/);
});

test('target names resolve uniquely, never by guessing (S04-11-2)', (t) => {
  const { store, pairA } = setup(t);
  assert.equal(store.resolveTarget('alp').id, pairA.id);
  try {
    store.resolveTarget('gamma');
    assert.fail('expected resolveTarget to throw');
  } catch (error) {
    assert.match(error.message, /No connected target matches "gamma"/);
    assert.match(error.message, /alpha -> claude 22222222/);
    assert.match(error.message, /beta -> claude 44444444/);
  }
  assert.throws(() => store.resolveTarget('a'), /matches 2 connected pairs/);
  // The caller must be exactly one original session.
  assert.deepEqual(store.caller({ CODEX_THREAD_ID: codexId }), { tool: 'codex', sessionId: codexId });
  assert.deepEqual(store.caller({ CLAUDE_CODE_SESSION_ID: claudeA }), { tool: 'claude', sessionId: claudeA });
  assert.throws(() => store.caller({}), /exactly one original session/);
  assert.throws(() => store.caller({ CODEX_THREAD_ID: codexId, CLAUDE_CODE_SESSION_ID: claudeA }), /exactly one original session/);
});

test('replies bind to the answered message, not to the latest target (S04-11-3)', (t) => {
  const { store, pairA, pairB } = setup(t);
  const question = store.prepare(pairA, 'codex', 'Which detail is missing for A?', null, codexId);
  const reply = store.prepare(pairA, 'claude', 'The requested format.', question.id, claudeA);
  assert.equal(reply.conversationId, question.conversationId);
  // Interleave a send to B, then follow up on A's old thread: still pair A.
  const toB = store.prepare(pairB, 'codex', 'Separate question for B.', null, codexId);
  assert.equal(toB.pairId, pairB.id);
  const followUp = store.prepare(pairA, 'codex', 'Would JSON work for A?', reply.id, codexId);
  assert.equal(followUp.pairId, pairA.id);
  assert.equal(followUp.conversationId, question.conversationId);
  assert.equal(followUp.to.sessionId, claudeA);
  // B's session cannot answer or hijack A's thread.
  assert.throws(() => store.prepare(pairA, 'claude', 'hijack', question.id, claudeB), /only from the original session of the selected pair/);
  assert.throws(() => store.prepare(pairB, 'claude', 'hijack', question.id, claudeB), /was not addressed to this selected session/);
  // An unregistered pair object is refused outright.
  assert.throws(() => store.prepare({ ...pairB, id: '99999999-9999-4999-8999-999999999999' }, 'codex', 'x', null, codexId), /not registered/);
});

test('near-simultaneous letters from two targets are both accepted, one per hook event', async (t) => {
  const { store, pairA, pairB } = setup(t);
  const first = incoming(store, pairA, 'A answers first');
  await tick();
  const second = incoming(store, pairB, 'B answers almost at once');
  assert.equal(store.pendingSlots().length, 2);
  const deliveredA = store.take(hookEvent('PostToolUse'));
  assert.equal(deliveredA.id, first.id);
  assert.equal(deliveredA.pairId, pairA.id);
  const deliveredB = store.take(hookEvent('PostToolUse'));
  assert.equal(deliveredB.id, second.id);
  assert.equal(deliveredB.pairId, pairB.id);
  assert.equal(store.pendingSlots().length, 0);
  assert.ok(store.consumed(first.id));
  assert.ok(store.consumed(second.id));
});

test('a second letter while the same target waits in slot is rejected, not queued or overwriting', (t) => {
  const { store, pairA } = setup(t);
  const first = incoming(store, pairA, 'A is waiting in its slot');
  const second = store.prepare(pairA, 'claude', 'A sends again too early', null, claudeA);
  assert.throws(() => store.publish(second), /alpha already has a pending message for Codex. Wait for it to be consumed./);
  // The rejected message never entered the delivery path; the slot still holds the first letter.
  assert.equal(store.pendingSlots().length, 1);
  assert.equal(store.pendingSlots()[0].message.id, first.id);
  const delivered = store.take(hookEvent('PostToolUse'));
  assert.equal(delivered.id, first.id);
});

test('wake order reversed from creation order still delivers every message exactly once', async (t) => {
  const { store, pairA, pairB } = setup(t);
  const older = incoming(store, pairA, 'older letter, later wake');
  await tick();
  const newer = incoming(store, pairB, 'newer letter, earlier wake');
  // B's wake arrives first although A's letter is older: the wake drives injection order.
  const viaWakeB = handleHook(store, hookEvent('UserPromptSubmit', { prompt: wakeText(pairB.id, newer.id) }));
  assert.match(viaWakeB.hookSpecificOutput.additionalContext, /newer letter, earlier wake/);
  assert.match(viaWakeB.hookSpecificOutput.additionalContext, new RegExp(pairB.id));
  // A is still pending and unharmed; its own wake delivers it.
  assert.equal(store.pendingSlots().length, 1);
  const viaWakeA = handleHook(store, hookEvent('UserPromptSubmit', { prompt: wakeText(pairA.id, older.id) }));
  assert.match(viaWakeA.hookSpecificOutput.additionalContext, /older letter, later wake/);
  assert.equal(store.pendingSlots().length, 0);
  assert.ok(store.consumed(older.id));
  assert.ok(store.consumed(newer.id));
});

test('a repeated wake is suppressed and never re-injects the same message', async (t) => {
  const { store, pairA } = setup(t);
  const letter = incoming(store, pairA, 'to be delivered once');
  const first = handleHook(store, hookEvent('UserPromptSubmit', { prompt: wakeText(pairA.id, letter.id) }));
  assert.match(first.hookSpecificOutput.additionalContext, /to be delivered once/);
  const repeat = handleHook(store, hookEvent('UserPromptSubmit', { prompt: wakeText(pairA.id, letter.id) }));
  assert.equal(repeat.decision, 'block');
  assert.match(repeat.reason, /already supplied to the conversation/);
  const events = readFileSync(join(store.root, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(events.filter((e) => e.type === 'context-prepared').length, 1);
  assert.equal(events.filter((e) => e.type === 'wake-suppressed').length, 1);
});

test('a wake for an already-consumed target still delivers another pending target (no stranded letters)', async (t) => {
  const { store, pairA, pairB } = setup(t);
  const forB = incoming(store, pairB, 'B delivered and consumed');
  await tick();
  const forA = incoming(store, pairA, 'A still waiting');
  const delivered = handleHook(store, hookEvent('UserPromptSubmit', { prompt: wakeText(pairB.id, forB.id) }));
  assert.match(delivered.hookSpecificOutput.additionalContext, /B delivered and consumed/);
  // A stale repeat of B's wake is a delivery opportunity: the oldest pending letter (A) is taken.
  const fallback = handleHook(store, hookEvent('UserPromptSubmit', { prompt: wakeText(pairB.id, forB.id) }));
  assert.match(fallback.hookSpecificOutput.additionalContext, /A still waiting/);
  assert.equal(store.pendingSlots().length, 0);
  const events = readFileSync(join(store.root, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(events.filter((e) => e.type === 'context-prepared' && e.messageId === forB.id).length, 1);
  assert.equal(events.filter((e) => e.type === 'context-prepared' && e.messageId === forA.id).length, 1);
});

test('single-target use keeps the 1.0.0 receiving behaviour (S04-11-7 fixture level)', (t) => {
  const { store, pairA } = setup(t, { withB: false });
  assert.equal(store.pairs().length, 1);
  const letter = incoming(store, pairA, 'single target round trip');
  const context = handleHook(store, hookEvent('PostToolUse'));
  assert.match(context.hookSpecificOutput.additionalContext, /Cross-session bridge message/);
  assert.match(context.hookSpecificOutput.additionalContext, /single target round trip/);
  const followUp = incoming(store, pairA, 'stop hook delivers the next letter');
  const stop = handleHook(store, hookEvent('Stop'));
  assert.equal(stop.decision, 'block');
  assert.match(stop.reason, /stop hook delivers the next letter/);
  assert.deepEqual(handleHook(store, hookEvent('UserPromptSubmit', { prompt: 'plain user text' })), {});
  assert.deepEqual(handleHook(store, hookEvent('UserPromptSubmit', { session_id: '55555555-5555-4555-8555-555555555555', prompt: 'x' })), {});
  assert.ok(existsSync(join(store.root, 'receipts', `${letter.id}.json`)));
});

test('the prototype refuses to pick a data root on its own (SM review 4d9f6031, isolation)', (t) => {
  const saved = process.env.CTC_BRIDGE_DIR;
  t.after(() => {
    if (saved === undefined) delete process.env.CTC_BRIDGE_DIR;
    else process.env.CTC_BRIDGE_DIR = saved;
  });
  delete process.env.CTC_BRIDGE_DIR;
  assert.throws(() => defaultRoot(), /requires CTC_BRIDGE_DIR/);
  process.env.CTC_BRIDGE_DIR = dailyRoot();
  assert.throws(() => defaultRoot(), /daily bridge data root/);
  const safe = join(tmpdir(), 's04-refusal-check');
  process.env.CTC_BRIDGE_DIR = safe;
  assert.equal(defaultRoot(), resolve(safe));
});

test('the prototype CLI refuses to run instead of touching the daily bridge (CLI level)', () => {
  const env = { ...process.env };
  delete env.CTC_BRIDGE_DIR;
  const missing = spawnSync(process.execPath, [cli, 'status'], { env, encoding: 'utf8' });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /requires CTC_BRIDGE_DIR/);
  const daily = spawnSync(process.execPath, [cli, 'status'], { env: { ...process.env, CTC_BRIDGE_DIR: dailyRoot() }, encoding: 'utf8' });
  assert.equal(daily.status, 1);
  assert.match(daily.stderr, /daily bridge data root/);
});

test('wake-shaped but malformed text never throws (SM review 4d9f6031, robustness)', (t) => {
  const { store, pairA } = setup(t);
  const dashes = '-'.repeat(36);
  const valid = '123e4567-e89b-4212-a456-426614174000';
  // Nothing pending: malformed wake text is indistinguishable from plain input.
  assert.deepEqual(handleHook(store, hookEvent('UserPromptSubmit', { prompt: `[CTC-WAKE ${dashes} ${valid}]` })), {});
  // Something pending: the malformed wake is still a delivery opportunity and must not error.
  const letter = incoming(store, pairA, 'delivered despite malformed wake');
  const delivered = handleHook(store, hookEvent('UserPromptSubmit', { prompt: `[CTC-WAKE ${dashes} ${valid}]` }));
  assert.match(delivered.hookSpecificOutput.additionalContext, /delivered despite malformed wake/);
  assert.ok(store.consumed(letter.id));
});
