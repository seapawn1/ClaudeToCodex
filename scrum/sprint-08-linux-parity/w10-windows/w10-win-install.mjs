// Sprint 08 / W10: install the same-source candidate into a WINDOWS isolated
// codex home via the standard entry (npm shim codex.cmd driven through
// cmd.exe by Windows node). Daily C:\Users\DELL\.codex is untouched.
// Usage: node.exe w10-win-install.mjs <evidenceAbsPath>
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

if (process.platform !== 'win32') throw new Error('Windows-only');
const home = 'C:\\Users\\DELL\\AppData\\Local\\Temp\\ctc-w10-home';
const source = 'D:\\ctc-s08-win';
mkdirSync(home, { recursive: true });
const env = { ...process.env, CODEX_HOME: home };
delete env.CTC_BRIDGE_DIR;
const run = (args) => {
  const r = spawnSync('cmd.exe', ['/d', '/s', '/c', 'codex', ...args], { env, encoding: 'utf8', timeout: 120000 });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
};
const steps = {
  home,
  marketplace: run(['plugin', 'marketplace', 'add', source]),
  install: run(['plugin', 'add', 'claudetocodex@claudetocodex-dev']),
  list: run(['plugin', 'list']),
};
writeFileSync(process.argv[2] ?? 'w10-win-install-evidence.json', JSON.stringify(steps, null, 2));
for (const [name, r] of Object.entries(steps)) {
  if (typeof r === 'object') console.log(`--- ${name} (exit ${r.code}) ---\n${r.out.trim().split('\n').slice(-4).join('\n')}`);
}
