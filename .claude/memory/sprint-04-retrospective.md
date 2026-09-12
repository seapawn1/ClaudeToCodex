---
name: sprint-04-retrospective
description: "Durable Sprint 04 lessons: installed-candidate-first validation, original-frame evidence discipline, scope-cost escalation, and honest concurrency closure"
metadata:
  node_type: project
  modified: 2026-09-13T00:00:00.000Z
---

Sprint 04 delivered PBI-11 (one Codex original session with multiple named Claude pairs) at candidate `ee73808`; all eight technical AC, PO Output DoD, and PO Outcome DoD passed on 2026-09-13.

1. **Validate the installed candidate early**: prototype-path success did not reveal extra installed files, stale metadata, effective hooks, or reply-entry provenance. Freeze a feature, install it into an isolated plugin cache, compare the complete manifest and metadata to source, and run acceptance against that installation—not merely against source or prototype paths.
2. **Boundary claims need original events, not secondary signals**: distinguish `created`, `published`, `wake-submitted`, and `context-prepared` from actual receiver-session inbound frames. File-write times, model self-description, wrapper returns, and task labels do not establish receipt or busy-boundary behavior.
3. **Escalate scope-depth mismatch immediately**: when quality work grows beyond the literal AC or materially exceeds the estimate, stop at a reviewable point and expose options to SM/PO. Do not absorb engineering hardening until the PO must cut scope.
4. **Reuse proven host test templates**: existing SMOKE patterns encode host realities such as asynchronous yields and tool metadata. New timing orchestration must preserve host metadata and external timestamps rather than inventing wrappers that hide process state.
5. **Record authorization and process provenance while acting**: installation, hook trust, restart, and stop actions should record actor, target PID/path, and time. If state cannot show who acted, record unknown; do not infer authorization from `ON_INSTALL` or enabled state.
6. **Layer and reuse evidence explicitly**: prototype, host load, actual execution, and original-session receipt remain separate. Historical evidence may support final acceptance only when the final code is unchanged or applicability is explicitly established; failed, manual, and recovered samples keep their original classification.

Related: [[sprint-acceptance-responsibility]], [[sprint-02-retrospective]].
