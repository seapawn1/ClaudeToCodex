---
name: background-claude-session-startup
description: Verified Codex-managed background Claude startup and connection, with the PO's important future plugin capability intent
metadata:
  node_type: memory
  type: project
  modified: 2026-09-09T03:39:20.2392256Z
---

On 2026-09-09 the PO explicitly emphasized remembering that Codex can start a named background Claude Code session, discover its identity, connect the existing bridge and exchange messages without making the PO perform routine setup. The PO may later include this capability in the plugin. Preserve this intent, but do not treat it as an implemented feature, a selected Sprint item or permission to start implementation.

## Verified procedure

1. Start from the intended project directory with `claude --bg --name <unique-name> --effort ultracode <prompt>` when ultracode is requested. The documented flag is `--bg`, with two hyphens. Preserve the user's model/provider configuration unless asked to change it.
2. Remove inherited `CODEX_THREAD_ID` and any stale `CLAUDE_CODE_SESSION_ID` from the child launch environment only. Claude establishes its own session identity. Never spoof IDs or change the parent session identity to make a reply pass.
3. The launch prints a short management ID. Use the installed bridge's `sessions` entry to discover the full original ID and confirm the intended name, project, live process and endpoint; then use `connect --name <unique-name>`. The PO need not copy an ID or manage a data directory.
4. Keep this same background Claude session as the original peer. A new `claude -p` invocation, fork or resumed substitute for each message is not equivalent. Use the existing bridge's send/reply entries for ongoing business messages.
5. Verify actual inbound business content and automatic pair/conversation/reply linkage in both original sessions. A process starting, a name being discovered or `submitted:true` is not receipt proof. Verify the requested effort in runtime metadata/UI; a client setting does not prove the provider's internal reasoning behavior.
6. If another pair already exists, confirm it is unused, retain its data, verify archive paths and explicitly reconnect. Never silently replace a different pair. Keep both peers on the same bridge data directory. Necessary host trust or approval remains with the user and is never bypassed.

See [[bridge-reconnect-after-restart]] for endpoint recovery. Routine launch and connection should be handled by the operator; request PO action only for genuinely required human decisions or trust steps.

## Evidence and future scope

The workflow was performed by Codex and verified through actual business-message receipt on 2026-09-09 with Codex CLI 0.153.4, Claude Code 2.1.263 and Node.js v24.14.0. The Claude UI displayed ultracode with xhigh effort and dynamic workflows. This is one observed environment, not a guarantee for later versions or automatic restart recovery.

Provenance: original Codex session `01a08408-5445-7120-8f5b-47b96302c39d`, original Claude session `fc5b5e9a-d89d-4e62-a221-f69d4eb36588`; task message `0b530145-995b-4068-a2f7-b78085a3c02c` received a substantive reply `c0f783a9-b7d9-4005-b490-6d0ba0eea650` in the original Codex conversation. This memory was curated by Codex from the PO's request and that observed exchange, not attributed to a Claude memory write.

The future plugin opportunity is the complete start-discover-connect-converse experience, including identity, lifecycle, failure visibility and permission boundaries, not merely wrapping a launch command. The PO decides whether and when to prioritize it.
