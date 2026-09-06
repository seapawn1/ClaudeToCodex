import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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

function invokeHook(payload, directory) {
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, TEMP: directory, TMP: directory, TMPDIR: directory },
    timeout: 5000,
  });
  assert.ifError(result.error);
  return { ...result, directory };
}

function runHook(t, payload, prepare) {
  const directory = mkdtempSync(join(tmpdir(), 'p03-offline-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  prepare?.(directory);
  return invokeHook(payload, directory);
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

const recipient = '11111111-1111-4111-8111-111111111111';
const p04Event = {
  ...event,
  session_id: recipient,
  tool_input: { command: `& ./prototype/Invoke-CodexBusyWindow.ps1 -ThreadId ${recipient} -RunP04` },
};
const p04Note = {
  probe: 'P04',
  threadId: recipient,
  windowId: 'offline-window',
  marker: `P04-${'b'.repeat(32)}`,
  message: 'External question: \u4f60\u597d.\nKeep this whole message.',
};

function prepareP04(directory, note = p04Note) {
  const probeDirectory = join(directory, 'cross-session-agent-messaging', 'probes');
  mkdirSync(probeDirectory, { recursive: true });
  writeFileSync(join(probeDirectory, `P04-inbox-${recipient}.json`), JSON.stringify(note));
  writeFileSync(join(probeDirectory, `busy-${recipient}.json`), '\uFEFF' + JSON.stringify({
    probe: 'P04', threadId: recipient, windowId: 'offline-window', state: 'completed',
  }));
}

test('P04 injects the external body once and keeps the consumed message as evidence', (t) => {
  const result = runHook(t, p04Event, prepareP04);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.ok(output.hookSpecificOutput.additionalContext.endsWith(p04Note.message));
  const directory = join(result.directory, 'cross-session-agent-messaging', 'probes');
  assert.equal(existsSync(join(directory, `P04-inbox-${recipient}.json`)), false);
  assert.deepEqual(JSON.parse(readFileSync(join(directory, `${p04Note.marker}.consumed.json`), 'utf8')), p04Note);
  const record = JSON.parse(readFileSync(join(directory, `${p04Note.marker}-hook.json`), 'utf8'));
  assert.equal(record.synthetic, false);
  assert.deepEqual(record.sourceNote, p04Note);
  const repeat = invokeHook(p04Event, result.directory);
  assert.equal(repeat.status, 0);
  assert.equal(repeat.stdout, '');
});

test('P04 keeps wrong-recipient and stale-window messages pending without injecting them', (t) => {
  for (const note of [
    { ...p04Note, threadId: '22222222-2222-4222-8222-222222222222' },
    { ...p04Note, windowId: 'previous-window' },
  ]) {
    const result = runHook(t, p04Event, (directory) => prepareP04(directory, note));
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /does not match/);
    assert.ok(existsSync(join(result.directory, 'cross-session-agent-messaging', 'probes', `P04-inbox-${recipient}.json`)));
  }
});

test('P04 with no pending message produces no context', (t) => {
  const result = runHook(t, p04Event);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
});

async function runSender(t, viaHook, windowProbe) {
  const directory = mkdtempSync(join(tmpdir(), 'p04-sender-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const probeDirectory = join(directory, 'cross-session-agent-messaging', 'probes');
  const unexpectedQueuePath = join(directory, 'unexpected-queue.txt');
  writeFileSync(join(directory, 'codex.ps1'), "[IO.File]::WriteAllText($env:PROBE_UNEXPECTED_QUEUE, 'called')\nexit 0\n");
  const sender = fileURLToPath(new URL('../prototype/Send-CodexProbe.ps1', import.meta.url));
  let window;
  const outcome = await new Promise((resolve, reject) => {
    const args = ['-NoProfile', '-File', sender, '-ThreadId', recipient, viaHook ? '-ViaHook' : '-DuringTool'];
    const child = spawn('powershell.exe', args, {
      env: {
        ...process.env, TEMP: directory, TMP: directory, TMPDIR: directory,
        PATH: `${directory};${process.env.PATH}`, PROBE_UNEXPECTED_QUEUE: unexpectedQueuePath,
      },
      windowsHide: true,
      timeout: 12000,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => {
      stdout += chunk;
      if (!window && stdout.includes('WAITING_FOR_BUSY_WINDOW')) {
        window = {
          probe: windowProbe, threadId: recipient, windowId: 'sender-test-window', state: 'running',
          startedAt: new Date().toISOString(), plannedEndAt: new Date(Date.now() + 20000).toISOString(),
        };
        writeFileSync(join(probeDirectory, `busy-${recipient}.json`), JSON.stringify(window));
      }
    });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stderr, stdout }));
  });
  assert.equal(existsSync(unexpectedQueuePath), false, 'The sender must not invoke queue in these cases.');
  return { ...outcome, directory, probeDirectory, window };
}

test('PowerShell P04 sender publishes a message that the hook can consume', { skip: process.platform !== 'win32' }, async (t) => {
  const { code, stderr, directory, probeDirectory, window } = await runSender(t, true, 'P04');
  assert.equal(code, 0, stderr);
  const note = JSON.parse(readFileSync(join(probeDirectory, `P04-inbox-${recipient}.json`), 'utf8'));
  assert.equal(note.threadId, recipient);
  assert.equal(note.windowId, window.windowId);
  assert.match(note.marker, /^P04-[0-9a-f]{32}$/);
  window.state = 'completed';
  writeFileSync(join(probeDirectory, `busy-${recipient}.json`), '\uFEFF' + JSON.stringify(window));
  const result = invokeHook(p04Event, directory);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).hookSpecificOutput.additionalContext.includes(note.message));
});

test('senders reject a different probe window before writing or queuing a message', { skip: process.platform !== 'win32' }, async (t) => {
  for (const [viaHook, windowProbe] of [[false, 'P04'], [true, 'P02']]) {
    const result = await runSender(t, viaHook, windowProbe);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Probe mismatch/);
    assert.match(result.stdout, new RegExp(`sender=${viaHook ? 'P04' : 'P02'}`));
    assert.equal(readdirSync(result.probeDirectory).some((name) => /^P0[24]-/.test(name)), false);
  }
});
