import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { BridgeStore, dailyRoot, defaultRoot, handleHook, renderPeer, wakeText } from '../bridge/store.mjs';

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

test('reconnecting a legacy identity refreshes its endpoint in place (SM 5a2d818c-2)', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'ctc-multi-legacy2-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const oldEndpoint = join(root, 'old-endpoint.json');
  writeFileSync(oldEndpoint, JSON.stringify({ sessionId: claudeA }));
  const legacy = {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee01', codexId, claudeId: claudeA,
    endpointPath: resolve(oldEndpoint), createdAt: '2026-09-01T00:00:00.000Z',
  };
  writeFileSync(join(root, 'pair.json'), `${JSON.stringify(legacy, null, 2)}\n`);
  const store = new BridgeStore(root);
  // The connect flow synthesizes a fresh endpoint inside this root; same
  // identity must reuse the legacy pair and refresh the endpoint, not reject.
  const freshEndpoint = join(root, 'endpoints', `claude-${claudeA}.json`);
  mkdirSync(join(root, 'endpoints'), { recursive: true });
  writeFileSync(freshEndpoint, JSON.stringify({ sessionId: claudeA }));
  const reused = store.pair(codexId, freshEndpoint);
  assert.equal(reused.id, legacy.id, 'identity preserved');
  assert.equal(reused.createdAt, legacy.createdAt, 'createdAt preserved');
  assert.equal(reused.endpointPath, resolve(freshEndpoint), 'endpoint refreshed');
  assert.equal(store.pairs().length, 1, 'no new registry entry');
  const onDisk = JSON.parse(readFileSync(join(root, 'pair.json'), 'utf8'));
  assert.equal(onDisk.endpointPath, resolve(freshEndpoint));
  const events = readFileSync(join(store.root, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(events.some((e) => e.type === 'legacy-endpoint-updated' && e.pairId === legacy.id));
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

test('reply guidance carries the isolated CODEX_HOME when the sender runs under one (run 3 finding)', (t) => {
  const { store, pairA } = setup(t);
  const letter = store.prepare(pairA, 'codex', 'guidance check', null, codexId);
  const daily = renderPeer(letter, store.root, null);
  assert.doesNotMatch(daily, /CODEX_HOME/);
  assert.match(daily, /CTC_BRIDGE_DIR/);
  const isolated = renderPeer(letter, store.root, 'C:\\isolated\\codex-home');
  assert.match(isolated, /\$env:CODEX_HOME='C:\\isolated\\codex-home'; /);
  assert.match(isolated, new RegExp(`reply --to ${letter.id}`));
});

test('retiring one target is explicit, evidenced, and leaves the other intact (S04-11-6)', (t) => {
  const { store, pairA, pairB, root } = setup(t);
  // An already-accepted letter does NOT block retirement: acceptance is
  // honored and the letter stays deliverable on its own addressing.
  incoming(store, pairA, 'pending while retiring');
  const result = store.retire(pairA.id);
  assert.equal(store.pairs().length, 1);
  assert.equal(store.pairs()[0].id, pairB.id);
  assert.ok(result.archivedTo.startsWith(join(root, 'pairs-retired')));
  assert.ok(existsSync(result.archivedTo), 'retired evidence is kept on disk');
  assert.throws(() => store.retire(pairA.id), /No registered pair/);
  // The stranded-window letter still delivers, with the receipt noting it.
  const delivered = store.take(hookEvent('PostToolUse'));
  assert.equal(delivered.id !== null && delivered.pairId, pairA.id);
  const receipt = JSON.parse(readFileSync(join(root, 'receipts', `${delivered.id}.json`), 'utf8'));
  assert.equal(receipt.pairRetired, true);
  // The surviving pair still works end to end.
  const letter = incoming(store, pairB, 'B works after A retired');
  assert.equal(store.take(hookEvent('PostToolUse')).id, letter.id);
  const events = readFileSync(join(store.root, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(events.some((e) => e.type === 'retired' && e.pairId === pairA.id));
});

test('the real retire/publish window is reproduced and cannot strand or misroute (SM 8a03ed6b-4)', (t) => {
  const { store, pairA } = setup(t, { withB: false });
  // The exact race points: publish() has read the pair and staged the letter,
  // retire() then completes the registry move, and only afterwards does the
  // staged slot land in pending/ - the late-landing letter must still deliver.
  const staged = store.prepare(pairA, 'claude', 'raced into the slot', null, claudeA);
  const staging = mkdtempSync(join(store.root, 'staging', 'race-'));
  writeFileSync(join(staging, 'message.json'), JSON.stringify(staged));
  store.retire(pairA.id);
  renameSync(staging, join(store.root, 'pending', pairA.id));
  // A foreign recipient is skipped WHILE the letter is still pending.
  assert.equal(store.take(hookEvent('PostToolUse', { session_id: '55555555-5555-4555-8555-555555555555' })), null);
  assert.ok(existsSync(join(store.root, 'pending', pairA.id, 'message.json')), 'letter still pending after the foreign check');
  // The right recipient gets it, receipt noting the archived pair.
  const delivered = store.take(hookEvent('PostToolUse'));
  assert.equal(delivered.id, staged.id);
  const receipt = JSON.parse(readFileSync(join(store.root, 'receipts', `${staged.id}.json`), 'utf8'));
  assert.equal(receipt.pairRetired, true);
  // A repeat wake for the consumed retired letter is still suppressed.
  const repeat = handleHook(store, hookEvent('UserPromptSubmit', { prompt: wakeText(pairA.id, staged.id) }));
  assert.equal(repeat.decision, 'block');
  assert.match(repeat.reason, /already supplied/);
  // Post-retirement, a NEW letter for the retired pair is refused at prepare.
  assert.equal(store.pairs().length, 0);
  assert.throws(() => store.prepare(pairA, 'claude', 'should be refused', null, claudeA), /not registered/);
});

test('unknown pairIds and mismatched senders never inject (SM 8a03ed6b-2)', (t) => {
  const { store, pairA } = setup(t, { withB: false });
  store.retire(pairA.id);
  // A slot letter claiming the retired pair but sent by the wrong session.
  const mismatched = {
    id: '123e4567-e89b-4212-a456-426614174009', pairId: pairA.id,
    conversationId: '223e4567-e89b-4212-a456-426614174009', replyTo: null,
    from: { tool: 'claude', sessionId: '55555555-5555-4555-8555-555555555555' },
    to: { tool: 'codex', sessionId: codexId },
    body: 'wrong sender for the archived pair', createdAt: new Date().toISOString(),
  };
  mkdirSync(join(store.root, 'pending', pairA.id), { recursive: true });
  writeFileSync(join(store.root, 'pending', pairA.id, 'message.json'), JSON.stringify(mismatched));
  // A slot letter with a pairId nobody ever registered.
  const ghost = {
    ...mismatched, id: '323e4567-e89b-4212-a456-426614174009', pairId: '423e4567-e89b-4212-a456-426614174009',
    from: { tool: 'claude', sessionId: claudeA },
  };
  mkdirSync(join(store.root, 'pending', ghost.pairId), { recursive: true });
  writeFileSync(join(store.root, 'pending', ghost.pairId, 'message.json'), JSON.stringify(ghost));
  assert.equal(store.take(hookEvent('PostToolUse')), null);
  // Evidence stays in place and the unknown is recorded, never silently dropped.
  assert.ok(existsSync(join(store.root, 'pending', ghost.pairId, 'message.json')));
  const events = readFileSync(join(store.root, 'events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.ok(events.some((e) => e.type === 'unknown-pair-letter' && e.pairId === ghost.pairId));
});

test('a root with another Codex retired history refuses rebinding; same-Codex rebuild still works (SM 1685348c)', (t) => {
  const { store, pairA, epA } = setup(t, { withB: false });
  store.retire(pairA.id);
  assert.throws(() => store.pair(otherCodex, epA, 'alpha'), /retired pairs of a different Codex session/);
  // Rebuilding under the SAME Codex after retiring a stale pair stays allowed.
  const rebuilt = store.pair(codexId, epA, 'alpha');
  assert.equal(rebuilt.codexId, codexId);
  assert.equal(store.pairs().length, 1);
});

test('reconnects refresh the target name so renamed and legacy pairs stay addressable (SM d8b04760-1)', (t) => {
  const { store, pairA, epA } = setup(t, { withB: false });
  // A renamed session reconnecting the same identity updates the stored name.
  store.pair(codexId, epA, 'renamed-alpha');
  const refreshed = store.pairById(pairA.id);
  assert.equal(refreshed.id, pairA.id, 'identity unchanged');
  assert.equal(refreshed.claudeName, 'renamed-alpha');
  assert.equal(store.resolveTarget('renamed-alpha').id, pairA.id);
  // Substring semantics (like session discovery): the old short form still
  // matches the renamed target and no longer matches anything else.
  assert.equal(store.resolveTarget('alpha').id, pairA.id);
  // A legacy pair without a name gains one on reconnect and coexists with a
  // new named target; both stay selectable by name with no hand-written ids.
  const root2 = mkdtempSync(join(tmpdir(), 'ctc-multi-named-legacy-'));
  t.after(() => rmSync(root2, { recursive: true, force: true }));
  const legacyEndpoint = join(root2, 'endpoints', `claude-${claudeA}.json`);
  mkdirSync(join(root2, 'endpoints'), { recursive: true });
  writeFileSync(legacyEndpoint, JSON.stringify({ sessionId: claudeA, cwd: 'D:\\proj\\legacy' }));
  const legacy = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee02', codexId, claudeId: claudeA, endpointPath: legacyEndpoint, createdAt: '2026-09-01T00:00:00.000Z' };
  writeFileSync(join(root2, 'pair.json'), `${JSON.stringify(legacy, null, 2)}\n`);
  const legacyStore = new BridgeStore(root2);
  legacyStore.pair(codexId, legacyEndpoint, 'legacy-alpha');
  const epB2 = join(root2, 'ep-b.json');
  writeFileSync(epB2, JSON.stringify({ sessionId: claudeB, cwd: 'D:\\proj\\beta' }));
  const betaPair = legacyStore.pair(codexId, epB2, 'beta');
  assert.equal(legacyStore.resolveTarget('legacy-alpha').id, legacy.id);
  assert.equal(legacyStore.resolveTarget('beta').id, betaPair.id);
  assert.equal(legacyStore.pairById(legacy.id).claudeName, 'legacy-alpha');
});

test('status carries project context from the endpoint without claiming liveness (SM d8b04760-2)', (t) => {
  const { store, root } = setup(t);
  const env = { ...process.env, CTC_BRIDGE_DIR: root };
  delete env.CODEX_THREAD_ID;
  delete env.CLAUDE_CODE_SESSION_ID;
  const run = spawnSync(process.execPath, [cli, 'status'], { env, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const out = JSON.parse(run.stdout);
  assert.equal(out.pairs.length, 2);
  assert.ok(out.pairs.every((p) => typeof p.project === 'string' || p.project === null));
  assert.ok(out.pairs.every((p) => typeof p.endpointOnDisk === 'boolean'));
  assert.ok(out.pairs.every((p) => !('alive' in p) && !('reachable' in p)), 'no liveness claim is made');
});

test('single-target send keeps the 1.0.0 shape without --name; several targets refuse (S04-11-7, SM 01f3554d)', (t) => {
  const { store, pairA, pairB, root } = setup(t);
  const base = { ...process.env, CODEX_THREAD_ID: codexId };
  delete base.CLAUDE_CODE_SESSION_ID;
  // Several targets without a name: explicit refusal with the count.
  const several = spawnSync(process.execPath, [cli, 'send', '--body', 'which pair?'], { env: { ...base, CTC_BRIDGE_DIR: root }, encoding: 'utf8' });
  assert.equal(several.status, 1);
  assert.match(several.stderr, /requires --name .*: 2 targets are connected/);
  // Retire down to exactly one pair: the 1.0.0 command shape works again.
  store.retire(pairA.id);
  const single = spawnSync(process.execPath, [cli, 'send', '--body', 'single target works'], { env: { ...base, CTC_BRIDGE_DIR: root }, encoding: 'utf8' });
  assert.equal(single.status, 1); // delivery fails on the fake endpoint, but pairing and staging succeeded
  assert.match(single.stderr, /Message [0-9a-f-]{36}: /);
  const id = /Message ([0-9a-f-]{36}):/.exec(single.stderr)[1];
  const message = JSON.parse(readFileSync(join(root, 'messages', `${id}.json`), 'utf8'));
  assert.equal(message.pairId, pairB.id);
  // Zero targets: explicit next step, no guessing.
  store.retire(pairB.id);
  const empty = spawnSync(process.execPath, [cli, 'send', '--body', 'anyone?'], { env: { ...base, CTC_BRIDGE_DIR: root }, encoding: 'utf8' });
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /No connected target\. Run connect first/);
});

test('the retire CLI entry accepts --pairId and --name (run 4 real-loop finding)', (t) => {
  const { store, pairA, pairB } = setup(t);
  const env = { ...process.env, CTC_BRIDGE_DIR: store.root };
  delete env.CODEX_THREAD_ID;
  delete env.CLAUDE_CODE_SESSION_ID;
  // The real loop caught an unknown-option failure: parseArgs must declare the
  // flag exactly as spelled on the command line.
  const byId = spawnSync(process.execPath, [cli, 'retire', '--pairId', pairA.id], { env, encoding: 'utf8' });
  assert.equal(byId.status, 0, byId.stderr);
  assert.equal(JSON.parse(byId.stdout).pair.id, pairA.id);
  assert.equal(store.pairs().length, 1);
  const byName = spawnSync(process.execPath, [cli, 'retire', '--name', 'beta'], { env, encoding: 'utf8' });
  assert.equal(byName.status, 0, byName.stderr);
  assert.equal(JSON.parse(byName.stdout).pair.id, pairB.id);
  assert.equal(store.pairs().length, 0);
});

test('ambiguous same-name targets and unknown replies carry actionable next steps (SM 5a2d818c-3)', (t) => {
  const { store, root } = setup(t);
  // A third pair sharing the name 'alpha': the error must include the retire entry.
  const endpointA2 = join(root, 'endpoint-a2.json');
  writeFileSync(endpointA2, JSON.stringify({ sessionId: '55555555-5555-4555-8555-555555555555' }));
  store.pair(codexId, endpointA2, 'alpha');
  const env = { ...process.env, CTC_BRIDGE_DIR: root, CODEX_THREAD_ID: codexId };
  delete env.CLAUDE_CODE_SESSION_ID;
  const ambiguous = spawnSync(process.execPath, [cli, 'send', '--name', 'alpha', '--body', 'x'], { env, encoding: 'utf8' });
  assert.equal(ambiguous.status, 1);
  // The candidates list carries FULL pairIds and the wording does not presume
  // which target is disposable (SM 8a03ed6b-1).
  assert.match(ambiguous.stderr, /matches 2 connected pairs/);
  assert.match(ambiguous.stderr, /Retire only a pair you are certain is no longer in use/);
  const listedIds = [...ambiguous.stderr.matchAll(/pairId ([0-9a-f-]{36})/g)].map((m) => m[1]);
  assert.equal(listedIds.length, 2);
  // The suggested command is executable exactly as shown: extract one listed
  // id and retire it, resolving the ambiguity without hand-copying anything.
  const retire = spawnSync(process.execPath, [cli, 'retire', '--pairId', listedIds[1]], { env, encoding: 'utf8' });
  assert.equal(retire.status, 0, retire.stderr);
  const resolved = spawnSync(process.execPath, [cli, 'send', '--name', 'alpha', '--body', 'x'], { env, encoding: 'utf8' });
  assert.doesNotMatch(resolved.stderr, /matches 2/);
  // An unknown reply id gets a next step, not a bare ENOENT.
  const unknown = spawnSync(process.execPath, [cli, 'reply', '--to', '00000000-0000-4000-8000-000000000000', '--body', 'x'], { env, encoding: 'utf8' });
  assert.equal(unknown.status, 1);
  assert.match(unknown.stderr, /No bridge message with that id exists/);
  assert.match(unknown.stderr, /reply entry embedded in the message you received/);
});
