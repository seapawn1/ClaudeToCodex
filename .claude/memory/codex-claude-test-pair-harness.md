---
name: codex-claude-test-pair-harness
description: Verified methodology for standing up real Codex↔Claude Code conversation pairs for testing or bug fixing - launch, isolation, pairing, and evidence discipline
metadata:
  type: feedback
---

PO explicitly asked (2026-09-13, after Sprint 04's multi-pair increment passed technical acceptance) to remember the whole methodology of establishing Codex + Claude Code conversation pairs, because future bug fixing and validation will need the same self-built pairs.

**Why:** Real end-to-end verification needs both original sessions alive and correctly identified; every shortcut (simulated peers, hand-copied IDs, single-sided evidence) produced false confidence that failed at the acceptance layer.

**How to apply (all empirically verified 2026-09-12/13; Codex CLI 0.154.0, Claude Code 2.1.268, Node 24, PS 5.1):**

1. **Claude peers**: launch as normal project sessions from the project root (`claude --bg --name <unique>`), not scratch dirs - the PO corrected this: project identity first, `Set-Location` to test dirs only when a task needs it. Scrub inherited identity first in a throwaway process (`Remove-Item Env:\CODEX_THREAD_ID, Env:\CLAUDE_CODE_SESSION_ID`) so each peer builds its own session identity; the parent session stays untouched. See [[background-claude-session-startup]].

2. **Codex test session**: isolated `CODEX_HOME` (never the daily one). Build its config by structured TOML extraction (top-level model keys + the referenced `[model_providers.<x>]` table only, via tomllib/toml - a whole-file copy drags in daily hooks/plugins/marketplaces/MCP/projects/trust). Add exactly one `[projects.'<workdir>'] trust_level="trusted"` entry, or project `.codex\hooks.json` never loads (/hooks shows empty). Make the work dir a git repo. Write hooks.json **BOM-less UTF-8** (PS 5.1 `Set-Content -Encoding UTF8` adds a BOM that Codex's JSON parser rejects). The window launcher must scrub inherited `CODEX_THREAD_ID`/`CLAUDE_CODE_SESSION_ID`. `codex resume <threadId>` keeps thread identity across window restarts; drive it externally via `codex queue --thread <id>` with CODEX_HOME pointing at the isolated home.

3. **Pairing**: `connect --name <unique part>`; same identity reuses the pair and refreshes endpoint/name in place; a restarted peer is a NEW identity = new pair, and the same-name stale pair makes `--name` ambiguous - the error lists full pairIds with an executable `retire --pairId` recovery. `retire` is the explicit lifecycle boundary (evidence archived, in-flight letters keep their attribution).

4. **Evidence discipline** (what made results acceptable): judge receipt ONLY by the receiving original session's actual inbound frames; keep layers separate (fixture → host load → execution → original-session receipt); for boundary tests use external raw-event timestamps only (generation window from the original AgentMessage; enqueue vs injection are different moments); never substitute model self-reports or file-write times for generation end; state overlap as "two publish times both before the first context-prepared", never as slot-coexistence duration; keep failure/recovery samples with their honest characterization (e.g. "manual recovery sample", "peer's own reconciliation retry, not plugin retry").

5. **Topology facts**: one bridge data root serves one Codex session; hooks serve exactly the root in the session env (a wake for another root appears as raw text and its letter waits); hook trust is established interactively per-home - if the founder is unknown, record unknown instead of guessing.
