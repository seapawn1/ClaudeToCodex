import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { BridgeStore, readJson } from '../prototype/BridgeStore.mjs';

const execute = promisify(execFile);
const bridgePath = fileURLToPath(new URL('../prototype/Bridge.mjs', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url).replaceAll('\\', '/');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const store = new BridgeStore();
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    mode: { type: 'string' }, run: { type: 'string' }, 'reply-to': { type: 'string' }, 'delay-ms': { type: 'string' },
    to: { type: 'string' }, marker: { type: 'string' }, 'message-id': { type: 'string' },
  },
});

function save(path, data) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(data, null, 2), { flag: 'wx' });
  renameSync(temporary, path);
}

function requireRole(role) {
  if (store.caller() !== role) throw new Error(`This scenario step must run in the selected original ${role} session.`);
}

async function send(body, replyTo) {
  const args = replyTo ? ['reply', '--to', replyTo] : ['send'];
  const result = await execute(process.execPath, [bridgePath, ...args, '--body', body], { windowsHide: true, timeout: 15000 });
  return JSON.parse(result.stdout);
}

async function waitFor(read, description, deadline) {
  while (Date.now() < deadline) {
    const result = read();
    if (result) return result;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${description}; do not classify the scenario as passed.`);
}

function optionalJson(path) {
  try { return readJson(path); } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

async function main() {
  const pair = store.getPair();
  const [command] = positionals;
  if (positionals.length !== 1) throw new Error('Use create, arm, work, reverse, watch, or record.');
  const modes = ['codex-tools', 'codex-stop', 'claude-generation'];

  if (command === 'create') {
    requireRole('codex');
    if (!modes.includes(values.mode)) throw new Error(`Specify --mode as one of: ${modes.join(', ')}.`);
    const runId = randomUUID();
    const directory = join(store.root, 'scenarios', runId);
    mkdirSync(directory, { recursive: true });
    const run = { runId, mode: values.mode, pairId: pair.id, createdAt: new Date().toISOString() };
    save(join(directory, 'run.json'), run);
    console.log(JSON.stringify(run));
    return;
  }
  if (!uuid.test(values.run ?? '')) throw new Error('Specify an exact scenario UUID with --run.');
  const directory = join(store.root, 'scenarios', values.run);
  const run = readJson(join(directory, 'run.json'));
  if (run.pairId !== pair.id || run.runId !== values.run) throw new Error('Scenario does not match this pair.');
  const armPath = join(directory, 'arm.json');
  const windowPath = join(directory, 'window.json');
  const sentPath = join(directory, 'sent.json');
  const resultPath = join(directory, 'result.json');

  if (command === 'arm') {
    requireRole('claude');
    if (!['codex-tools', 'codex-stop'].includes(run.mode)) throw new Error('arm applies only to codex-tools or codex-stop.');
    const deadline = Date.now() + 300000;
    if (!uuid.test(values['reply-to'] ?? '')) throw new Error('arm requires --reply-to with the received setup message UUID.');
    if (existsSync(armPath)) throw new Error('This run has already been armed. Create a new run instead of repeating it.');
    const arm = { runId: run.runId, pid: process.pid, phase: 'waiting-window', armedAt: new Date().toISOString() };
    save(armPath, arm);
    const workCommand = `node "${scriptPath}" work --run ${run.runId}`;
    const instructions = run.mode === 'codex-tools'
      ? 'After the work tool returns, first report P06-CODEX-TOOL-CHECKPOINT with the actual incoming marker, or NONE. ' +
        `Then run node "${scriptPath}" reverse --run ${run.runId} --to <incoming test message UUID>, ` +
        'run Get-Date -Format o, and end the turn with P06-CODEX-TOOL-DONE. Do not inspect message records before the checkpoint.'
      : 'After the signal tool returns, use no more tools and finish a short final summary of the verified prototype and remaining Stop question. ' +
        'A message will be sent after 5 seconds, during that generation if the timing window is captured. In the Stop continuation, first report its actual marker and finish without tools.';
    const ready = await send(`P06-SCENARIO-READY run=${run.runId} mode=${run.mode}. The original Claude session foreground tool is waiting. ` +
      `In the original Codex session run ${workCommand} with exec_command yield_time_ms=30000. ${instructions} ` +
      'Leave evidence inspection until the subsequent scenario-complete notice.', values['reply-to']);
    arm.readyMessageId = ready.messageId;
    save(armPath, arm);
    const window = await waitFor(() => optionalJson(windowPath), 'the Codex work window', deadline);
    if (window.runId !== run.runId || window.mode !== run.mode) throw new Error('Wrong work window.');
    await sleep(run.mode === 'codex-tools' ? 2000 : 5000);
    if (run.mode === 'codex-tools' && Date.now() >= Date.parse(window.plannedEndAt) - 3000) throw new Error('The tool window was missed. No test message was sent.');
    const marker = `${run.mode === 'codex-tools' ? 'P06-TOOL' : 'P06-STOP'}-${randomUUID().replaceAll('-', '')}`;
    const body = run.mode === 'codex-tools'
      ? `P06-TOOL-MESSAGE run=${run.runId} marker=${marker}. This was sent from the original Claude session during the Codex tool window. ` +
        'At the first continuation, report P06-CODEX-TOOL-CHECKPOINT with this marker, then perform the prepared reverse step and short action before P06-CODEX-TOOL-DONE. Do not read records to obtain the marker.'
      : `P06-STOP-MESSAGE run=${run.runId} marker=${marker}. This was sent from the original Claude session after the generation signal. ` +
        'At this first continuation report P06-STOP-CHECKPOINT with the actual marker, then finish with P06-STOP-DONE without tools. The receipt event must confirm Stop; this message alone does not prove the timing window.';
    const submittedAt = new Date().toISOString();
    const sent = await send(body);
    arm.phase = 'waiting-suppression';
    arm.testMessageId = sent.messageId;
    save(armPath, arm);
    save(sentPath, { runId: run.runId, marker, submittedAt, queuedAt: new Date().toISOString(), ...sent });
    const receipt = await waitFor(() => optionalJson(join(store.root, 'receipts', `${sent.messageId}.json`)), 'a Codex consumption record', deadline);
    let suppressed = false;
    if (receipt.hook !== 'UserPromptSubmit') {
      await waitFor(() => {
        const lines = readFileSync(join(store.root, 'events.jsonl'), 'utf8').split('\n');
        lines.pop();
        return lines.filter(Boolean).map(JSON.parse).find((event) => event.type === 'wake-suppressed' && event.messageId === sent.messageId);
      }, 'the actual old wake to be suppressed after Codex finishes', deadline);
      suppressed = true;
    }
    const complete = await send(`P06-SCENARIO-COMPLETE run=${run.runId} mode=${run.mode} testMessageId=${sent.messageId}. ` +
      `The consumption record reports hook=${receipt.hook}; oldWakeSuppressed=${suppressed}. This is a completion notice, not a pass verdict. ` +
      'Codex can now inspect the run records, receipt, queue, and original transcripts. For codex-tools also verify the Claude post-tool checkpoint for the reverse message. No reply to this notice is needed.', values['reply-to']);
    arm.phase = 'complete';
    arm.completedAt = new Date().toISOString();
    arm.receiptHook = receipt.hook;
    arm.oldWakeSuppressed = suppressed;
    arm.completeMessageId = complete.messageId;
    save(armPath, arm);
    console.log(JSON.stringify({ runId: run.runId, phase: 'complete', testMessageId: sent.messageId }));
    return;
  }

  if (command === 'work') {
    if (run.mode === 'claude-generation') {
      requireRole('claude');
      if (existsSync(windowPath)) throw new Error('Use each generation window once.');
      const startedAt = new Date().toISOString();
      const window = { runId: run.runId, mode: run.mode, pid: process.pid, startedAt, toolEndedAt: new Date().toISOString() };
      save(windowPath, window);
      console.log(JSON.stringify(window));
      return;
    }
    requireRole('codex');
    if (!existsSync(armPath) || existsSync(windowPath)) throw new Error('Wait for the armed sender and use this work window once.');
    const arm = readJson(armPath);
    if (arm.phase !== 'waiting-window') throw new Error('The sender is not waiting for a new window.');
    const startedAt = new Date().toISOString();
    const window = { runId: run.runId, mode: run.mode, pid: process.pid, startedAt, plannedEndAt: new Date(Date.now() + 20000).toISOString() };
    save(windowPath, window);
    if (run.mode === 'codex-tools') await sleep(20000);
    window.toolEndedAt = new Date().toISOString();
    save(windowPath, window);
    console.log(JSON.stringify(window));
    return;
  }

  if (command === 'watch') {
    requireRole('codex');
    if (run.mode !== 'claude-generation' || existsSync(sentPath)) throw new Error('watch applies once to claude-generation only.');
    const deadline = Date.now() + 300000;
    const window = await waitFor(() => optionalJson(windowPath), 'the Claude generation signal', deadline);
    if (window.runId !== run.runId || window.mode !== run.mode) throw new Error('Wrong generation window.');
    const delayMs = Number(values['delay-ms'] ?? '1200');
    if (!Number.isInteger(delayMs) || delayMs < 500 || delayMs > 30000) throw new Error('--delay-ms must be an integer from 500 through 30000.');
    const sendAt = Date.parse(window.toolEndedAt) + delayMs;
    if (Date.now() < sendAt) await sleep(sendAt - Date.now());
    const marker = `P06-CLAUDE-GEN-${randomUUID().replaceAll('-', '')}`;
    const submittedAt = new Date().toISOString();
    const sent = await send(`P06-CLAUDE-GEN-MESSAGE run=${run.runId} marker=${marker}. This was sent from Codex after your generation signal and before your long final summary was expected to finish. ` +
      'At your first context after the current generation, report P06-CLAUDE-GEN-CHECKPOINT with this actual marker, then run the provided record command once, and finish with P06-CLAUDE-GEN-DONE. Do not read scenario records to obtain the marker.');
    save(sentPath, { runId: run.runId, marker, submittedAt, queuedAt: new Date().toISOString(), ...sent });
    const result = await waitFor(() => optionalJson(resultPath), 'the Claude checkpoint result', deadline);
    const watch = { runId: run.runId, testMessageId: sent.messageId, resultRecordedAt: result.reportedAt, completedAt: new Date().toISOString() };
    save(join(directory, 'watch.json'), watch);
    console.log(JSON.stringify(watch));
    return;
  }

  if (command === 'record') {
    requireRole('claude');
    if (run.mode !== 'claude-generation' || existsSync(resultPath)) throw new Error('record applies once to claude-generation only.');
    if (!/^P06-CLAUDE-GEN-[0-9a-f]{32}$/.test(values.marker ?? '') || !uuid.test(values['message-id'] ?? '')) throw new Error('record requires the actual marker and received message UUID.');
    const message = store.message(values['message-id']);
    if (message.to?.tool !== 'claude' || message.to?.sessionId !== pair.claudeId || !message.body?.includes(values.marker)) throw new Error('The recorded message does not match this Claude session and marker.');
    const result = { runId: run.runId, marker: values.marker, messageId: values['message-id'], reportedAt: new Date().toISOString(), reportedBy: 'original-claude-session' };
    save(resultPath, result);
    console.log(JSON.stringify(result));
    return;
  }

  if (command === 'reverse') {
    requireRole('codex');
    const arm = readJson(armPath);
    if (run.mode !== 'codex-tools' || arm.phase !== 'waiting-suppression' || values.to !== arm.testMessageId) throw new Error('Reverse delivery requires the actual received tool-test message and a still-waiting Claude tool.');
    const marker = `P06-CLAUDE-TOOL-${randomUUID().replaceAll('-', '')}`;
    const sent = await send(`P06-REVERSE-TOOL run=${run.runId} marker=${marker}. This reply was sent while your original foreground scenario tool was still waiting. ` +
      'When that tool finishes, first report P06-CLAUDE-TOOL-CHECKPOINT with this marker from your actual context. Do not read scenario records to obtain it. Finish locally after the checkpoint; no bridge reply is needed.', values.to);
    save(join(directory, 'reverse.json'), { runId: run.runId, marker, sentAt: new Date().toISOString(), ...sent });
    console.log(JSON.stringify({ runId: run.runId, reverseMessageId: sent.messageId, submitted: true }));
    return;
  }
  throw new Error('Use create, arm, work, reverse, watch, or record.');
}

main().catch((error) => {
  if (uuid.test(values.run ?? '')) {
    const directory = join(store.root, 'scenarios', values.run);
    if (existsSync(directory)) {
      save(join(directory, `error-${process.pid}.json`), { at: new Date().toISOString(), step: positionals[0], error: error.message });
      const armPath = join(directory, 'arm.json');
      const arm = optionalJson(armPath);
      if (positionals[0] === 'arm' && arm?.pid === process.pid) save(armPath, { ...arm, phase: 'failed', error: error.message });
    }
  }
  process.stderr.write(`Scenario error: ${error.message}\n`);
  process.exitCode = 1;
});
