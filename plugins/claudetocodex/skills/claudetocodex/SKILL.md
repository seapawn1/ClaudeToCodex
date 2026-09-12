---
name: claudetocodex
description: Connect this Codex session to a running Claude Code session and exchange work messages (send, reply, follow-up). Use when the user wants to talk to a Claude session, bridge messages to Claude, or reply to a Claude peer message.
---

# ClaudeToCodex bridge

Exchange short work messages between this Codex session and one or more running Claude Code sessions (Windows, 1..2000 chars, serial delivery; multiple pairs coexist and are addressed by name). The user just names the Claude session; run the rest yourself.

## Locate the installed plugin root (self-contained; no prior output needed)

`codex plugin list --json` does NOT expose the install path in Codex 0.153.4. Resolve it from the plugin cache layout:

```powershell
$ch = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$PLUGIN_ROOT = Get-ChildItem (Join-Path $ch 'plugins\cache\*\claudetocodex\*') -Directory |
  Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName
```

Verify with `Test-Path (Join-Path $PLUGIN_ROOT 'bridge\cli.mjs')` before use; if empty, the plugin is not installed (ask the user to run the two install commands from INSTALL.md).

## Connect (once per target; repeat for additional Claude sessions)

1. `node "$PLUGIN_ROOT\bridge\cli.mjs" sessions` — list running Claude sessions (name/status/alive).
2. `node "$PLUGIN_ROOT\bridge\cli.mjs" connect --name <unique part of the Claude session name>`
   - Ambiguous session names fail with a candidate list of running sessions (sessionId/pid); retry with a longer, unique part of the name.
   - Must run inside the selected Codex session (uses `CODEX_THREAD_ID`).
   - No register, no ID copying, no `CTC_BRIDGE_DIR`; the Claude side needs nothing installed.
   - Connecting another Claude session adds a second pair; existing pairs are never disturbed.
3. If the host asks, the user must trust the plugin hooks (user review required by design; never bypassed).

Note: `connect` ambiguity lists RUNNING SESSIONS (sessionId/pid). Full pairIds appear in `status` and in `send --name` ambiguity errors for CONNECTED pairs — that is where the retire guidance with full pairIds applies.

## Send and reply

- Send with one target connected: `node "$PLUGIN_ROOT\bridge\cli.mjs" send --body "..."` (no `--name` needed).
- Send with several targets: add `--name <unique part of the target's session name>`; replies always go to the message being answered, regardless of the last send.
- A message from Claude arrives in this conversation with an embedded reply entry — a ready-to-run command carrying the data directory and CLI path. Run it with `--body` or `--body-file` to reply or follow up.
- Inspect state: `node "$PLUGIN_ROOT\bridge\cli.mjs" status` lists every pair (name, identity, project, pending).
- Retire a target you are certain is no longer in use: `node "$PLUGIN_ROOT\bridge\cli.mjs" retire --pairId <full pairId from status or an ambiguity error>`; evidence is archived, never deleted.
- Delivery evidence rule: judge receipt by a unique marker plus the receiving original session's events; `submitted:true` only means attempted delivery.

## Boundaries

Windows-only; short text; serial delivery (one letter per hook event; injection order follows wake order); receipts stay `unverified`; no automatic retry. If a Claude session restarts, its old endpoint dies: `connect` again against the new session (explicit re-pair; a same-name stale pair makes `--name` ambiguous — retire it by pairId, which the error lists in full). Default data dir is `%LOCALAPPDATA%\ClaudeToCodex\bridge` and serves one Codex session; `CTC_BRIDGE_DIR` overrides it for tests and isolated runs only.
