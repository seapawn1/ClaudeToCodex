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
- Evidence is layered and never conflated: simulated fixture → host load → actual execution → original-session receipt. A lone `context-prepared` record is still unverified; each layer is checked at its own level.
- Verify one real data record (masked) before coding against any registry/file format; fixtures invented from assumptions have hidden real-format bugs.
- Acceptance rounds are joint: one real usage supports technical AC checks (SM) and PO DoD separately. The PO never hand-writes test markers, session IDs, or bridge env vars — correlation uses auto fields (messageId/pairId/conversationId/replyTo + data dir + time window).
- Record who did what truthfully: operator-prepared steps (install, env, evidence collection) stay attributed to the operator; PO steps stay attributed to the PO.
- When several actors write the same repo, stage by explicit file list (never `git add -A`) and keep per-actor file ownership.
- Sprint process artifacts live under the sprint folder during the sprint; at close they are distilled into the single review document in `docs/scrum-sprint/` and removed from the worktree (git history is the archive).
- A Claude endpoint can disappear when its session restarts; preserve the old data directory and explicitly re-register/re-pair rather than expecting automatic recovery.
- Keep cross-session business content flowing through the bridge during validation; do not ask the PO to relay it.