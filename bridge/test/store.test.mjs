import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { BridgeStore, handleHook, readJson, wakeText } from '../store.mjs';
import { commandString } from '../entry.mjs';

const codexId = '11111111-1111-4111-8111-111111111111';
const claudeId = '22222222-2222-4222-8222-222222222222';
const otherId = '33333333-3333-4333-8333-333333333333';
const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'ctc-bridge-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const endpoint = join(root, 'endpoint.json');
  writeFileSync(endpoint, JSON.stringify({ sessionId: claudeId }));
  const store = new BridgeStore(root);
  const pair = store.pair(codexId, endpoint);
  return { root, store, pair, endpoint };
}

function hookEvent(name, extra = {}) {
  return { session_id: codexId, turn_id: 'test-turn', tool_use_id: 'test-tool', hook_event_name: name, ...extra };
}

function incoming(store, body = 'External question: 你好.\nKeep the full body.') {
  const message = store.prepare('claude', body);
  store.publish(message);
  return message;
}

function isolatedEnv(root, role) {
  const env = { ...process.env, CTC_BRIDGE_DIR: root };
  delete env.CODEX_THREAD_ID;
  delete env.CLAUDE_CODE_SESSION_ID;
  if (role === 'codex') env.CODEX_THREAD_ID = codexId;
  if (role === 'claude') env.CLAUDE_CODE_SESSION_ID = claudeId;
  return env;
}

test('pairing stays explicit and senders must be the selected original sessions', (t) => {
  const { store, pair, endpoint } = setup(t);
  assert.deepEqual(store.pair(codexId, endpoint), pair);
  assert.throws(() => store.pair(otherId, endpoint), /different pair/);
  assert.equal(store.caller({ CODEX_THREAD_ID: codexId }), 'codex');
  assert.equal(store.caller({ CLAUDE_CODE_SESSION_ID: claudeId }), 'claude');
  assert.throws(() => store.caller({ CODEX_THREAD_ID: otherId }), /selected original/);
  assert.throws(() => store.caller({ CODEX_THREAD_ID: codexId, CLAUDE_CODE_SESSION_ID: claudeId }), /exactly one/);
});

test('reply and follow-up retain the conversation and reverse the exact recipient', (t) => {
  const { store } = setup(t);
  const question = store.prepare('codex', 'Which detail is missing?');
  const reply = store.prepare('claude', 'The requested format.', question.id);
  const followup = store.prepare('codex', 'Would JSON work?', reply.id);
  assert.equal(reply.conversationId, question.conversationId);
  assert.equal(followup.conversationId, question.conversationId);
  assert.equal(reply.to.sessionId, codexId);
  assert.equal(followup.to.sessionId, claudeId);
  assert.equal(followup.replyTo, reply.id);
  assert.throws(() => store.prepare('codex', 'invalid reply', question.id), /not addressed/);
  assert.throws(() => store.prepare('claude', 'x'.repeat(2001)), /2000/);
});

test('an idle wake supplies the whole body and later copies of that wake are blocked', (t) => {
  const { store, pair } = setup(t);
  const message = incoming(store);
  const event = hookEvent('UserPromptSubmit', { prompt: wakeText(pair.id, message.id) });
  const output = handleHook(store, event);
  const text = output.hookSpecificOutput.additionalContext;
  assert.equal(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
  assert.ok(text.includes(JSON.stringify(message.body)));
  assert.ok(text.includes(`reply --to ${message.id}`));
  assert.ok(text.includes(commandString()));
  assert.equal(store.consumed(message.id), true);
  assert.equal(handleHook(store, event).decision, 'block');
});

test('tool completion consumes once and suppresses the remaining queue wake', (t) => {
  const { store, pair } = setup(t);
  const message = incoming(store);
  const output = handleHook(store, hookEvent('PostToolUse'));
  assert.equal(output.hookSpecificOutput.hookEventName, 'PostToolUse');
  assert.deepEqual(handleHook(store, hookEvent('PostToolUse')), {});
  assert.deepEqual(handleHook(store, hookEvent('Stop')), {});
  assert.equal(handleHook(store, hookEvent('UserPromptSubmit', { prompt: wakeText(pair.id, message.id) })).decision, 'block');
  const receipt = readJson(join(store.root, 'receipts', `${message.id}.json`));
  assert.equal(receipt.modelReceipt, 'unverified');
  assert.equal(receipt.toolUseId, 'test-tool');
});

test('Stop creates a continuation only for new messages, including after an earlier continuation', (t) => {
  const { store, pair } = setup(t);
  const first = incoming(store, 'Arrived during final generation.');
  const output = handleHook(store, hookEvent('Stop'));
  assert.equal(output.decision, 'block');
  assert.ok(output.reason.includes(first.body));
  assert.deepEqual(handleHook(store, hookEvent('UserPromptSubmit', { prompt: output.reason })), {});
  assert.deepEqual(handleHook(store, hookEvent('Stop', { stop_hook_active: true })), {});
  const next = incoming(store, 'A different new message.');
  assert.ok(handleHook(store, hookEvent('Stop', { stop_hook_active: true })).reason.includes(next.body));
  assert.equal(handleHook(store, hookEvent('UserPromptSubmit', { prompt: wakeText(pair.id, first.id) })).decision, 'block');
});

test('normal prompts and other sessions are not blocked or mistaken for bridge wakes', (t) => {
  const { store, pair } = setup(t);
  const message = incoming(store);
  assert.deepEqual(handleHook(store, hookEvent('PostToolUse', { session_id: otherId })), {});
  assert.deepEqual(handleHook(store, hookEvent('PostToolUse', { agent_id: 'another-agent' })), {});
  assert.equal(store.consumed(message.id), false);
  assert.ok(handleHook(store, hookEvent('UserPromptSubmit', { prompt: 'Continue my work.' })).hookSpecificOutput.additionalContext);
  for (const prompt of ['Continue my work.', `Quoted example: ${wakeText(pair.id, message.id)}`, `[CTC-WAKE ${pair.id} ${'-'.repeat(36)}]`]) {
    assert.deepEqual(handleHook(store, hookEvent('UserPromptSubmit', { prompt })), {});
  }
});

test('one pending slot refuses a second message without replacing the first', (t) => {
  const { store } = setup(t);
  const first = incoming(store, 'First body');
  const second = store.prepare('claude', 'Second body');
  assert.throws(() => store.publish(second), /already has a pending/);
  assert.ok(handleHook(store, hookEvent('PostToolUse')).hookSpecificOutput.additionalContext.includes(first.body));
  store.publish(second);
  assert.ok(handleHook(store, hookEvent('PostToolUse')).hookSpecificOutput.additionalContext.includes(second.body));
  assert.throws(() => store.publish({ ...second, from: { tool: 'claude', sessionId: otherId } }), /Only this pair/);
});

test('concurrent hook processes claim a pending message only once', async (t) => {
  const { root, store } = setup(t);
  const message = incoming(store);
  const invoke = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, 'hook'], { env: isolatedEnv(root), windowsHide: true, timeout: 5000 });
    let output = '';
    let errors = '';
    child.stdout.setEncoding('utf8').on('data', (data) => { output += data; });
    child.stderr.setEncoding('utf8').on('data', (data) => { errors += data; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(JSON.parse(output)) : reject(new Error(errors)));
    child.stdin.end(JSON.stringify(hookEvent('PostToolUse')));
  });
  const results = await Promise.all([invoke(), invoke()]);
  assert.equal(results.filter((result) => result.hookSpecificOutput).length, 1);
  assert.ok(store.consumed(message.id));
});

test('CLI sends a Claude message through the shared inbox and one exact queue wake', { skip: process.platform !== 'win32' }, (t) => {
  const { root, store, pair } = setup(t);
  const capture = join(root, 'queue.json');
  writeFileSync(join(root, 'codex.ps1'), '[IO.File]::WriteAllText($env:CTC_QUEUE_CAPTURE, ($args | ConvertTo-Json -Compress))\nexit 0\n');
  const env = isolatedEnv(root, 'claude');
  for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
  env.PATH = `${root};${process.env.PATH}`;
  env.CTC_QUEUE_CAPTURE = capture;
  const result = spawnSync(process.execPath, [cli, 'send', '--body', 'A short question.'], { env, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  const sent = JSON.parse(result.stdout);
  assert.equal(sent.receipt, 'unverified');
  assert.deepEqual(readJson(capture), ['queue', '--thread', codexId, '--message', wakeText(pair.id, sent.messageId)]);
  assert.ok(existsSync(join(root, 'pending', codexId, 'message.json')));
  assert.ok(handleHook(store, hookEvent('UserPromptSubmit', { prompt: wakeText(pair.id, sent.messageId) })).hookSpecificOutput.additionalContext.includes('A short question.'));
});

test('CLI reply from the Claude session queues exactly one wake for the original Codex thread', { skip: process.platform !== 'win32' }, (t) => {
  const { root, store, pair } = setup(t);
  const question = store.prepare('codex', 'Which detail is missing?');
  const capture = join(root, 'reply-queue.json');
  writeFileSync(join(root, 'codex.ps1'), '[IO.File]::WriteAllText($env:CTC_QUEUE_CAPTURE, ($args | ConvertTo-Json -Compress))\nexit 0\n');
  const env = isolatedEnv(root, 'claude');
  for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
  env.PATH = `${root};${process.env.PATH}`;
  env.CTC_QUEUE_CAPTURE = capture;
  const result = spawnSync(process.execPath, [cli, 'reply', '--to', question.id, '--body', 'The requested format.'], { env, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  const sent = JSON.parse(result.stdout);
  assert.equal(sent.conversationId, question.conversationId);
  assert.deepEqual(readJson(capture), ['queue', '--thread', codexId, '--message', wakeText(pair.id, sent.messageId)]);
});

test('a changed Claude endpoint identity is rejected before any pipe write', (t) => {
  const { root, store, endpoint } = setup(t);
  writeFileSync(endpoint, JSON.stringify({ sessionId: otherId, socket: '\\\\.\\pipe\\x', tokenProtected: 'opaque' }));
  const env = isolatedEnv(root, 'codex');
  const result = spawnSync(process.execPath, [cli, 'send', '--body', 'Answer.'], { env, encoding: 'utf8', timeout: 10000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /identity changed/);
  assert.deepEqual(readdirSync(join(root, 'wire')), []);
  assert.ok(readFileSync(join(store.root, 'events.jsonl'), 'utf8').trim().split('\n').some((line) => JSON.parse(line).type === 'send-error'));
});
