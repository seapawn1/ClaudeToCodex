---
name: sprint-01-retrospective
description: "Durable lessons from Sprint 01: two-layer validation, receiver-event evidence, environment consistency, and process improvements for Sprint 02"
metadata:
  node_type: memory
  type: project
  modified: 2026-09-08
---

Sprint 01 delivered the first ClaudeToCodex bridge Increment. Durable lessons:

1. Keep offline logic regression and real-session smoke separate. Automated tests verify framing, identity matching, deduplication, and priority; they do not prove real original-session receipt.
2. Use a unique marker plus the receiving original session's event record as the delivery evidence rule. CLI output, local JSON, pipe-write success, and model self-report are only process evidence.
3. `submitted:true` means attempted delivery, not receipt. The final E2E restart scenario falsified the assumption that it could be treated as delivery.
4. Before real-session validation, check both sides' `CTC_BRIDGE_DIR` and identity environment variables. Sender-side-only setup caused a real “exactly one selected session” failure.
5. Skeleton-first exposure of the Codex hook chain worked; keep the highest-uncertainty integration path early.
6. For Sprint 02, consider using real Scrum events as normal smoke scenarios so product usage and validation coincide.

The global Definition of Output Done was not changed. Potential recurring rules remain Sprint 02 Planning inputs rather than silently institutionalized.