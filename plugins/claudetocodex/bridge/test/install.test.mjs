import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { commandString } from '../entry.mjs';

const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));

function install(t, hooksFile) {
  const result = spawnSync(process.execPath, [cli, 'install', '--hooks-file', hooksFile], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-bridge-install-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return { directory, hooksFile: join(directory, '.codex', 'hooks.json') };
}

test('install registers exactly three bridge hooks pointing at the installed CLI', (t) => {
  const { hooksFile } = setup(t);
  install(t, hooksFile);
  const config = JSON.parse(readFileSync(hooksFile, 'utf8'));
  const events = Object.keys(config.hooks);
  assert.deepEqual(events.sort(), ['PostToolUse', 'Stop', 'UserPromptSubmit']);
  const expected = `${commandString()} hook`;
  for (const event of ['PostToolUse', 'UserPromptSubmit', 'Stop']) {
    assert.equal(config.hooks[event].length, 1);
    const hook = config.hooks[event][0].hooks[0];
    assert.equal(hook.type, 'command');
    assert.equal(hook.command, expected);
    assert.equal(hook.timeout, 5);
    assert.equal(hook.async, false);
    if (event === 'Stop') assert.equal('additionalContextLimit' in hook, false);
    else assert.equal(hook.additionalContextLimit, 20000);
  }
  assert.equal(readFileSync(hooksFile, 'utf8').includes('IDEO'), false);
});

test('install is idempotent and replaces stale prototype hooks without touching foreign ones', (t) => {
  const { hooksFile } = setup(t);
  mkdirSync(join(hooksFile, '..'), { recursive: true });
  writeFileSync(hooksFile, `${JSON.stringify({
    description: 'Pre-existing project hooks.',
    hooks: {
      PostToolUse: [
        { matcher: 'Bash', hooks: [{ type: 'command', command: 'node "C:/somewhere/else/PostToolProbe.mjs"', timeout: 5, async: false }] },
        { hooks: [{ type: 'command', command: 'node "D:/ClaudeToCodex/IDEO/cross-session-agent-messaging/prototype/Bridge.mjs" hook', timeout: 5, async: false }] },
      ],
    },
  }, null, 2)}\n`);
  install(t, hooksFile);
  install(t, hooksFile);
  const config = JSON.parse(readFileSync(hooksFile, 'utf8'));
  assert.equal(config.description, 'Pre-existing project hooks.');
  const post = config.hooks.PostToolUse;
  assert.equal(post.length, 2);
  assert.deepEqual(post[0].matcher, 'Bash');
  assert.equal(post[0].hooks[0].command, 'node "C:/somewhere/else/PostToolProbe.mjs"');
  assert.equal(post[1].hooks.length, 1);
  assert.equal(post[1].hooks[0].command, `${commandString()} hook`);
  assert.equal(JSON.stringify(config).includes('Bridge.mjs'), false);
  for (const event of ['UserPromptSubmit', 'Stop']) assert.equal(config.hooks[event].length, 1);
});
