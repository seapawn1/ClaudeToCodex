---
name: claudetocodex
description: Connect this Codex session to a running Claude Code session and exchange work messages (send, reply, follow-up). Use when the user wants to talk to a Claude session, bridge messages to Claude, or reply to a Claude peer message.
---

# ClaudeToCodex bridge

Exchange short work messages between this Codex session and one running Claude Code session (Windows, single pair, 1..2000 chars, serial delivery).

## Connect (once per session pair)

1. Find the installed plugin root:
   `codex plugin list --json` → the `installedPath` of `claudetocodex` (below: `<PLUGIN_ROOT>`).
2. List running Claude sessions:
   `node "<PLUGIN_ROOT>\bridge\cli.mjs" sessions`
3. Connect by name:
   `node "<PLUGIN_ROOT>\bridge\cli.mjs" connect --name <unique part of the Claude session name>`
   - Ambiguous names fail with a candidate list; retry with a longer, unique part.
   - Must run inside the selected Codex session (uses `CODEX_THREAD_ID`).
   - No register, no ID copying, no `CTC_BRIDGE_DIR` needed; the Claude side needs nothing installed.
4. If the host asks, trust the plugin hooks (user review is required by design; this product never bypasses it).

## Send and reply

- Send: `node "<PLUGIN_ROOT>\bridge\cli.mjs" send --body "..."` (or `--body-file <UTF-8 file>`).
- A message from Claude arrives in this conversation with an embedded reply entry — a ready-to-run command that already carries the data directory and CLI path. Run it with `--body` or `--body-file` to reply or follow up.
- Inspect state: `node "<PLUGIN_ROOT>\bridge\cli.mjs" status` (pair, pending message, recent events).
- Delivery evidence rule: judge receipt by a unique marker plus the receiving original session's events; `submitted:true` only means attempted delivery.

## Boundaries

Windows-only; single pair; short text; serial delivery; receipts stay `unverified`; no automatic retry. If the Claude session restarts, its old endpoint dies: run `connect` again against the new session (explicit re-pair; the product never silently replaces a different pair). Default data dir is `%LOCALAPPDATA%\ClaudeToCodex\bridge`; `CTC_BRIDGE_DIR` overrides it for tests and isolated runs only.
