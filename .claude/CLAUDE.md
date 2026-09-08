# Project Context

ClaudeToCodex is a Windows-only bridge that lets one running Codex session and one running Claude Code session exchange short work messages, replies, and follow-ups without the Product Owner relaying text.

Primary documents:

- `README.md`
- `bridge/docs/USAGE.md`
- `bridge/docs/SMOKE.md`
- `scrum/ProductBacklog.md`
- `docs/scrum-sprint/sprint-01-bridge-review-retro.md`
- `docs/ideo-design/cross-session-agent-messaging.md`
- `docs/DeepResearchSynthesis.md`

Sprint 01 closed successfully. Its review, value inspection, backlog adaptation, and retrospective are distilled in the Sprint 01 review document.

Important empirical rules:

- Treat `submitted:true` as attempted delivery, not proof of receipt.
- Judge delivery by the receiving original session's event record plus a unique marker.
- A Claude endpoint can disappear when its session restarts; preserve the old data directory and explicitly re-register/re-pair rather than expecting automatic recovery.
- Keep cross-session business content flowing through the bridge during validation; do not ask the PO to relay it.