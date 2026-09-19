---
name: sprint-08-retrospective
description: Durable Sprint 08 lessons — cross-platform proof gates, zero-copy isolation homes, byte-reproducible packages, and real-session evidence
metadata:
  node_type: memory
  type: project
  modified: 2026-09-19
---

Sprint 08 delivered v1.4.0: Windows and WSL2/Linux parity for the full v1.3.0 collaboration baseline. The distilled event and evidence record is `docs/scrum-sprint/sprint-08-linux-parity-review-retro.md`; this memory keeps only reusable lessons.

1. **Prove platform-specific launch assumptions in the slice that introduces them.** Node `execFile('codex')` worked on Linux but could not launch Windows npm `.ps1/.cmd` shims. The SM probe caught this before release; Windows now uses a minimal inline PowerShell `& codex` branch.
2. **Build isolated test homes from an empty configuration.** Copying a daily `config.toml` introduced duplicate TOML keys, a remote marketplace source, and inherited hook trust that could not be attributed to the PO. Standard isolated installs must create their own local marketplace/config and start with zero trust.
3. **A package is reproducible only when non-content metadata is controlled.** The same source content initially produced different ZIP hashes because entry mtimes followed build time. Release ZIPs now fix every entry timestamp to the source commit UTC instant and test rebuilds under different timezones.
4. **Keep host layers separate through closure.** W10 initially had strong DPAPI/pipe/install evidence but no real Windows session round; it remained PARTIAL until PO-supplied real Codex/Claude records proved pipe delivery, queue wake, UserPromptSubmit/Stop injection, replies, and repeat-wake suppression. Fixture evidence cannot be promoted to original-session receipt.
5. **Copy the embedded reply command in mixed-home topologies.** A bare bridge CLI invocation can deliver file-based data but wake the wrong Codex store (`no rollout found`). Use the `CTC_BRIDGE_DIR` and `CODEX_HOME` prefix embedded in the inbound message rather than composing one.
6. **Candidate-first sequencing works.** W8/W9 ran only against frozen installed candidates; two independent field matrices plus native Windows regression prevented development-tree evidence from masquerading as product acceptance.

Related: [[cross-platform-assumptions-verify-early]], [[s08-bridge-cli-env-prefix]], [[sprint-acceptance-responsibility]], [[sprint-review-retro-closure]].
