---
name: bridge-reconnect-after-restart
description: Current ClaudeToCodex reconnect semantics after endpoint death, same-identity refresh, restart, and stale same-name pairs
metadata:
  node_type: project
  type: project
  modified: 2026-09-13T00:00:00.000Z
---

ClaudeToCodex 1.1 supports multiple pairs in one bridge data root. Apply these lifecycle rules:

1. A Claude restart usually creates a new original-session identity. The old named-pipe endpoint dies; sends to it fail honestly and do not switch to another target. Connect the new session explicitly with `connect --name <unique-name>`; that creates a new pair rather than silently replacing the old one.
2. If the same Claude identity reconnects with a changed endpoint, `connect` refreshes that pair endpoint in place and does not create a second pair.
3. A stale pair with the same readable name makes name selection ambiguous. The error lists full pairIds and an executable `retire --pairId` recovery. Retire only a pair confirmed unused; evidence is archived and in-flight letters retain their original attribution.
4. Replies bind to the referenced original message. After retirement or identity replacement, an old reply target is rejected rather than redirected to a new session.
5. One bridge data root serves one Codex original session. Hooks and reply entries carry the root they serve. Do not move or archive the whole root merely to recover one Claude target.

Related: [[codex-claude-test-pair-harness]].