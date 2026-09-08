---
name: sprint-02-retrospective
description: "Durable Sprint 02 lessons: layered delivery evidence, joint AC+DoD acceptance round, real-data-format verification, attribution honesty, staging discipline"
metadata: 
  node_type: memory
  type: project
  modified: 2026-09-08T20:41:10.743Z
  originSessionId: d7ac02ca-b4f7-4e87-b8ed-ac7b43419d42
---

Sprint 02 delivered the Codex CLI plugin Increment (candidate b6286c0, technical 10/0/0 + PO DoD passed 2026-09-09). Durable lessons for every later sprint:

1. **Layered evidence, never conflated**: simulated fixture → host load (skills/hooks definitions, PLUGIN_ROOT expansion) → actual execution (context-prepared in a trusted live session) → original-session receipt (message appears in the receiver's session + correlation). Each layer is necessary; no layer substitutes for the next. `submitted:true` AND a lone `context-prepared` are both still unverified.
2. **Verify real data formats before coding**: the registry key file was JSON `{peerToken,...}`, not a bare string; tests written on an invented fixture shape passed while real auth would fail. Read one real record (masked) first — see [[sprint-01-retrospective]] rule 2 for the same pattern.
3. **One real usage round supports two conclusions**: SM records technical AC checks, PO expresses experience/DoD — same evidence, separate confirmations, no repeated demo rounds. PO never hand-writes test markers, IDs, or env vars; correlation rides on auto fields (messageId/pairId/conversationId/replyTo + data dir + time window).
4. **Attribution honesty**: operator-prepared steps (install, env) vs PO-performed steps (login, trust, conversation) must be recorded as they happened; never credit operator work to the PO or vice versa.
5. **Staging discipline in a shared repo**: with multiple actors writing concurrently, stage by explicit file list — never `git add -A` — and split file ownership (Dev: own docs/backlog rows; SM: their evidence files).
6. **Docs claims ≤ evidence**: don't write "X proves Y" when X only implies Y (the reply-entry path proved renderPeer ran, not that hooks executed). State the layer the evidence belongs to.
7. **Process artifacts lifecycle**: during a sprint, everything lives under the sprint folder; at close, distill into the single docs review file and clean up — git history is the archive, not the worktree.
8. **Scope pivots are order changes**: this sprint had two big redirections (ZIP→plugin, local→GitHub); each landed as an explicit PO decision through the SM, never as silent drift inside the Dev's work. Minimal PBI set by Goal + capacity; PO orders, SM coordinates, Dev implements.

Related: [[bridge-reconnect-after-restart]] (register refresh on unchanged session id also restores the pair — verified twice this sprint).
