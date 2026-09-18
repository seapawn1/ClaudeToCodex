#!/usr/bin/env node
// Build a ClaudeToCodex release ZIP from a Git ref (Node port of Build-Release.ps1).
// Usage: node bridge/release/build-release.mjs [--ref HEAD] [--version 1.3.0]
//          [--out-dir <dir>] [--mode plugin|bridge]
// plugin mode (default): the ZIP root IS the plugin tree (extract anywhere and
//   it is a valid plugin root) plus RELEASE-NOTES.md; the install entry is the
//   GitHub marketplace.
// bridge mode (legacy, kept for the superseded ZIP candidate): INSTALL.md +
//   RELEASE-NOTES.md + bridge/.
// Both generate manifest.json (per-file SHA256, source commit) and a .sha256
// sidecar. Content comes from `git archive` of the ref, so the package is
// exactly the committed tree - no working-tree drift.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildZip } from './zip.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));

function git(args, options = {}) {
  const result = spawnSync('git', args, { cwd: options.cwd ?? scriptDir, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

// Minimal ustar parser for `git archive` output: 512-byte headers, octal
// sizes, optional prefix field. Only regular files are of interest here.
function parseTar(buffer) {
  const text = (buf) => buf.toString('utf8').replace(/\0.*$/s, '');
  const files = [];
  let i = 0;
  while (i + 512 <= buffer.length) {
    const header = buffer.subarray(i, i + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = text(header.subarray(0, 100));
    const size = parseInt(text(header.subarray(124, 136)) || '0', 8) || 0;
    const type = String.fromCharCode(header[156]);
    const prefix = text(header.subarray(345, 500));
    if (type === '0' || type === '\0') {
      files.push({ path: prefix ? `${prefix}/${name}` : name, data: buffer.subarray(i + 512, i + 512 + size) });
    }
    i += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

const { values } = parseArgs({
  options: {
    ref: { type: 'string', default: 'HEAD' },
    version: { type: 'string', default: '1.0.0' },
    'out-dir': { type: 'string' },
    mode: { type: 'string', default: 'plugin' },
  },
});
if (!['plugin', 'bridge'].includes(values.mode)) throw new Error('mode must be plugin or bridge');

const repoRoot = git(['rev-parse', '--show-toplevel']);
const ref = values.ref;
const commit = git(['rev-parse', '--verify', `${ref}^{commit}`], { cwd: repoRoot });
const commitDate = git(['show', '-s', '--format=%cI', commit], { cwd: repoRoot });
const productName = `claude-to-codex${values.mode === 'plugin' ? '-plugin' : ''}-${values.version}`;
const outDir = values['out-dir'] ?? join(tmpdir(), `claude-to-codex-release-${values.version}`);
const stage = join(outDir, productName);

mkdirSync(stage, { recursive: true });
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

const archivePath = join(outDir, 'src-archive.tar');
const paths = values.mode === 'plugin'
  ? ['RELEASE-NOTES.md', 'plugins/claudetocodex']
  : ['INSTALL.md', 'RELEASE-NOTES.md', 'bridge'];
const archiveResult = spawnSync('git', ['-C', repoRoot, 'archive', '--format=tar', `--output=${archivePath}`, ref, '--', ...paths], { encoding: 'utf8' });
if (archiveResult.status !== 0) throw new Error(`git archive failed: ${archiveResult.stderr.trim()}`);
const archived = parseTar(readFileSync(archivePath));
rmSync(archivePath, { force: true });

// plugin mode: the plugin tree becomes the ZIP root (strip the leading
// plugins/claudetocodex/) plus RELEASE-NOTES.md; bridge mode keeps its paths.
for (const file of archived) {
  let rel = file.path;
  if (values.mode === 'plugin') {
    const inner = file.path.replace(/^plugins\/claudetocodex\//, '');
    if (inner === file.path && file.path !== 'RELEASE-NOTES.md') continue;
    rel = inner;
  }
  const target = join(stage, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, file.data);
}

const entries = archived
  .filter((file) => (values.mode === 'plugin'
    ? file.path.startsWith('plugins/claudetocodex/') || file.path === 'RELEASE-NOTES.md'
    : true))
  .map((file) => {
    const rel = values.mode === 'plugin'
      ? file.path.replace(/^plugins\/claudetocodex\//, '')
      : file.path;
    return { path: rel, sha256: createHash('sha256').update(file.data).digest('hex'), bytes: file.data.length, data: file.data };
  })
  .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

const manifest = {
  product: 'ClaudeToCodex',
  version: values.version,
  sourceRef: ref,
  sourceCommit: commit,
  commitDate,
  fileCount: entries.length + 1, // + manifest.json itself
  files: entries.map(({ path, sha256, bytes }) => ({ path, sha256, bytes })),
};
writeFileSync(join(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
// The zip reads staged files back so the manifest's hash coverage and the
// archive content provably come from the same bytes. Every entry carries the
// source commit's UTC timestamp, so rebuilding the same ref yields the same
// archive bytes on any machine (byte-reproducible per source commit).
const commitStamp = new Date(commitDate);
const zipEntries = entries.map(({ path, data }) => ({ name: path, data, mtime: commitStamp }))
  .concat([{ name: 'manifest.json', data: readFileSync(join(stage, 'manifest.json')), mtime: commitStamp }]);

const zipPath = join(outDir, `${productName}.zip`);
writeFileSync(zipPath, buildZip(zipEntries, { utc: true }));
const zipHash = createHash('sha256').update(readFileSync(zipPath)).digest('hex');
writeFileSync(join(outDir, `${productName}.zip.sha256`), `${zipHash}  ${productName}.zip\n`);

process.stdout.write(`PRODUCT=${productName}\n`);
process.stdout.write(`MODE=${values.mode}\n`);
process.stdout.write(`SOURCE_REF=${ref}\n`);
process.stdout.write(`SOURCE_COMMIT=${commit}\n`);
process.stdout.write(`ZIP=${zipPath}\n`);
process.stdout.write(`ZIP_SHA256=${zipHash}\n`);
process.stdout.write(`MANIFEST_FILES=${entries.length + 1} (incl. manifest.json)\n`);
