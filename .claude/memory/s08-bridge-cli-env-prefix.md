---
name: s08-bridge-cli-env-prefix
description: "Sprint 08 mixed topology — bare bridge CLI send fails wake with \"no rollout found\"; must prefix CTC_BRIDGE_DIR + CODEX_HOME"
metadata:
  node_type: memory
  type: project
  originSessionId: a7954f30-8956-4eb6-a04e-94a9082cb7d5
  modified: 2026-09-19T07:22:58.548Z
---

In the Sprint 08 Linux-parity test topology (Claude session in main home `/home/dell`, Codex original session in isolated `CODEX_HOME=/home/dell/projects/ctc-s08-r1-home-2`, shared bridge root `/home/dell/.local/share/ClaudeToCodex/bridge`), running `bridge/cli.mjs send` bare from the main-home terminal fails the queue wake with `thread/queue/add ... no rollout found for thread <codexId>` — the CLI consults the default `/home/dell/.codex` thread store, which lacks the test thread's rollout.

**Why:** the wake submission inherits `process.env.CODEX_HOME`; only the file-based root delivery is root-pinned, so the message still gets through (context-prepared + peer reply) even when the wake fails — the error looks fatal but is not.

**How to apply:** always run bridge CLI (send/reply/status) from the main-home session with `CTC_BRIDGE_DIR='/home/dell/.local/share/ClaudeToCodex/bridge' CODEX_HOME='<current test codex home>'` prefix — exactly the command form embedded in each inbound message's reply entry; copy it from there rather than composing one. Verified 2026-09-19 in round r1 (T01CX wake failed bare, reply submitted:true with prefix). Related: [[codex-claude-test-pair-harness]], [[bridge-reconnect-after-restart]].
