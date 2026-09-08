// Skeleton probe: records how the host invoked a plugin hook (WI-07 evidence).
// Writes one line per invocation: <variant> <PLUGIN_ROOT> <cwd> <event-ish argv>
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const variant = process.argv[2] ?? 'unknown';
const out = join(tmpdir(), 'ctc-plugin-probe.log');
const line = [
  new Date().toISOString(),
  variant,
  `PLUGIN_ROOT=${process.env.PLUGIN_ROOT ?? ''}`,
  `CLAUDE_PLUGIN_ROOT=${process.env.CLAUDE_PLUGIN_ROOT ?? ''}`,
  `PLUGIN_DATA=${process.env.PLUGIN_DATA ?? ''}`,
  `cwd=${process.cwd()}`,
].join(' ') + '\n';
appendFileSync(out, line, 'utf8');
