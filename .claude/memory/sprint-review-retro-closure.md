---
name: sprint-review-retro-closure
description: "Three-phase Sprint Review/Retro closure: distill evidence into docs, update CLAUDE/memory and release documents, make one closure commit and tags, merge/publish, then clean worktrees and update installed plugins"
metadata:
  node_type: memory
  type: project
  modified: 2026-09-19
---

On 2026-09-19, the PO specified the standing closure workflow for a mature Sprint. Do not begin merely because implementation appears busy; start only when the agreed field tests, AC/DoD evidence, and PO acceptance readiness are mature enough for Review.

## Phase 1 — Prepare Review materials

1. Merge the Developer worktree branch into the current Sprint integration branch (for Sprint 08, `sprint-08`) before preparing closure records. Resolve conflicts explicitly and preserve the accepted runtime-candidate identity.
2. SM facilitates a Review-material discussion with Developer and, where value/process choices remain, the PO. Developer reports facts, evidence, deviations, and incomplete items; SM independently checks them against the Sprint Backlog; PO contributes acceptance and value decisions.
3. Prepare a traceability matrix covering Sprint Goal, selected PBIs, every AC, Output/Outcome DoD, installed-candidate identity (commit, package hash, installed paths), original-session evidence, PO experience, failed/partial checks, and remaining backlog adaptations.

## Phase 2 — Sprint Review output

1. Distill the Sprint result into one active summary under `docs/scrum-sprint/` (normally `sprint-NN-<topic>-review-retro.md`). Research conclusions with durable design value may also be distilled under `docs/ideo-design/`; do not leave one-off research logs in the active tree.
2. Preserve enough evidence identifiers and Git history pointers in the summary to retrieve deleted process material later. Include test environments, candidate sourceCommit and SHA256, original session/thread/message IDs where applicable, actor attribution, and explicit PASS / partial / not-tested / failed states.
3. Update the Product Backlog: move accepted PBIs to delivered capability, return incomplete work to the backlog without silently expanding scope, and record release/version implications.
4. After facts and traceability are preserved, delete this Sprint's one-off process materials from the active tree, including the Sprint working folder, daily logs, intermediate review notes, and experiment scratch records. Git history is the archive; the distilled docs are the active representation.

## Phase 3 — Retrospective and product-health updates

1. Run Retro after the Review facts are stable. Focus on durable process, quality, collaboration, and environment lessons—not a second technical debate.
2. Maintain `.claude/CLAUDE.md` and `.claude/memory/*` using the project's Claude memory conventions: concise context in CLAUDE, topic memories with frontmatter, an accurate index, no duplicate active Sprint logs, and links/relations kept useful. Add or change memories only when a lesson is reusable; retire stale or contradictory entries deliberately.
3. Review README, INSTALL, RELEASE-NOTES, USAGE, SMOKE, skill text, plugin metadata, Product Backlog, and project context together for version, platform, verified-boundary, and command freshness.
4. Treat global DoD changes cautiously. A change requires an explicit PO decision and should generalize beyond one incident; otherwise record a working rule or Sprint lesson instead.

## Closure, release, and cleanup

1. Put the completed Review/Retro distillation, document/memory updates, backlog adaptation, and process-material deletion in one closure commit. Create an annotated Sprint-closure tag (and, when releasing, the new version tag) pointing to that commit. For the current sequence, the next product version defaults to the next increment above v1.3.0 (v1.4.0) unless the PO explicitly chooses otherwise.
2. Merge the closure commit from the Sprint integration branch into `main`, push `main` and the tags to the remote project, and publish/verify the new release candidate/package before cleanup.
3. Only after remote push/release verification, remove the Sprint worktree, its Developer branch, and other confirmed-useless branches. Never delete evidence history that is only represented in Git.
4. Update the installed plugin in both supported daily environments (Windows and WSL2/Linux), using explicit target homes/paths and verifying installed source/version. Record package hash, installed paths, trust/update actions, and actor attribution.
5. Do not weaken or reinterpret an AC during closure. If field evidence changes the conclusion, reopen the item rather than editing the result to fit.

Related: [[sprint-acceptance-responsibility]], [[sprint-planning-participation]], [[sprint-03-retrospective]], [[sprint-05-retrospective]].
