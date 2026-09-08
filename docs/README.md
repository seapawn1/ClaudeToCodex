# Docs

This directory keeps durable project knowledge. Process-heavy records are distilled into review documents before cleanup; original Sprint evidence remains recoverable through Git history.

## Current documents

- [scrum-sprint/sprint-02-install-package-release-review.md](scrum-sprint/sprint-02-install-package-release-review.md): Sprint 02 product/value review, PO acceptance, backlog adaptation, retrospective actions, and 1.0.0 release provenance. This is the sole retained Sprint 02 summary.
- [scrum-sprint/sprint-01-bridge-review-retro.md](scrum-sprint/sprint-01-bridge-review-retro.md): Sprint 01 Increment review, value inspection, backlog adaptation, and retrospective.
- [DeepResearchSynthesis.md](DeepResearchSynthesis.md): cross-tool messaging research conclusions, evidence boundaries, rejected risks, and Scrum handoff.
- [ideo-design/cross-session-agent-messaging.md](ideo-design/cross-session-agent-messaging.md): closed Design Sprint target, selected architecture, T01–T05 evidence, and engineering boundary.

## Sprint 01 archive

One-off Sprint Backlog and evidence files were removed from the active tree after being distilled into the Sprint 01 review. Use:

```powershell
git show sprint-01-bridge-review-retro --no-patch
git show sprint-01-bridge-review-retro^:scrum/SprintBacklog.md
git show 5ce9128:bridge/docs/evidence/smoke-20260908-2/MATRIX.md
```

The annotated `sprint-01-bridge-review-retro` tag records the retention and cleanup decision.
