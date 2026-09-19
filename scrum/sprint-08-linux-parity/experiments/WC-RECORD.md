# WC 记录：冻结、构建、安装候选（重做版，SM B-1..B-4/M-1/M-2 处置后）

- 日期：2026-09-18。执行：Developer（Operator 步骤）。上一版 WC（SM 复核不通过）失败证据保留于 `/home/dell/projects/ctc-s08-r1-home`（日常 config 整体复制导致 duplicate key／继承远程 marketplace 记录与日常 trust；不再用于验收）。

## 冻结与候选（验收对象）

| 项 | 值 |
|---|---|
| 冻结 commit | **`c0f8d6e84bd53711a89956578a4ef22de8a7e440`**（分支 `worktree-sprint-08-linux-parity`；含 W1–W7a、SM F-1..F-5 与 B-1/B-2/M-1 修复批次；SM 复核记录 07deebc 在链上） |
| 候选包 | `/home/dell/projects/claude-to-codex-release-sprint08/claude-to-codex-plugin-sprint08-candidate.zip` |
| **zip SHA256** | **`aaa5edf7cc8c303bb37a4aa022cb66b39968d42fb59fc6f10b3c586e555524d6`** |
| Verify | `VERIFY=OK checked=28 extra=0`（Node 只读中央目录校验＋python3 zipfile 外部校验） |
| 字节可复现 | 同 commit 跨时区（TZ=UTC ↔ TZ=Asia/Shanghai）两次构建 SHA **相同**（实测＋测试断言） |
| manifest | version `sprint08-candidate`、sourceCommit `c0f8d6e…`、29 文件；plugin.json `version` 仍 1.3.0（正式版本＝PO W12 决策，如实记录） |

## R1 隔离 home（重做，SM 标准流程）

| 项 | 值 |
|---|---|
| 目标 home（显式回显） | **`/home/dell/projects/ctc-s08-r1-home-2`**（全新空 home；仅复制 `glm.config.toml`(600)＋`glm-models.json`；**不复制** `config.toml`/projects/trust/marketplace） |
| 基线 | 空 home `codex plugin list` 正常（"No marketplace plugins found"） |
| 标准安装 | `codex plugin marketplace add <冻结工作树本地路径>` → `codex plugin add claudetocodex@claudetocodex-dev` |
| 来源记录 | home `config.toml`：`[marketplaces.claudetocodex-dev] source_type="local" source="/home/dell/projects/ClaudeToCodex/.claude/worktrees/sprint-08-linux-parity"`（HEAD＝冻结 commit）；`plugin list` SOURCE 列显示本地工作树 |
| installedPath | `/home/dell/projects/ctc-s08-r1-home-2/plugins/cache/claudetocodex-dev/claudetocodex/1.3.0`，与候选 manifest **27/27 逐文件 SHA256 一致** |
| 安装候选自测 | 115 tests / 113 pass / 0 fail / 2 explicit skip（release 构建项：安装缓存非 git checkout，守卫显式跳过）＋ `sessions` 功能探针 exit 0 |
| **trust 状态** | **零预置**（config 无任何 trust 条目）——R1 内 hook 信任由 PO 首启 `/hooks` 执行，作为 W8 PO 动作批次留证 |

## W8 前置状态

- 候选/环境/证据路径全部就绪；等待 SM 对本重做 WC 的复核结论，通过后进入 W8 R1（PO 动作：R1-2 home `/hooks` 信任＋`crossSessionInbound=accept` 复核）。
- W9 将新建独立 R2 home（同冻结 commit、同样零预置 trust 流程）。
- 冻结纪律：W8–W11 期间工作树 HEAD 保持 `c0f8d6e`；如需任何变更，重建候选＋差异明示＋SM 重新复核。
