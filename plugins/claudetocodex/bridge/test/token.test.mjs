import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { sendClaudeMessage } from '../delivery/transport.mjs';
import { peerTokenForSession, selectSession } from '../sessions.mjs';

// Sprint 08 / W2 exit criteria (HOW §2): the four delivery-time races around
// D-B's live .key read by sessionId reverse-lookup, each pinned against the
// production path (default tokenLoader), plus the platform-branched session
// socket check (D-F). Fixtures use CTC_SESSIONS_DIR and the test process's own
// pid as the live registry identity; the synthesized Claude sessionId is a
// stand-in, and no real key material is involved.

const claudeId = '55555555-5555-4555-8555-555555555555';
const codexId = '66666666-6666-4666-8666-666666666666';
const fixtureToken = 'w2-fixture-peer-token';
const posixOnly = { skip: process.platform === 'win32' ? 'D-B live-read path is the POSIX branch; Windows DPAPI is exercised in W10 regression' : false };

function registryFixture(t, { files = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ctc-token-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), typeof content === 'string' ? content : JSON.stringify(content));
  }
  const previous = process.env.CTC_SESSIONS_DIR;
  process.env.CTC_SESSIONS_DIR = dir;
  t.after(() => {
    if (previous === undefined) delete process.env.CTC_SESSIONS_DIR;
    else process.env.CTC_SESSIONS_DIR = previous;
  });
  return dir;
}

// The default shape of a live registry entry for the test process's pid.
const liveRecord = (socketPath) => ({ pid: process.pid, name: 'w2-race-target', sessionId: claudeId, messagingSocketPath: socketPath, status: 'running', updatedAt: Date.now() });
const liveKey = () => ({ peerToken: fixtureToken, procStart: 0, pidDomain: 'test' });

async function deliverTo(t, directory, socketPath, { tokenLoader } = {}) {
  const work = mkdtempSync(join(tmpdir(), 'ctc-token-work-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const endpointPath = join(work, 'endpoint.json');
  writeFileSync(endpointPath, JSON.stringify({
    schema: 1, sessionId: claudeId, socket: socketPath, registeredAt: 'test', cwd: 'test',
  }));
  const messageId = randomUUID();
  const bodyPath = join(work, 'body.txt');
  writeFileSync(bodyPath, 'race fixture body');
  const recordPath = join(work, 'wire', `${messageId}.send.json`);
  try {
    await sendClaudeMessage({
      endpointPath, replyThreadId: codexId, messageFile: bodyPath, messageId, recordPath,
      ...(tokenLoader ? { tokenLoader } : {}),
    });
    return { ok: true, record: JSON.parse(readFileSync(recordPath, 'utf8')) };
  } catch (error) {
    const record = JSON.parse(readFileSync(recordPath, 'utf8'));
    return { ok: false, error: error.message, record };
  }
}

test('D-B live read: token comes from the registry at send time, nothing secret lands in any bridge file', posixOnly, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-token-happy-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const registry = join(directory, 'registry');
  mkdirSync(registry);
  const socketPath = join(directory, 'peer.sock');
  const frames = [];
  const server = createServer((socket) => {
    let buffered = '';
    socket.setEncoding('utf8').on('data', (data) => {
      buffered += data;
      let end;
      while ((end = buffered.indexOf('\n')) !== -1) {
        frames.push(JSON.parse(buffered.slice(0, end)));
        buffered = buffered.slice(end + 1);
      }
    });
  });
  await new Promise((resolve) => server.listen(socketPath, resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const previous = process.env.CTC_SESSIONS_DIR;
  process.env.CTC_SESSIONS_DIR = registry;
  t.after(() => { delete process.env.CTC_SESSIONS_DIR; if (previous !== undefined) process.env.CTC_SESSIONS_DIR = previous; });
  writeFileSync(join(registry, `${process.pid}.json`), JSON.stringify(liveRecord(socketPath)));
  writeFileSync(join(registry, `${process.pid}.deadbeef.key`), JSON.stringify(liveKey()));

  const result = await deliverTo(t, directory, socketPath);
  assert.ok(result.ok, result.error);
  assert.equal(frames.length, 2);
  assert.deepEqual(frames[0], { type: 'auth', token: fixtureToken });
  assert.equal(frames[1].session_id, claudeId);
  assert.equal(result.record.pipeWrite, 'completed');
  // Zero secret at rest: the wire record never contains the token that was
  // read live (endpoint and body live in the throwaway temp dir).
  assert.equal(JSON.stringify(result.record).includes(fixtureToken), false);
});

test('race 1 - stale record: a dead session\'s registry entry fails honestly without touching the wire', posixOnly, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-token-stale-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const registry = join(directory, 'registry');
  mkdirSync(registry);
  const previous = process.env.CTC_SESSIONS_DIR;
  process.env.CTC_SESSIONS_DIR = registry;
  t.after(() => { delete process.env.CTC_SESSIONS_DIR; if (previous !== undefined) process.env.CTC_SESSIONS_DIR = previous; });
  // A pid that exists as a number but no live process owns (guarded range).
  const deadPid = 3999999;
  writeFileSync(join(registry, `${deadPid}.json`), JSON.stringify({ ...liveRecord('/gone/sock'), pid: deadPid }));
  writeFileSync(join(registry, `${deadPid}.cafe.key`), JSON.stringify(liveKey()));

  const result = await deliverTo(t, directory, '/gone/sock');
  assert.equal(result.ok, false);
  assert.match(result.error, /no longer running/);
  assert.equal(result.record.pipeWrite, 'not-completed');
  assert.equal(result.record.receipt, 'unverified');
  assert.ok(result.record.error);
});

test('race 2a - key missing: a matching record without a peer key file fails explicitly', posixOnly, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-token-nokey-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const registry = join(directory, 'registry');
  mkdirSync(registry);
  const previous = process.env.CTC_SESSIONS_DIR;
  process.env.CTC_SESSIONS_DIR = registry;
  t.after(() => { delete process.env.CTC_SESSIONS_DIR; if (previous !== undefined) process.env.CTC_SESSIONS_DIR = previous; });
  writeFileSync(join(registry, `${process.pid}.json`), JSON.stringify(liveRecord('/tmp/never-listened.sock')));

  const result = await deliverTo(t, directory, '/tmp/never-listened.sock');
  assert.equal(result.ok, false);
  assert.match(result.error, /no peer key file/);
  assert.equal(result.record.pipeWrite, 'not-completed');
});

test('race 2b - key half-written: invalid registry JSON is reported as possibly mid-write, never echoed', posixOnly, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-token-halfkey-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const registry = join(directory, 'registry');
  mkdirSync(registry);
  const previous = process.env.CTC_SESSIONS_DIR;
  process.env.CTC_SESSIONS_DIR = registry;
  t.after(() => { delete process.env.CTC_SESSIONS_DIR; if (previous !== undefined) process.env.CTC_SESSIONS_DIR = previous; });
  writeFileSync(join(registry, `${process.pid}.json`), JSON.stringify(liveRecord('/tmp/never-listened.sock')));
  writeFileSync(join(registry, `${process.pid}.partial.key`), '{"peerToken":"trunc');

  const result = await deliverTo(t, directory, '/tmp/never-listened.sock');
  assert.equal(result.ok, false);
  assert.match(result.error, /not valid registry JSON/);
  assert.match(result.error, /possibly mid-write/);
  // The half-written key content is never echoed into the error or record.
  assert.equal(result.error.includes('trunc'), false);
  assert.equal(JSON.stringify(result.record).includes('trunc'), false);
  assert.equal(result.record.pipeWrite, 'not-completed');
});

test('race 3 - pid reuse: a record under another sessionId is never mistaken for the target', posixOnly, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-token-reuse-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const registry = join(directory, 'registry');
  mkdirSync(registry);
  const previous = process.env.CTC_SESSIONS_DIR;
  process.env.CTC_SESSIONS_DIR = registry;
  t.after(() => { delete process.env.CTC_SESSIONS_DIR; if (previous !== undefined) process.env.CTC_SESSIONS_DIR = previous; });
  // Same pid, DIFFERENT session: a reused pid now owning someone else's session.
  const otherId = '77777777-7777-4777-8777-777777777777';
  writeFileSync(join(registry, `${process.pid}.json`), JSON.stringify({ ...liveRecord('/tmp/other.sock'), sessionId: otherId }));
  writeFileSync(join(registry, `${process.pid}.reuse.key`), JSON.stringify({ ...liveKey(), peerToken: 'other-session-token' }));

  const result = await deliverTo(t, directory, '/tmp/never-listened.sock');
  assert.equal(result.ok, false);
  assert.match(result.error, /No Claude session record in the registry matches/);
  assert.equal(result.error.includes(claudeId), true);
  // The other session's key never leaks into the failure path.
  assert.equal(result.error.includes('other-session-token'), false);
  assert.equal(result.record.pipeWrite, 'not-completed');
  // Direct unit check of the reverse-lookup contract: by sessionId, not pid.
  assert.throws(() => peerTokenForSession(claudeId, registry), /matches session/);
  assert.equal(peerTokenForSession(otherId, registry), 'other-session-token');
});

test('race 4 - death mid-send: the peer dying after auth leaves not-completed evidence, no retry', posixOnly, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-token-death-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const registry = join(directory, 'registry');
  mkdirSync(registry);
  const socketPath = join(directory, 'peer.sock');
  const lines = [];
  const server = createServer((socket) => {
    let buffered = '';
    socket.setEncoding('utf8').on('data', (data) => {
      buffered += data;
      let end;
      while ((end = buffered.indexOf('\n')) !== -1) {
        lines.push(JSON.parse(buffered.slice(0, end)));
        buffered = buffered.slice(end + 1);
        socket.destroy();
      }
    });
  });
  await new Promise((resolve) => server.listen(socketPath, resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const previous = process.env.CTC_SESSIONS_DIR;
  process.env.CTC_SESSIONS_DIR = registry;
  t.after(() => { delete process.env.CTC_SESSIONS_DIR; if (previous !== undefined) process.env.CTC_SESSIONS_DIR = previous; });
  writeFileSync(join(registry, `${process.pid}.json`), JSON.stringify(liveRecord(socketPath)));
  writeFileSync(join(registry, `${process.pid}.race4.key`), JSON.stringify(liveKey()));

  const result = await deliverTo(t, directory, socketPath);
  assert.equal(result.ok, false);
  assert.match(result.error, /Claude pipe write failed/);
  assert.equal(result.record.pipeWrite, 'not-completed');
  assert.equal(result.record.receipt, 'unverified');
  // The live token read succeeded, auth went out exactly once, then the peer
  // died: no retry, no completed claim.
  assert.deepEqual(lines, [{ type: 'auth', token: fixtureToken }]);
});

test('D-F selectSession: the socket shape must be platform-native', posixOnly, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-token-df-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const write = (socket) => {
    mkdirSync(directory, { recursive: true });
    for (const file of readdirSync(directory)) rmSync(join(directory, file));
    writeFileSync(join(directory, `${process.pid}.json`), JSON.stringify(liveRecord(socket)));
    writeFileSync(join(directory, `${process.pid}.df.key`), JSON.stringify(liveKey()));
  };
  write('/native/uds.sock');
  const session = selectSession('w2-race-target', directory);
  assert.equal(session.socket, '/native/uds.sock');
  write('\\\\.\\pipe\\windows-shape');
  assert.throws(() => selectSession('w2-race-target', directory), /no Unix domain socket endpoint/);
});

test('SM F-5: duplicate live records for one sessionId resolve to the newest updatedAt, deterministically', posixOnly, async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'ctc-token-dup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  // Two LIVE processes (this test and its parent) both claiming the same
  // session, as restart overlap or a fork can produce. Whichever record is
  // newer must win, regardless of directory enumeration order.
  const records = [
    { pid: process.pid, token: 'token-a' },
    { pid: process.ppid, token: 'token-b' },
  ];
  const write = (newerPid) => {
    for (const { pid, token } of records) {
      writeFileSync(join(directory, `${pid}.json`), JSON.stringify({ ...liveRecord('/native/sock'), pid, updatedAt: pid === newerPid ? 2000 : 1000 }));
      writeFileSync(join(directory, `${pid}.dup.key`), JSON.stringify({ ...liveKey(), peerToken: token }));
    }
  };
  write(process.ppid);
  assert.equal(peerTokenForSession(claudeId, directory), 'token-b');
  write(process.pid);
  assert.equal(peerTokenForSession(claudeId, directory), 'token-a');
});
