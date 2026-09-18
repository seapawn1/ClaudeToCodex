// Sprint 08 pre-study E2: add experiment-only instrumentation hooks alongside the
// product bridge hooks in the isolated workdir hooks.json. Each instrumentation
// hook appends the raw event JSON (its own stdin copy) and the codex/claude/ctc
// env it sees to /tmp/ctc-e2/hook-raw.jsonl — stdout is discarded so it never
// pollutes the additionalContext protocol. Throwaway experiment tooling.
import { readFileSync, writeFileSync } from 'node:fs';

const file = '/tmp/ctc-e2/work/.codex/hooks.json';
const config = JSON.parse(readFileSync(file, 'utf8'));
const cmd = "bash -c 'tee -a /tmp/ctc-e2/hook-raw.jsonl >/dev/null; { env | grep -iE \"codex|claude|ctc\"; echo ---; } >> /tmp/ctc-e2/hook-env.log'";
for (const event of ['PostToolUse', 'UserPromptSubmit', 'Stop']) {
  config.hooks[event] ??= [];
  config.hooks[event][0]?.hooks?.push({ type: 'command', command: cmd, timeout: 5, async: false });
}
writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
console.log('instrumentation hooks added:', Object.keys(config.hooks));
