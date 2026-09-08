---
name: bridge-reconnect-after-restart
description: "How to reconnect the ClaudeToCodex bridge after this Claude session restarts (endpoint dies, identity changes, explicit re-pair recipe)"
metadata:
  node_type: memory
  type: project
  originSessionId: 2636ac33-8077-4d48-8c44-081de3b2596c
  modified: 2026-09-08T12:08:56.117Z
---

On 2026-09-08 the PBI-01 final E2E hit a real restart: this Claude session was re-enqueued with a NEW `CLAUDE_CODE_SESSION_ID`, which (1) killed the old named-pipe listener → all inbound Codex sends failed with "Claude pipe write failed: Connect 超时" (send-error in events.jsonl, nothing reaches the conversation), and (2) made all my `reply`/`send` fail with "Send or reply from exactly one of the two selected original sessions" because pair.json still bound the old session id.

**Why:** the bridge is single-pair per data dir, identity = session env vars, endpoint pipes die with the process. No auto-recovery (USAGE.md §5).

**How to apply (USAGE.md §2 explicit re-pair):**
1. `mv <CTC_BRIDGE_DIR> <same>-archived-<timestamp>` (keep evidence; recreate the SAME path so the Codex side's `CTC_BRIDGE_DIR` env stays valid).
2. `CTC_BRIDGE_DIR=<dir> node bridge/cli.mjs register` → new endpoint under new session id.
3. `CTC_BRIDGE_DIR=<dir> node bridge/cli.mjs pair --codex <same codexThreadId> --claude-endpoint <new endpoint file>`.
4. Old message ids live in the archived dir — `reply --to <old id>` fails ENOENT; use `send` (the unique marker in the body ties it back).

Also: both sides must run under the SAME `CTC_BRIDGE_DIR` — sender-side-only override delivers (pipe is global) but the receiver's reply gets rejected. If E2E tests are running, active dir is likely `bridge-po-final-e2e-1` under `%LOCALAPPDATA%\ClaudeToCodex`.
