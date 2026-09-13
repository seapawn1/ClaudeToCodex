---
name: sprint-05-retrospective
description: "Durable Sprint 05 lessons: empirical root reproduction, host-state guards, atomic per-session indexes, and context-vs-visibility evidence layers"
metadata:
  node_type: memory
  type: project
  modified: 2026-09-13T00:00:00.000Z
---

Sprint 05 delivered PBI-15/PBI-14 at candidate SHA256 `8b97803af295926409195703b05d7d10796bce80219fa606327eeb43dd98afa0`; dual-tree tests, SMOKE 4c R1-R6, and PO manual E2E passed.

1. **Reproduce the topology before fixing the symptom**: root mismatch explained pending deadlock while `take()` itself remained healthy. Use fresh A/B failure and C/D control pairs to separate transport defects from configuration/lifecycle failures.
2. **Guard host-state commands**: before install/remove/marketplace/hook/restart actions, explicitly set and echo the target `CODEX_HOME`, verify `installedPath` prefix, and never use PowerShell read-only automatic variables as scratch state. A wrong shared-home mutation can destroy the daily installation.
3. **Make shared registries concurrency-safe by identity**: a single read-modify-write index can lose concurrent bindings. Per-session exclusive files plus atomic final publication preserve the one-root-per-Codex boundary without locks across unrelated sessions.
4. **Keep evidence layers separate**: source tests, unpacked package, isolated installed plugin, original-session inbound frame, and PO-visible experience are distinct. A complete bridge payload in model context is not equivalent to frontend rendering or proactive reporting; track that gap separately (PBI-09).
5. **Wait at host boundaries, not by polling**: after sending a bridge request, end the model turn and let queue wake/hooks inject at the next boundary. `Start-Sleep`, status polling, and message-file reading are not acceptance substitutes.
6. **Refresh public documents at Sprint closure**: README, INSTALL, release notes, usage, smoke, skill, CLAUDE context, and memory must be reviewed together so version refs, environment semantics, and verified boundaries do not rot behind implementation.

Related: [[sprint-04-retrospective]], [[codex-claude-test-pair-harness]], [[sprint-acceptance-responsibility]].