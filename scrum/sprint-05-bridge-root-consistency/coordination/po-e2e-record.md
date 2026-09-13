# Sprint 05 PO End-to-End Record

- Date: 2026-09-13
- Candidate: `claude-to-codex-plugin-1.2.0.zip`
- SHA256: `8b97803af295926409195703b05d7d10796bce80219fa606327eeb43dd98afa0`
- Isolated `CODEX_HOME`: `C:\Users\DELL\AppData\Local\ClaudeToCodex\s05-host\codex-home`
- Installed candidate root: `C:\Users\DELL\AppData\Local\ClaudeToCodex\s05-host\codex-home\plugins\cache\claudetocodex-dev\claudetocodex\1.2.0`
- Isolated Codex thread: `01a09aae-cfdf-7972-a1d6-91fc5aba39df`
- PO host trust: completed interactively by the PO after reviewing/trusting the three installed hooks.
- Test Codex profile: `glm` (`codex --profile glm`).
- Claude Code test sessions were launched from `D:\ClaudeToCodex`.
- Daily baseline remained installed/enabled as ClaudeToCodex `1.1.0`.

## Result summary

| Cell | Scenario | Result | Evidence summary |
|---|---|---:|---|
| R1 | New session auto root | PASS | Default root was owned by incumbent Codex `01a09625-bebe-7b02-9612-2c1fa2b27d6f`; the isolated thread automatically selected `bridge-threads\01a09aae-cfdf-7972-a1d6-91fc5aba39df`, emitted `root-bound`, and connected Alpha/Beta without a hand-written `CTC_BRIDGE_DIR`, threadId, or root path. |
| R2 | Resume reuse | PASS | The same isolated thread fully exited and resumed. `bridge-roots\01a09aae-cfdf-7972-a1d6-91fc5aba39df.json` still pointed to the original per-thread root; pending Alpha/Beta letters were supplied through `UserPromptSubmit` and pending slots emptied. |
| R3 | Multiple targets, one root | PASS | Alpha and Beta pairs both had `codexId=01a09aae-cfdf-7972-a1d6-91fc5aba39df` and shared the same per-thread root. Named sends, Claude replies, queue wakes, and hook consumption all stayed on that root. |
| R4 | Cross-root diagnosis | PASS | With the isolated host explicitly resumed against the default root, wake for Alpha message `56be4786-dbc1-4ae0-81e0-86918c92ab2e` produced `wake-foreign-root` in the default root. It named the actual isolated root and serving Codex thread without claiming receipt or rebinding data. |
| R5 | Continuous official delivery | PASS | Alpha and Beta each completed two direct Claude-to-Codex replies. Exact bodies appeared as hook-supplied `Cross-session bridge message` context in the isolated original Codex rollout; all four pending slots cleared and later messages were not blocked. |
| R6 | Conflict / lifecycle boundaries | PASS | Default-root before/after snapshot differed only in `events.jsonl` (diagnostic events); no pair/evidence migration or rebinding. Repeat wakes were suppressed. Gamma's second letter while pending was rejected by overlap protection. Gamma was explicitly retired with evidence archived, and Beta still returned `S05-R6-BETA-AFTER-RETIRE-OK`. |

## Key message / object IDs

- Alpha pair: `85081100-94d0-4bf4-af4a-e8b968f28ef7`
- Beta pair: `bfa64f44-b287-44b4-8ddf-53372444ce71`
- Gamma pair: `774c6911-0642-4641-b650-c1934e9bdb20`
- R5 Alpha R1 outbound / inbound: `5833ed02-9ccb-4eff-a2e1-9873930c882f` / `56be4786-dbc1-4ae0-81e0-86918c92ab2e`
- R5 Beta R1 outbound / inbound: `3011b94c-fa06-4dba-9dff-da5456db6a9a` / `fe0e753f-0a88-44a0-86f7-b0524d3c0d2c`
- R5 Alpha R2 outbound / inbound: `e0412cde-24fc-46e5-aa4c-145f72212310` / `46223cef-c33b-4408-bab1-fd7ff5595e7e`
- R5 Beta R2 outbound / inbound: `a8412e8a-b0bf-45e5-94d8-5ba6c16753ab` / `4b5beffe-96c9-4033-9250-098e80957cf0`
- Gamma overlap accepted / rejected: `45e0884a-f10c-4c07-ad9e-c6d0a897b56d` / `ae184500-607c-4a57-80c6-be9382071f4d`
- Beta post-retire inbound: `349eb2a2-9063-47f4-a6f6-678828cf798d`

## Execution note / deviation

The first isolated TUI launcher inherited `CTC_BRIDGE_DIR` from the daily Codex session. The isolated Codex removed that inherited variable before running connect, and the resulting `root-bound` event selected the per-thread root. The SM then fully exited that TUI and resumed the same thread from a clean environment with `CTC_BRIDGE_DIR` removed; R2 and later runtime/host steps used that clean environment. R4 intentionally set the default root as an explicit wrong-root scenario. This deviation is recorded so the R1 evidence is not overstated.

## Final state at this record

- Isolated root pending slots: `0`
- Active isolated pairs: Alpha, Beta
- Retired isolated pair: Gamma
- Default root owner remained incumbent Codex `01a09625-bebe-7b02-9612-2c1fa2b27d6f`
- Daily plugin remained `claudetocodex@claudetocodex-dev installed, enabled 1.1.0`
- This record documents executed evidence; final PO acceptance / Sprint DoD conclusion remains a separate explicit PO decision.