# Project Context

ClaudeToCodex is a Windows-only Codex CLI plugin. One running Codex original session can exchange short work messages, replies, and follow-ups with one or more named running Claude Code original sessions without the Product Owner relaying text. The normal user path is install, complete required host trust, choose Claude session(s) by name, then converse.

Primary documents are `README.md`, `INSTALL.md`, `RELEASE-NOTES.md`, `bridge/docs/USAGE.md`, `bridge/docs/SMOKE.md`, `scrum/ProductBacklog.md`, and the distilled Sprint reviews under `docs/scrum-sprint/`.

Sprint 04 delivered and accepted the multi-pair Increment: pair coexistence, named routing, reply affiliation, per-pair pending slots, overlap handling, explicit retire/rebuild, single-target and legacy compatibility, and installed-candidate validation. Its sole active summary is `docs/scrum-sprint/sprint-04-multi-claude-sessions-review-retro.md`. Earlier Sprint reviews remain historical summaries.

## Durable working rules

- Scrum boundaries: the PO orders value and makes acceptance/release decisions; Developers own implementation and the Sprint Backlog plan; the SM independently verifies acceptance evidence and removes impediments.
- Acceptance evidence: check every AC and applicable DoD against the final installed candidate. Developer reports and test counts are inputs, not acceptance substitutes.
- Delivery evidence: `submitted:true`, pipe writes, message files, and a lone `context-prepared` are process evidence. Receipt requires the receiving original session's full inbound frame plus automatic message/pair/conversation/reply linkage.
- Evidence layers stay separate: fixture → host load → actual execution → original-session receipt. Do not promote historical evidence to a new candidate unless code is unchanged or applicability is explicit.
- Validate feature freezes through an isolated installed plugin candidate, including full manifest, metadata, effective hooks, and reply-entry provenance. Source or prototype-path checks alone do not prove installed-plugin acceptance.
- Boundary claims use original publish/wake/context/receiver events. Model self-reports, file-write times, wrapper returns, and task labels are clues, not proof. Escalate engineering depth that outgrows the AC instead of absorbing it.
- Read one real record before coding against a registry or file format; invented fixtures can pass while real integration fails.
- Record actor attribution honestly. Operators prepare install/env/evidence; only the PO performs PO experience and required host trust. POs never hand-write test markers, IDs, or bridge environment variables.
- In a shared repository, stage by explicit file paths and respect actor ownership. One-off Sprint materials live under the Sprint folder during the Sprint, then distill into one docs review and leave the active tree.
- A Claude restart can kill its endpoint. Reconnect explicitly; never silently replace a pair. Preserve old evidence and use `retire --pairId` only for a pair confirmed unused. Keep business content flowing through the bridge during validation rather than asking the PO to relay it.