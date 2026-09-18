import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { connect } from 'node:net';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import { atomicWriteJson, readJson } from '../store.mjs';

// Sprint 08 / D-A: one Node transport for both platforms - Linux connects to the
// session's Unix domain socket, Windows to its named pipe (net.connect accepts
// \\.\pipe\ names as the path on win32). Wire behavior is ported from the retired
// Send-ClaudePipe.ps1: auth line, 500ms gap, LF-newline msgV frame, and the
// wire/<id>.send.json double-write contract (a first not-completed record before
// any network I/O, rewritten in the exit path) so a crashed attempt leaves
// evidence. Equivalence points ①-⑤ are pinned by test/transport.test.mjs.

const execute = promisify(execFile);
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export const AUTH_TO_FRAME_GAP_MS = 500;
export const CONNECT_TIMEOUT_MS = 5000;
export const DELIVERY_BUDGET_MS = 15000;

function uuid(value, label) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error(`Expected an exact ${label} UUID.`);
  return value.toLowerCase();
}

// Same validation the PowerShell client enforced, platform-branched: the
// endpoint's socket must be a named pipe on Windows and an absolute path (UDS)
// elsewhere.
function validateEndpoint(endpoint) {
  if (endpoint?.schema !== 1 || !UUID.test(endpoint?.sessionId ?? '') ||
    typeof endpoint.socket !== 'string' || !endpoint.tokenProtected) {
    throw new Error('Invalid Claude endpoint registration.');
  }
  const namedPipe = endpoint.socket.startsWith('\\\\.\\pipe\\');
  if (process.platform === 'win32' ? !namedPipe : namedPipe || !endpoint.socket.startsWith('/')) {
    throw new Error('Invalid Claude endpoint registration.');
  }
}

// Windows keeps DPAPI at rest (D-B): the stored blob is unwrapped through a
// minimal inline powershell call. The blob travels via process environment,
// never the command line; stdout is captured into memory and discarded after
// use; records, errors, and logs never echo key material.
async function unwrapTokenWindows(endpoint) {
  let plain;
  try {
    plain = (await execute('powershell.exe', [
      '-NoProfile', '-Command',
      '$s = ConvertTo-SecureString -String $env:CTC_PEER_KEY; [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))',
    ], { windowsHide: true, timeout: 15000, env: { ...process.env, CTC_PEER_KEY: endpoint.tokenProtected } })).stdout.trim();
  } catch {
    throw new Error('DPAPI unwrap of the peer key failed; no key material is included in this message.');
  }
  if (!plain) throw new Error('DPAPI unwrap returned an empty token.');
  return plain;
}

// Token acquisition is platform-branched (D-B): Windows unwraps the DPAPI blob
// stored in the endpoint record; Linux keeps zero secret at rest in the bridge
// root and reads the live registry peer key by sessionId at send time (W2).
export async function resolveEndpointToken(endpoint) {
  if (process.platform === 'win32') return unwrapTokenWindows(endpoint);
  throw new Error('Peer token resolution on this platform is delivered by the W2 slice (live .key read by sessionId).');
}

const delay = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// Turns the socket's async 'error' event into a racing promise so EPIPE and
// friends surface wherever the delivery currently waits.
const onSocketError = (socket) => new Promise((_, reject) => { socket.once('error', reject); });

// Self-built connect timeout ④: NamedPipeClientStream.Connect(5000) had one, so
// the unified path enforces its own instead of relying on OS defaults.
function connectSocket(socketPath, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = connect({ path: socketPath });
    const timer = setTimeout(() => {
      const error = new Error(`Connect timed out after ${timeoutMs}ms.`);
      error.code = 'ETIMEDOUT-CONNECT';
      socket.destroy();
      reject(error);
    }, timeoutMs);
    socket.once('connect', () => { clearTimeout(timer); resolve(socket); });
    socket.once('error', (error) => { clearTimeout(timer); reject(error); });
  });
}

// ③ completed is only claimed after the frame write callback and a finished
// end()/close - AutoFlush in the old client, made explicit here.
function writeLine(socket, payload) {
  return new Promise((resolve, reject) => {
    socket.write(`${payload}\n`, 'utf8', (error) => (error ? reject(error) : resolve()));
  });
}

function endSocket(socket) {
  return new Promise((resolve) => {
    if (socket.destroyed || socket.closed) return resolve();
    socket.once('close', () => resolve());
    socket.end();
  });
}

// ⑤ honest error taxonomy. Messages describe transport conditions only; none of
// them asserts anything about token validity, so a delivery error stays
// indistinguishable from an unverified one and nothing is retried implicitly.
function describeDeliveryError(error, budgetMs) {
  switch (error?.code) {
    case 'ETIMEDOUT-CONNECT': return error.message;
    case 'ETIMEDOUT-BUDGET': return `Delivery budget (${budgetMs}ms) exceeded before completion.`;
    case 'ENOENT': return 'Nothing is listening at the recorded endpoint (ENOENT): the socket file is gone; the receiving session likely exited.';
    case 'ECONNREFUSED': return 'Connection refused (ECONNREFUSED): no listener accepted the connection; the receiving session likely exited or its socket is stale.';
    case 'EPIPE': return 'Broken pipe (EPIPE): the receiving session closed the connection mid-delivery.';
    default: return `${error?.code ? `${error.code} ` : ''}${error?.message ?? 'unknown delivery error'}`;
  }
}

// Same contract Send-ClaudePipe.ps1 fulfilled, as one in-process call. Throws
// (with the record already on disk) when delivery did not complete; resolves
// with { recordPath, record } when the frame was written and the socket closed
// cleanly. Receipt stays 'unverified' either way - only the receiving original
// session can prove it.
export async function sendClaudeMessage(options) {
  const {
    endpointPath, replyThreadId, messageFile, messageId, recordPath,
    tokenLoader = resolveEndpointToken,
    connectTimeoutMs = CONNECT_TIMEOUT_MS, gapMs = AUTH_TO_FRAME_GAP_MS, budgetMs = DELIVERY_BUDGET_MS,
  } = options;
  uuid(replyThreadId, 'thread');
  uuid(messageId, 'message');
  const endpoint = readJson(endpointPath);
  validateEndpoint(endpoint);
  // ReadAllText in the old client consumed a BOM if present; match that.
  const message = readFileSync(messageFile, 'utf8').replace(/^﻿/, '');
  if (!message.trim()) throw new Error('Bridge message text is empty.');
  // Peer messages are fixed to priority=next: the recipient's current output
  // finishes completely and the message enters at the next context opportunity.
  const priority = 'next';
  const frame = {
    msgV: 1, msg_id: messageId, type: 'user',
    message: { role: 'user', content: message },
    priority, session_id: endpoint.sessionId,
  };
  const record = {
    direction: 'codex-to-claude', messageId, priority,
    senderThreadId: replyThreadId, recipientSessionId: endpoint.sessionId, message,
    pipeWriteStartedAt: new Date().toISOString(), pipeWriteFinishedAt: null,
    pipeWrite: 'not-completed', receipt: 'unverified', error: null,
  };
  // ② attempt evidence first: the record exists on disk before any network I/O.
  mkdirSync(dirname(recordPath), { recursive: true });
  atomicWriteJson(recordPath, record);

  let socket = null;
  // ④ overall watchdog, the in-process replacement of the 15s process timeout
  // the caller used to enforce around the PowerShell client.
  let budgetTimer = null;
  const budgetExceeded = new Promise((_, reject) => {
    budgetTimer = setTimeout(() => {
      const error = new Error('delivery budget exceeded');
      error.code = 'ETIMEDOUT-BUDGET';
      if (socket) socket.destroy();
      reject(error);
    }, budgetMs);
  });
  try {
    const deliver = (async () => {
      const token = await tokenLoader(endpoint, endpointPath);
      socket = await connectSocket(endpoint.socket, connectTimeoutMs);
      const failed = onSocketError(socket);
      await Promise.race([writeLine(socket, JSON.stringify({ type: 'auth', token })), failed]);
      await Promise.race([delay(gapMs), failed]);
      await Promise.race([writeLine(socket, JSON.stringify(frame)), failed]);
      record.pipeWrite = 'completed';
      await Promise.race([endSocket(socket), failed]);
    })();
    await Promise.race([deliver, budgetExceeded]);
  } catch (error) {
    record.pipeWrite = 'not-completed';
    record.error = describeDeliveryError(error, budgetMs);
  } finally {
    clearTimeout(budgetTimer);
    if (socket && !socket.destroyed) socket.destroy();
    record.pipeWriteFinishedAt = new Date().toISOString();
    atomicWriteJson(recordPath, record);
  }
  if (record.error) {
    const error = new Error(`Claude pipe write failed: ${record.error}`);
    error.recordPath = recordPath;
    throw error;
  }
  return { recordPath, record };
}
