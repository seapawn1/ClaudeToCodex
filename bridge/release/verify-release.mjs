#!/usr/bin/env node
// Verify a ClaudeToCodex release package against its manifest.json
// (Node port of Verify-Release.ps1).
// Usage: node bridge/release/verify-release.mjs --path <extracted-root | zip>
// A zip is verified read-only through its central directory (entries are
// inflated and CRC-checked in memory, nothing is extracted); an extracted
// root is verified by walking the tree. Recomputes each file's SHA256 and
// compares with manifest.json; prints version, source ref/commit and
// per-file result. Exit code 1 on any mismatch.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { parseZip } from './zip.mjs';

const { values } = parseArgs({ options: { path: { type: 'string' } } });
if (!values.path) throw new Error('--path <extracted-root | zip> is required.');

let files; // Map(path -> Buffer)
if (values.path.endsWith('.zip')) {
  files = new Map(parseZip(readFileSync(values.path)).map((entry) => [entry.name, entry.data]));
} else {
  const walk = (dir, base = '') => {
    const out = [];
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) out.push(...walk(full, `${base}${name}/`));
      else out.push([`${base}${name}`, readFileSync(full)]);
    }
    return out;
  };
  files = new Map(walk(values.path));
}

const manifestFile = files.get('manifest.json');
if (!manifestFile) throw new Error(`manifest.json not found under: ${values.path}`);
const manifest = JSON.parse(manifestFile.toString('utf8'));

process.stdout.write(`PRODUCT=${manifest.product} VERSION=${manifest.version}\n`);
process.stdout.write(`SOURCE_REF=${manifest.sourceRef} COMMIT=${manifest.sourceCommit}\n`);
process.stdout.write(`DECLARED_FILES=${manifest.fileCount}\n`);

const sha256 = (data) => createHash('sha256').update(data).digest('hex');
let bad = 0;
let checked = 0;
for (const file of manifest.files) {
  const data = files.get(file.path);
  if (!data) { process.stdout.write(`MISSING ${file.path}\n`); bad++; continue; }
  checked++;
  if (sha256(data) !== file.sha256) { process.stdout.write(`MISMATCH ${file.path}\n`); bad++; }
}
const declared = new Set(manifest.files.map((file) => file.path));
for (const name of files.keys()) {
  if (name !== 'manifest.json' && !declared.has(name)) { process.stdout.write(`EXTRA ${name}\n`); bad++; }
}

if (bad === 0) {
  process.stdout.write(`VERIFY=OK checked=${checked} extra=0\n`);
} else {
  process.stdout.write(`VERIFY=FAILED bad=${bad} checked=${checked}\n`);
  process.exitCode = 1;
}
