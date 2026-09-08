# Docs

This directory keeps durable project knowledge. Process-heavy materials are distilled here before entering; their original versions remain recoverable from Git history.

## Current documents

- [DeepResearchSynthesis.md](DeepResearchSynthesis.md): cross-tool messaging research conclusions, evidence boundaries, rejected risks, and items handed to Scrum.
- [ideo-design/cross-session-agent-messaging.md](ideo-design/cross-session-agent-messaging.md): the closed Design Sprint target, selected bridge architecture, T01-T05 evidence summary, and engineering handoff boundary.

## Design Sprint archive

The active IDEO process directories were removed after closure. The annotated tag `design-sprint-closed` marks the design-sprint closing commit, while its parent baseline `3b43b80` still contains the complete research, ideation, prototype, and test files.

Useful recovery commands:

```powershell
git show design-sprint-closed --no-patch
git ls-tree -r --name-only design-sprint-closed^ IDEO
git show design-sprint-closed^:IDEO/deep-research/Synthesis.md
```

The obsolete prototype hooks were removed after closure in commit `5edff9b`; they will be rebuilt under the future product structure during Scrum, not restored from the old IDEO paths.

## Future organization

Scrum artifacts such as the Product Log, Product Backlog, sprint records, and implementation documentation should be added in a separate structure when that phase starts. This directory should continue to favor readable, stable knowledge over preserving every working-process file.
