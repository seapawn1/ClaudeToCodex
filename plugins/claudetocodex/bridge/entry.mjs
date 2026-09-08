import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Single source of truth for the installed bridge command. The hooks registration
// (install) and the reply guidance embedded in delivered messages (renderPeer)
// both derive their command from here, so a relocated installation updates both.
export const cliPath = (from = new URL('./cli.mjs', import.meta.url)) => fileURLToPath(from);

export function commandString(target = cliPath()) {
  return `node "${resolve(target)}"`;
}

// The repository that contains this bridge/ directory. Used by `install` to
// locate the project-level .codex/hooks.json unless --hooks-file overrides it.
export function repoRoot() {
  return resolve(cliPath(), '..', '..');
}
