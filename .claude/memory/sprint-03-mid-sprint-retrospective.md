---
name: sprint-03-mid-sprint-retrospective
description: Mid-sprint lessons from I2/I2b freeze discipline, TE1 setup, and installed-candidate validation
metadata:
  node_type: memory
  type: project
  modified: 2026-09-15
---

On 2026-09-15, the PO requested a lightweight mid-Sprint retrospective while Sprint 03 implementation was active. The formal Sprint Retrospective remains a separate end-of-Sprint event.

- Define a slice freeze operationally: implementation and shipped plugin trees are synchronized, both trees pass the declared tests, changes are committed, and that commit hash is the installation-candidate source. Do not describe a dirty working tree or development-tree-only change as frozen.
- Record the exact test working directory and command. The bridge suites run from `bridge/` with relative `test/...` paths; a path-not-found result from the repository root is an operator path error, not a product regression.
- Build isolated Codex test homes by extracting only the selected model profile, provider, model catalog, and test-project trust. Do not copy the daily config. Use `windows.sandbox = "unelevated"` in the base config; `danger-full-access` is invalid for that Windows-specific key. Install from an explicit local marketplace and verify installed-cache file hashes against the candidate source.
- Real host hook trust is interactive. Launch the isolated Codex session with an initial prompt so a thread and trust prompt are created; only the PO approves host trust. The SM verifies `session_index.jsonl`, `hooks.state`, and installed paths, and must not bypass trust.
- Start test Claude sessions from the correct project root or active project worktree so project/model configuration loads. Verify the session through `claude agents --json` and the bridge `sessions` listing before pairing.
- A Claude pipe timeout is transport evidence, not receipt or rejection. Explicitly reconnect and inspect bridge state; keep the current Developer session's transport problem separate from the isolated candidate under test.
- TE1-style host evidence must come from the receiving original session's stored prompt/thread history plus the bridge event chain (`created`, `wake-submitted`, `context-prepared`). A peer model's self-report is supplementary and never replaces the original-frame evidence.
- Commit progress evidence at reviewable checkpoints. A long-running implementation should not leave Sprint Backlog progress records dirty indefinitely.
- A lightweight process retrospective may update memory when a lesson repeats or creates rework; it does not replace the formal Sprint Retrospective or change Sprint scope.

Related: [[codex-claude-test-pair-harness]], [[sprint-acceptance-responsibility]], [[bridge-reconnect-after-session-restart]].
