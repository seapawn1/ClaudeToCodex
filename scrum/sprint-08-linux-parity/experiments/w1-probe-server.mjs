// Sprint 08 / W1 hard exit criterion: Windows named-pipe fixture SERVER.
// Runs with Windows-side node (node.exe from the WSL worktree cwd maps to the
// \\wsl.localhost UNC path). Listens on a named pipe, collects raw bytes and
// per-line arrivals, and writes evidence JSON after the second line.
// Usage: node.exe w1-probe-server.mjs <pipeName> <evidencePath>
import { createServer } from 'node:net';
import { writeFileSync } from 'node:fs';

const [pipeName, evidencePath] = process.argv.slice(2);
const fullPath = `\\\\.\\pipe\\${pipeName}`;
const arrivals = [];
const lines = [];
let raw = '';

const server = createServer((socket) => {
  let buffered = '';
  socket.setEncoding('utf8').on('data', (data) => {
    raw += data;
    buffered += data;
    let end;
    while ((end = buffered.indexOf('\n')) !== -1) {
      const line = buffered.slice(0, end);
      buffered = buffered.slice(end + 1);
      arrivals.push(Date.now());
      lines.push(JSON.parse(line));
      if (lines.length === 2) {
        socket.end();
        writeFileSync(evidencePath, JSON.stringify({
          fullPath, platform: process.platform, node: process.version,
          lines, arrivals, raw, gapMs: arrivals[1] - arrivals[0],
        }, null, 2));
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 2000).unref();
      }
    }
  });
});
server.listen(fullPath, () => console.log(`LISTENING ${fullPath}`));
setTimeout(() => {
  writeFileSync(evidencePath, JSON.stringify({
    fullPath, platform: process.platform, node: process.version,
    lines, arrivals, raw, timedOut: true,
  }, null, 2));
  process.exit(2);
}, 20000).unref();
