import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const hook = fileURLToPath(new URL('../prototype/PostToolProbe.mjs', import.meta.url));
const event = {
  hook_event_name: 'PostToolUse',
  tool_name: 'Bash',
  session_id: 'offline-test-session',
  turn_id: 'offline-test-turn',
  tool_use_id: 'offline-test-tool',
  tool_input: { command: '& ./prototype/Invoke-CodexHookProbe.ps1 -RunP03' },
};

function runHook(t, payload) {
  const directory = mkdtempSync(join(tmpdir(), 'p03-offline-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, TEMP: directory, TMP: directory, TMPDIR: directory },
    timeout: 5000,
  });
  assert.ifError(result.error);
  return { ...result, directory };
}

test('only the explicitly requested work tool produces model-visible context', (t) => {
  const result = runHook(t, event);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, '');
  const output = JSON.parse(result.stdout);
  assert.equal(output.hookSpecificOutput.hookEventName, 'PostToolUse');
  const context = output.hookSpecificOutput.additionalContext;
  const marker = context.match(/P03-[0-9a-f]{32}/)?.[0];
  assert.ok(marker);
  assert.ok(context.includes(`P03-CHECKPOINT: ${marker}`));
  assert.deepEqual(Object.keys(output), ['hookSpecificOutput']);
  const recordPath = join(result.directory, 'cross-session-agent-messaging', 'probes', `${marker}.json`);
  const record = JSON.parse(readFileSync(recordPath, 'utf8'));
  assert.equal(record.toolUseId, event.tool_use_id);
  assert.equal(record.sessionId, event.session_id);
  assert.deepEqual(record.output, output);
  assert.equal(record.modelReceipt, 'unverified');
  const audit = JSON.parse(readFileSync(join(result.directory, 'cross-session-agent-messaging', 'probes', 'P03-hook-invocations.jsonl'), 'utf8'));
  assert.equal(audit.toolUseId, event.tool_use_id);
  assert.equal(audit.matchesCommand, true);
  assert.equal(audit.matchesOptIn, true);
  assert.equal(Object.hasOwn(audit, 'command'), false);
});

test('unrelated calls leave only an invocation trace, with no message or context', (t) => {
  for (const payload of [
    { ...event, tool_input: { command: 'Get-Date -Format o' } },
    { ...event, hook_event_name: 'PreToolUse' },
    { ...event, tool_name: 'apply_patch' },
    { ...event, tool_input: { command: '& ./prototype/Invoke-CodexHookProbe.ps1' } },
  ]) {
    const result = runHook(t, payload);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
    const probeDirectory = join(result.directory, 'cross-session-agent-messaging', 'probes');
    assert.deepEqual(readdirSync(probeDirectory), ['P03-hook-invocations.jsonl']);
    const audit = JSON.parse(readFileSync(join(probeDirectory, 'P03-hook-invocations.jsonl'), 'utf8'));
    assert.equal(audit.eventName, payload.hook_event_name);
    assert.equal(Object.hasOwn(audit, 'command'), false);
  }
});

test('a malformed targeted event fails without injecting context', (t) => {
  const result = runHook(t, { ...event, session_id: null });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Missing session_id/);
  assert.deepEqual(readdirSync(join(result.directory, 'cross-session-agent-messaging', 'probes')), ['P03-hook-invocations.jsonl']);
});
