import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { dataBaseDir, defaultRoot, renderPeer, wakeText } from '../store.mjs';
import { rootsParent } from '../roots.mjs';
import { commandString } from '../entry.mjs';

// Sprint 08 / W4: the shared data-location rule (D-C) and the platform-native
// reply-entry prefix (D-D). All three former copies of the location rule
// (store.defaultRoot, roots.defaultRootOf, roots.rootsParent) now derive from
// one helper, so they are asserted together against the same fixture env.

test('D-C data base dir: XDG data home on POSIX, one rule for store and roots', { skip: process.platform === 'win32' ? 'POSIX branch; Windows keeps %LOCALAPPDATA% and is exercised in W10 regression' : false }, () => {
  assert.equal(dataBaseDir({}), join(homedir(), '.local', 'share', 'ClaudeToCodex'));
  assert.equal(dataBaseDir({ XDG_DATA_HOME: '/xdg/data' }), '/xdg/data/ClaudeToCodex');
  // The env-parameterized helpers stay test-only surfaces: the real lookup
  // reads the live process env.
  assert.equal(dataBaseDir({ XDG_DATA_HOME: '' }), join(homedir(), '.local', 'share', 'ClaudeToCodex'));
  assert.equal(rootsParent({ XDG_DATA_HOME: '/xdg/data' }), dataBaseDir({ XDG_DATA_HOME: '/xdg/data' }));
});

test('D-C default root: CTC_BRIDGE_DIR override wins, base dir plus bridge otherwise', () => {
  const previous = process.env.CTC_BRIDGE_DIR;
  const previousXdg = process.env.XDG_DATA_HOME;
  try {
    process.env.CTC_BRIDGE_DIR = '/isolated/root';
    assert.equal(defaultRoot(), '/isolated/root');
    delete process.env.CTC_BRIDGE_DIR;
    process.env.XDG_DATA_HOME = '/xdg/data';
    if (process.platform === 'win32') {
      assert.equal(defaultRoot(), join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'ClaudeToCodex', 'bridge'));
    } else {
      assert.equal(defaultRoot(), '/xdg/data/ClaudeToCodex/bridge');
    }
  } finally {
    if (previous === undefined) delete process.env.CTC_BRIDGE_DIR;
    else process.env.CTC_BRIDGE_DIR = previous;
    if (previousXdg === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previousXdg;
  }
});

test('D-D renderPeer emits a POSIX-executable reply prefix with quote escaping', { skip: process.platform === 'win32' ? 'POSIX branch; the $env: form is exercised in W10 regression' : false }, () => {
  const message = { id: '99999999-9999-4999-8999-999999999999', body: 'peer content' };
  const rendered = renderPeer(message, '/plain/root', null, true);
  const command = commandString();
  // Plain path: assignments prefix the node command, single-quoted.
  assert.ok(rendered.includes(`CTC_BRIDGE_DIR='/plain/root' ${command} reply --to 99999999-9999-4999-8999-999999999999`), rendered);
  assert.equal(rendered.includes('$env:'), false);
  // A path containing a single quote survives as a valid shell token.
  const quoted = renderPeer(message, "/ro'ot", null, true);
  assert.ok(quoted.includes(`CTC_BRIDGE_DIR='/ro'\\''ot' ${command}`), quoted);
  // codexHome rides along in the same dialect.
  const withHome = renderPeer(message, '/plain/root', '/codex/home', true);
  assert.ok(withHome.includes(`CTC_BRIDGE_DIR='/plain/root' CODEX_HOME='/codex/home' ${command}`), withHome);
  // The full-body variant carries the same reply entry after the message JSON.
  const full = renderPeer(message, '/plain/root', null, false);
  assert.ok(full.includes(`CTC_BRIDGE_DIR='/plain/root' ${command} reply`));
  assert.ok(full.includes('"body": "peer content"'));
});

test('wake text shape is platform-independent', () => {
  const text = wakeText('11111111-1111-4111-8111-111111111111', '99999999-9999-4999-8999-999999999999', 'body line', '2026-09-18T00:00:00.000Z');
  assert.ok(text.startsWith('[Source: bridge message | 2026-09-18T00:00:00.000Z]'));
  assert.ok(text.includes('body line'));
  assert.ok(text.endsWith('[CTC-WAKE 11111111-1111-4111-8111-111111111111 99999999-9999-4999-8999-999999999999]'));
});
