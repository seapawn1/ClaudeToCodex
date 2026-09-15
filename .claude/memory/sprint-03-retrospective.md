---
name: sprint-03-retrospective
description: Final Sprint 03 lessons from readable arrival, adversarial boundary testing, freeze discipline, and PO experience evidence
metadata:
  node_type: memory
  type: project
  modified: 2026-09-16
---

Sprint 03 delivered PBI-09 readable Claude→Codex arrival and automatic continuation. The PO accepted the installed candidate in a real four-leg conversation. The distilled event record is `docs/scrum-sprint/sprint-03-readable-arrival-review-retro.md`; this memory keeps only reusable lessons.

- PO Empathize evidence can overturn a plausible presentation assumption. The Sprint Goal changed from “the PO directly reads the arrival line” to “the PO understands the reply without asking for a repeat”; the model answer became the primary reading layer and the arrival line became the traceability layer.
- Marker parsing needs an adversarial boundary matrix, not only same-pair marker-like text. Explicitly test cross-pair forged complete markers, stacked real wake texts, legacy single-line markers, ordinary input, and repeated wakes. The trailing-marker invariant prevents body-embedded markers from hijacking another pair.
- Treat a slice as frozen only when both product trees are synchronized, declared tests pass, changes are committed, and that commit hash is the installation-candidate source. A dirty tree or a development-tree-only pass is not frozen.
- Update the Sprint Backlog status in the same commit as each slice freeze. Stale status lines reduce transparency and can mislead Review preparation.
- After large multi-section edits, run syntax or fast checks per edit section. A structurally damaged file should be re-read from its current state rather than patched from a stale mental copy.
- Keep evidence layers separate: fixture, source tests, installed cache, real host execution, original-session receipt, and PO experience. A model self-report or a lone `context-prepared` event is not receipt proof.
- Final release/closure materials are distilled into one Review/Retro document; one-off Sprint folders leave the active tree after their facts and evidence IDs are preserved in that document and Git history.

Related: [[sprint-acceptance-responsibility]], [[sprint-discovery-working-agreement]], [[sprint-05-retrospective]].
