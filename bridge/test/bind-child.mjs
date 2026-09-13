// Concurrency-test helper for the session-root index: binds
// <threadId> <root> <indexDir> and reports one JSON line. Real processes are
// the point - the lost-update contract (SM review S05-SM-REVIEW-06) must hold
// across actual parallel writers, not just interleaved calls in one process.
import { bindThreadRoot } from '../roots.mjs';

const [threadId, root, dir] = process.argv.slice(2);
try {
  const result = bindThreadRoot(threadId, root, dir);
  process.stdout.write(`${JSON.stringify({ ok: true, changed: result.changed })}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
