---
name: sprint-02-retrospective
description: Durable Sprint 02 lessons on layered evidence, real formats, joint acceptance, attribution, staging, and artifact lifecycle
metadata:
  node_type: project
  type: project
  modified: 2026-09-13T00:00:00.000Z
  originSessionId: d7ac02ca-b4f7-4e87-8b8ac43419d42
---

Sprint 02 delivered the 1.0.0 Codex CLI plugin Increment; technical acceptance and PO DoD passed on 2026-09-09. Durable lessons:

1. Keep evidence layers separate: fixture, host load, actual execution, and original-session receipt. No layer substitutes for the next.
2. Read one real record before coding against a file or registry format; an invented fixture can pass while real integration fails.
3. One real usage round can support SM technical AC checks and separate PO DoD experience without making the PO repeat the technical matrix.
4. Record operator and PO actions exactly as they happened; do not transfer credit for installation, trust, or experience.
5. Stage explicit paths in a shared repository and respect actor ownership.
6. Documentation claims must not exceed their evidence layer.
7. Sprint process materials belong under the Sprint folder while active; at close, distill them into one docs review and remove them from the active tree.
8. Clarify the user's actual requirement before labeling something a direction change; a team misreading is not a PO pivot.

The old conditional same-identity endpoint-refresh recipe is superseded by current multi-pair lifecycle semantics in [[bridge-reconnect-after-restart]].