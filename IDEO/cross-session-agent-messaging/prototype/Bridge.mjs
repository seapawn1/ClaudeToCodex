import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify, parseArgs } from 'node:util';
import { BridgeStore, handleHook, readJson, renderPeer, wakeText } from './BridgeStore.mjs';

const execute = promisify(execFile);
const directory = fileURLToPath(new URL('.', import.meta.url));

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      codex: { type: 'string' }, 'claude-endpoint': { type: 'string' },
      body: { type: 'string' }, 'body-file': { type: 'string' }, to: { type: 'string' },
    },
  });
  const [command] = positionals;
  if (positionals.length !== 1) throw new Error('Use pair, send, reply, status, or hook.');
  const store = new BridgeStore();
  if (command === 'hook') {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    process.stdout.write(`${JSON.stringify(handleHook(store, JSON.parse(input)))}\n`);
    return;
  }
  if (command === 'pair') {
    if (!values.codex || !values['claude-endpoint']) throw new Error('pair requires --codex and --claude-endpoint.');
    console.log(JSON.stringify(store.pair(values.codex, values['claude-endpoint']), null, 2));
    return;
  }
  if (command === 'status') {
    const pair = store.getPair();
    const pendingPath = join(store.root, 'pending', pair.codexId, 'message.json');
    const pending = existsSync(pendingPath) ? readJson(pendingPath) : null;
    const eventPath = join(store.root, 'events.jsonl');
    const events = existsSync(eventPath)
      ? readFileSync(eventPath, 'utf8').trim().split('\n').filter(Boolean).slice(-12).map(JSON.parse) : [];
    console.log(JSON.stringify({ pair, pendingMessageId: pending?.id ?? null, events }, null, 2));
    return;
  }
  if (!['send', 'reply'].includes(command)) throw new Error('Use pair, send, reply, status, or hook.');
  if ((values.body === undefined) === (values['body-file'] === undefined)) {
    throw new Error('Supply exactly one of --body or --body-file.');
  }
  if (command === 'reply' && !values.to) throw new Error('reply requires --to <received message UUID>.');
  if (command === 'send' && values.to) throw new Error('Use reply to reference a received message.');
  const body = values['body-file'] ? readFileSync(values['body-file'], 'utf8').replace(/^\uFEFF/, '') : values.body;
  const pair = store.getPair();
  const message = store.prepare(store.caller(), body, command === 'reply' ? values.to : null);
  try {
    if (message.to.tool === 'codex') {
      store.publish(message);
      const result = await execute('powershell.exe', [
        '-NoProfile', '-File', join(directory, 'BridgeQueue.ps1'),
        '-ThreadId', pair.codexId, '-Wake', wakeText(pair.id, message.id),
      ], { windowsHide: true, timeout: 15000 });
      store.event('wake-submitted', { messageId: message.id, output: result.stdout.trim() });
    } else {
      const endpoint = readJson(pair.endpointPath);
      if (endpoint.sessionId !== pair.claudeId) throw new Error('Claude endpoint identity changed.');
      const wirePath = join(store.root, 'wire', `${message.id}.txt`);
      writeFileSync(wirePath, renderPeer(message), { flag: 'wx' });
      await execute('powershell.exe', [
        '-NoProfile', '-File', join(directory, 'Send-ClaudeProbe.ps1'),
        '-EndpointPath', pair.endpointPath, '-ReplyThreadId', pair.codexId,
        '-MessageFile', wirePath, '-MessageId', message.id,
      ], { windowsHide: true, timeout: 15000 });
      store.event('pipe-written', { messageId: message.id });
    }
  } catch (error) {
    store.event('send-error', { messageId: message.id, error: error.message });
    throw new Error(`Message ${message.id}: ${error.message}. Inspect status before retrying; it may already be pending or consumed.`);
  }
  console.log(JSON.stringify({ messageId: message.id, conversationId: message.conversationId, to: message.to, submitted: true, receipt: 'unverified' }));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`Bridge error: ${error.message}\n`);
    process.exitCode = 1;
  });
}
