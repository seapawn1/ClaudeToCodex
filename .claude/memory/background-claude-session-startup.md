---
name: background-claude-session-startup
description: PO intent for Codex-managed Claude startup and connection, with the verified modern harness pointer
metadata:
  node_type: memory
  type: project
  modified: 2026-09-13T00:00:00.000Z
---

The PO wants Codex to handle routine background Claude startup, discovery, connection, and conversation setup when a task calls for a peer; the PO should act only for genuinely required decisions or host trust. This remains an important future plugin-capability candidate, not an already shipped one-command product feature.

The verified modern procedure is in [[codex-claude-test-pair-harness]]: launch from the intended project root with `claude --bg --name <unique>`, scrub inherited session identity in the child environment, discover the real original session, connect by name, and verify receipt in both original sessions. Never use a fresh `claude -p`, fork, or hand-copied ID as a substitute for the continuing original peer.

The original workflow was observed on 2026-09-09 with Codex CLI 0.153.4, Claude Code 2.1.263, and Node v24.14.0. Version-sensitive details and isolation requirements are superseded by the Sprint 04 harness memory.