---
name: claudetocodex
description: Connect this Codex session to a running Claude Code session and exchange work messages (send, reply, follow-up). Use when the user wants to talk to a Claude session, bridge messages to Claude, or reply to a Claude peer message.
---

# ClaudeToCodex bridge

Exchange short work messages between this Codex session and one running Claude Code session (Windows, single pair, 1..2000 chars, serial delivery). The user just names the Claude session; run the rest yourself.

## Locate the installed plugin root (self-contained; no prior output needed)

`codex plugin list --json` does NOT expose the install path in Codex 0.153.4. Resolve it from the plugin cache layout:

```powershell
$ch = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$PLUGIN_ROOT = Get-ChildItem (Join-Path $ch 'plugins\cache\*\claudetocodex\*') -Directory |
  Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName
```

Verify with `Test-Path (Join-Path $PLUGIN_ROOT 'bridge\cli.mjs')` before use; if empty, the plugin is not installed (ask the user to run the two install commands from INSTALL.md).

## Connect (once per session pair)

1. `node "$PLUGIN_ROOT\bridge\cli.mjs" sessions` — list running Claude sessions (name/status/alive).
2. `node "$PLUGIN_ROOT\bridge\cli.mjs" connect --name <unique part of the Claude session name>`
   - Ambiguous names fail with a candidate list; retry with a longer, unique part.
   - Must run inside the selected Codex session (uses `CODEX_THREAD_ID`).
   - No register, no ID copying, no `CTC_BRIDGE_DIR`; the Claude side needs nothing installed.
3. If the host asks, the user must trust the plugin hooks (user review required by design; never bypassed).

## Send and reply

- Send: `node "$PLUGIN_ROOT\bridge\cli.mjs" send --body "..."` (or `--body-file <UTF-8 file>`).
- A message from Claude arrives in this conversation with an embedded reply entry — a ready-to-run command carrying the data directory and CLI path. Run it with `--body` or `--body-file` to reply or follow up.
- Inspect state: `node "$PLUGIN_ROOT\bridge\cli.mjs" status`.
- Delivery evidence rule: judge receipt by a unique marker plus the receiving original session's events; `submitted:true` only means attempted delivery.

## Boundaries

Windows-only; single pair; short text; serial delivery; receipts stay `unverified`; no automatic retry. If the Claude session restarts, its old endpoint dies: run `connect` again against the new session (explicit re-pair; never silently replaces a different pair). Default data dir is `%LOCALAPPDATA%\ClaudeToCodex\bridge`; `CTC_BRIDGE_DIR` overrides it for tests and isolated runs only.
