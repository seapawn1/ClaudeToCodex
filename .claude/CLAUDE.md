# Project Context

ClaudeToCodex ships as a Windows-only Codex CLI plugin. It lets one running Codex session and one running Claude Code session exchange short work messages, replies, and follow-ups without the Product Owner relaying text. The standard user path is installation, necessary host trust, choosing a running Claude session by name, then normal conversation.

Primary documents:

- `README.md`
- `INSTALL.md`
- `RELEASE-NOTES.md`
- `bridge/docs/USAGE.md`
- `bridge/docs/SMOKE.md`
- `scrum/ProductBacklog.md`
- `docs/scrum-sprint/sprint-02-install-package-release-review.md`
- `docs/scrum-sprint/sprint-01-bridge-review-retro.md`
- `docs/ideo-design/cross-session-agent-messaging.md`
- `docs/DeepResearchSynthesis.md`

Sprint 02's plugin Increment passed technical acceptance and the PO's DoD. Its review, value inspection, release decision, and retrospective are distilled in the single Sprint 02 review document. The v1.0.0 tag includes the final review, memory updates, and cleanup; its unchanged product ZIP remains traceable to the accepted product source commit. Sprint 01 history remains in its own review document.

Important empirical rules:

- Select the smallest PBI set required for the Sprint Goal and the Developers' capacity. The PO decides value ordering; the SM facilitates, removes obstacles, and checks acceptance; the Developer owns implementation.
- Treat `submitted:true` as attempted delivery, not proof of receipt.
- Judge delivery by the receiving original session's actual inbound event, matching full body, and automatic message/pair/conversation/reply linkage. Do not require the PO to type a marker.
- Evidence is layered and never conflated: simulated fixture → host load → actual execution → original-session receipt. A lone `context-prepared` record is still unverified; each layer is checked at its own level.
- Verify one real data record (masked) before coding against any registry/file format; fixtures invented from assumptions have hidden real-format bugs.
- Acceptance rounds are joint: one real usage supports technical AC checks (SM) and PO DoD separately. The PO never hand-writes test markers, session IDs, or bridge env vars — correlation uses auto fields (messageId/pairId/conversationId/replyTo + data dir + time window).
- Record who did what truthfully: operator-prepared steps (install, env, evidence collection) stay attributed to the operator; PO steps stay attributed to the PO.
- When several actors write the same repo, stage by explicit file list (never `git add -A`) and keep per-actor file ownership.
- Sprint process artifacts live under the sprint folder during the sprint; at close they are distilled into the single review document in `docs/scrum-sprint/` and removed from the worktree (git history is the archive).
- A Claude endpoint can disappear when its session restarts; preserve the old data directory and explicitly re-register/re-pair rather than expecting automatic recovery.
- Keep cross-session business content flowing through the bridge during validation; do not ask the PO to relay it.

## Background Claude sessions

When a task calls for a Claude peer and startup is authorized, Codex should handle routine launch, discovery and connection rather than default to asking the PO to open a terminal or copy IDs. The PO regards this as an important future plugin capability candidate, not an already shipped feature or a selected Sprint item.

For the verified procedure, identity handling and lifecycle/trust boundaries, read `.claude/memory/background-claude-session-startup.md`.
