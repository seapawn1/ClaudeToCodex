# Project Context

ClaudeToCodex is a Windows-only Codex CLI plugin. One running Codex original session can exchange short work messages, replies, and follow-ups with one or more named running Claude Code original sessions without the Product Owner relaying text. The normal user path is install, complete required host trust, choose Claude session(s) by name, then converse.

Primary documents are `README.md`, `INSTALL.md`, `RELEASE-NOTES.md`, `bridge/docs/USAGE.md`, `bridge/docs/SMOKE.md`, `scrum/ProductBacklog.md`, and the distilled Sprint reviews under `docs/scrum-sprint/`.

Sprint 05 delivered and accepted the per-Codex root Increment: automatic root selection/reuse, multi-pair continuous official delivery, cross-root diagnosis, honest pending status, atomic exclusive per-session indexing, and isolated-candidate validation. Its sole active summary is `docs/scrum-sprint/sprint-05-bridge-root-consistency-review-retro.md`. Sprint 04 and earlier reviews remain historical summaries.

Sprint 03 delivered and accepted PBI-09 readable arrival and automatic continuation: readable source/body/trailing-marker queue text, injection-layer reply entry without duplicate body injection, idle automatic continuation, busy queuing, same-turn dual-hook noop, cross-turn duplicate suppression, legacy single-line compatibility, and cross-pair marker hijack protection. Its sole active summary is `docs/scrum-sprint/sprint-03-readable-arrival-review-retro.md`; release version is 1.3.0. Sprint 06 (PBI-10+13) and Sprint 07 (PBI-12) remain pending Planning seeds, not current commitments.

## Durable working rules

- Follow `memory/sprint-discovery-working-agreement.md` for user-story evidence and when to use Empathize, Ideate and prototype tests. This standing rule is maintained in project memory.
- Scrum boundaries: the PO orders value and makes acceptance/release decisions; Developers own implementation and the Sprint Backlog plan; the SM independently verifies acceptance evidence and removes impediments.
- Acceptance evidence: check every AC and applicable DoD against the final installed candidate. Developer reports and test counts are inputs, not acceptance substitutes.
- Delivery evidence: `submitted:true`, pipe writes, message files, and a lone `context-prepared` are process evidence. Receipt requires the receiving original session's full inbound frame plus automatic message/pair/conversation/reply linkage.
- Evidence layers stay separate: fixture → host load → actual execution → original-session receipt. Do not promote historical evidence to a new candidate unless code is unchanged or applicability is explicit.
- Validate feature freezes through an isolated installed plugin candidate, including full manifest, metadata, effective hooks, and reply-entry provenance. Source or prototype-path checks alone do not prove installed-plugin acceptance.
- Boundary claims use original publish/wake/context/receiver events. Model self-reports, file-write times, wrapper returns, and task labels are clues, not proof. Escalate engineering depth that outgrows the AC instead of absorbing it.
- Read one real record before coding against a registry or file format; invented fixtures can pass while real integration fails.
- Host-state operations that install, remove, update marketplaces/plugins, alter hooks, or restart sessions must run with an explicitly echoed target home and verify output/installed paths before further state changes. Never use PowerShell read-only automatic variables such as `$home` as scratch state.
- Bridge transport, model context, frontend visibility, and proactive reporting are separate evidence layers. A complete payload in model context is not proof the PO saw it; model self-report is not receipt. Distinguish direct inbound frame, UI rendering, and follow-up action.
- Record actor attribution honestly. Operators prepare install/env/evidence; only the PO performs PO experience and required host trust. POs never hand-write test markers, IDs, or bridge environment variables.
- In a shared repository, stage by explicit file paths and respect actor ownership. One-off Sprint materials live under the Sprint folder during the Sprint, then distill into one docs review and leave the active tree.
- A Claude restart can kill its endpoint. Reconnect explicitly; never silently replace a pair. Preserve old evidence and use `retire --pairId` only for a pair confirmed unused. Keep business content flowing through the bridge during validation rather than asking the PO to relay it.
