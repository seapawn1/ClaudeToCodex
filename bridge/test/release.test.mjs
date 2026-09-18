import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { buildZip, parseZip } from '../release/zip.mjs';

// Sprint 08 / D-E: the Node build/verify pair must reproduce the release
// package contract - manifest schema parity with 1.3.0, content exactly from
// git archive, a well-formed deflate zip (UTF-8 flag, timestamps, CRCs), and
// a read-only central-directory verification that fails loudly on any drift.
// python3 zipfile is the independent external validator.

const build = fileURLToPath(new URL('../release/build-release.mjs', import.meta.url));
const verify = fileURLToPath(new URL('../release/verify-release.mjs', import.meta.url));
const run = (script, args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 60000 });
// The build tool's contract is "content from a git checkout" - when this
// suite runs from an installed (non-repo) plugin cache, building is out of
// scope, not broken.
const inRepo = { skip: spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', cwd: fileURLToPath(new URL('../release', import.meta.url)) }).status === 0 ? false : 'release build requires a git checkout; running from an installed plugin cache' };

test('zip writer: UTF-8 flag, timestamps, CRC - round-trip and external validation', () => {
  // Zip timestamps are zone-less local fields (like other writers); construct
  // the fixture times with the local constructor so writer and the external
  // validator agree on the components.
  const stamp1 = new Date(2026, 8, 18, 12, 34, 56);
  const stamp2 = new Date(2026, 0, 2, 3, 4, 6);
  const entries = [
    { name: 'plain.txt', data: 'hello zip', mtime: stamp1 },
    { name: '中文/文件名.txt', data: 'UTF-8 名字与内容', mtime: stamp2 },
    { name: 'binary.bin', data: Buffer.from([0, 1, 2, 253, 254, 255].concat(Array.from({ length: 5000 }, (_, i) => i % 251))), mtime: stamp1 },
  ];
  const zip = buildZip(entries);
  const parsed = parseZip(zip);
  assert.equal(parsed.length, 3);
  for (const entry of parsed) {
    assert.equal(entry.flags & 0x0800, 0x0800, `UTF-8 flag must be set for ${entry.name}`);
    const expected = entries.find((candidate) => candidate.name === entry.name);
    assert.deepEqual(entry.data, Buffer.isBuffer(expected.data) ? expected.data : Buffer.from(expected.data));
  }
  // Byte-stable: same input, same archive.
  assert.deepEqual(buildZip(entries), zip);
  // External validator: structure, CRCs, timestamps, names all legible to an
  // independent zip implementation.
  const probe = spawnSync('python3', ['-c', [
    'import sys, zipfile, io',
    'z = zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))',
    'assert z.testzip() is None, "crc failure"',
    'assert z.read("plain.txt") == b"hello zip"',
    'assert z.read("中文/文件名.txt").decode("utf-8") == "UTF-8 名字与内容"',
    'assert z.getinfo("plain.txt").date_time == (2026, 9, 18, 12, 34, 56)',
    'assert z.getinfo("中文/文件名.txt").date_time == (2026, 1, 2, 3, 4, 6)',
    'print("PYTHON_ZIP_OK")',
  ].join('\n')], { input: zip, encoding: 'utf8', timeout: 30000 });
  assert.equal(probe.status, 0, probe.stderr);
  assert.equal(probe.stdout.includes('PYTHON_ZIP_OK'), true);
});

test('build + verify: real candidate from HEAD, manifest schema parity, package content change', inRepo, (t) => {
  const outDir = mkdtempSync(join(tmpdir(), 'ctc-release-test-'));
  t.after(() => rmSync(outDir, { recursive: true, force: true }));
  const version = '0.0.0-w7a';
  const built = run(build, ['--version', version, '--out-dir', outDir, '--mode', 'plugin']);
  assert.equal(built.status, 0, built.stderr);
  assert.match(built.stdout, /PRODUCT=claude-to-codex-plugin-0\.0\.0-w7a/);
  assert.match(built.stdout, /SOURCE_COMMIT=[0-9a-f]{40}/);

  // Manifest schema parity with the 1.3.0 release (same field set).
  const zipPath = join(outDir, `claude-to-codex-plugin-${version}.zip`);
  const files = new Map(parseZip(readFileSync(zipPath)).map((entry) => [entry.name, entry.data]));
  const manifest = JSON.parse(files.get('manifest.json').toString('utf8'));
  assert.deepEqual(Object.keys(manifest), ['product', 'version', 'sourceRef', 'sourceCommit', 'commitDate', 'fileCount', 'files']);
  assert.deepEqual(Object.keys(manifest.files[0]), ['path', 'sha256', 'bytes']);
  assert.equal(manifest.fileCount, manifest.files.length + 1);
  assert.equal(manifest.product, 'ClaudeToCodex');
  assert.equal(manifest.version, version);

  // Package content change vs 1.3.0: the retired delivery .ps1 must be gone,
  // the unified transport must be in, and the entry points unchanged in kind.
  const paths = manifest.files.map((file) => file.path);
  assert.equal(paths.some((p) => p.endsWith('.ps1') && p.includes('delivery')), false, 'delivery .ps1 must not ship');
  assert.equal(paths.includes('bridge/delivery/transport.mjs'), true);
  assert.equal(paths.includes('bridge/cli.mjs'), true);
  assert.equal(paths.includes('manifest.json'), false, 'manifest lists everything but itself');
  assert.equal(paths.includes('bridge/release/Test-Acceptance.ps1'), true, 'acceptance tool stays (W7b deferred)');
  assert.equal(paths.includes('RELEASE-NOTES.md'), true);
  assert.equal(paths.includes('skills/claudetocodex/SKILL.md'), true);
  assert.equal(paths.includes('.codex-plugin/plugin.json'), true);

  // Read-only verification through the central directory.
  const verified = run(verify, ['--path', zipPath]);
  assert.equal(verified.status, 0, verified.stdout + verified.stderr);
  assert.match(verified.stdout, /VERIFY=OK checked=\d+ extra=0/);

  // Sidecar hash matches the archive bytes.
  const sha = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
  const sidecar = readFileSync(join(outDir, `claude-to-codex-plugin-${version}.zip.sha256`), 'utf8');
  assert.match(sidecar, new RegExp(`^${sha}  claude-to-codex-plugin-${version}\\.zip`));

  // External validator over the real package.
  const probe = spawnSync('python3', ['-c', [
    'import sys, zipfile',
    `z = zipfile.ZipFile(${JSON.stringify(zipPath)})`,
    'assert z.testzip() is None, "crc failure"',
    'assert z.read("manifest.json").decode("utf-8").startswith("{")',
    'print("PYTHON_ZIP_OK")',
  ].join('\n')], { encoding: 'utf8', timeout: 30000 });
  assert.equal(probe.status, 0, probe.stderr);
});

test('verify fails loudly on tampered content (extracted-root mode)', inRepo, (t) => {
  const outDir = mkdtempSync(join(tmpdir(), 'ctc-release-tamper-'));
  t.after(() => rmSync(outDir, { recursive: true, force: true }));
  const version = '0.0.0-w7a-tamper';
  const built = run(build, ['--version', version, '--out-dir', outDir, '--mode', 'plugin']);
  assert.equal(built.status, 0, built.stderr);
  const stage = join(outDir, `claude-to-codex-plugin-${version}`);
  writeFileSync(join(stage, 'bridge', 'entry.mjs'), readFileSync(join(stage, 'bridge', 'entry.mjs'), 'utf8') + '\n// tampered\n');
  const verified = run(verify, ['--path', stage]);
  assert.equal(verified.status, 1);
  assert.match(verified.stdout, /MISMATCH bridge\/entry\.mjs/);
  assert.match(verified.stdout, /VERIFY=FAILED/);
});

test('verify rejects a corrupt archive instead of trusting it', (t) => {
  const zip = Buffer.from(buildZip([{ name: 'a.txt', data: 'x' }]));
  // Flip a byte inside the first entry's deflated payload (right after the
  // local header + name): the central-directory read must surface a failure
  // rather than pass.
  zip[38] ^= 0xff;
  assert.throws(() => parseZip(zip), /CRC|inflate|size|Local header|Corrupt/i);
});
