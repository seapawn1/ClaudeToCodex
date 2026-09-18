# SM 验收复核：W6 / W7a / WC（Sprint 08）

- 日期：2026-09-18。
- 审阅对象：W6 `1fe645e`、W7a `2dbbcb8`、WC 前置守卫 `b1b856f`、修复批次 `0e3bbd1`、项目记忆提交 `ec93d44`。
- 结论：**W7a 的候选内容完整性与 F-1..F-5 修复通过；W6 文档和 WC 隔离安装未通过，当前不能进入 W8。** 需要修复文档发布口径、重建可复现候选，并用全新 R1 home 重新执行标准安装与 PO 信任批次。

## 独立复核通过项

| 对象 | 结果 |
|---|---|
| F-1 Windows queue | 修复接受。win32 使用最小内联 PowerShell `& codex`，参数经环境传递；Windows 全量实测两条 queue 集成通过。 |
| F-2 XDG | 修复接受。相对 / 空 / 未设 `XDG_DATA_HOME` 均回退默认，并有测试。 |
| F-4 证据口径 | 修复接受。W1 注释 / 结果与 W10 边界一致。 |
| F-5 多活记录 | 修复接受。同 sessionId 多个 alive 记录取 `updatedAt` 最新者，双向测试通过。 |
| Linux 测试 | 源码树与插件树均 **115/115 pass，0 fail，0 skip**。 |
| Windows 测试 | 本机 Windows Node 实测 **100 pass / 0 fail / 15 explicit skip**；此前 9 fail 全部消除。跳过均有平台理由。 |
| 候选安装缓存内容 | R1 缓存 27 个插件文件与候选 manifest 逐文件 SHA256 / bytes 一致，无额外文件；安装候选测试 **113 pass / 0 fail / 2 explicit skip**。 |
| W7a 包完整性 | `VERIFY=OK checked=28 extra=0`；Python zipfile 外部 CRC / 内容校验通过；sidecar SHA256 与包一致。 |
| 包安全扫描 | 29 个包内条目未发现 API key / bearer token 模式；delivery `.ps1` 已移除，仅保留计划内 `Test-Acceptance.ps1`。 |
| 双树一致性 | `bridge/` 与插件树字节一致。 |

## B-1（阻塞，W6）：公开获取指引与候选能力不一致

README 已描述 Windows 与 WSL2/Linux 均可运行，但“正式获取”与 INSTALL 均固定：

```text
codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref v1.3.0
```

公开 `v1.3.0` 是 Windows-only 正式版本，不包含 Sprint 08 Linux 支持。按当前文档，Linux 用户会安装错误版本。RELEASE-NOTES 虽有“未定版候选”说明，但没有修正 README / INSTALL 的获取入口。

处理：W6 修复为二选一，并在同一候选中落实：

1. 候选未发布：README / INSTALL 明确公开 v1.3.0 仅 Windows；Linux 支持属于 Sprint 08 未发布候选，给出内部冻结来源的隔离安装说明；
2. PO 已决定发布：等待正式 ref / 版本后更新全部获取命令。

不能继续让“能力描述是 Sprint 08 候选、安装命令是 v1.3.0 正式版”并存。

## B-2（阻塞，W6）：SMOKE 仍残留与 Linux 冲突的旧全局约束

SMOKE §4c 仍写“S05 系测试会话一律遵守前置 8（Codex `--profile glm`…）”。该句来自 Windows 历史环境；§1 / §1b 已改为平台分支和“当轮记录为准”。对 Linux 隔离 home 而言，`--profile glm` 并不通用，W8 执行者可能按旧句配置错误会话。

处理：将 §4c 改为引用 §1 前置 8 的平台化表述，不单独强制 `--profile glm`；Windows 侧是否使用该 profile 由 W10 环境记录决定。

## B-3（阻塞，WC）：R1 隔离 home 配置无效，无法启动宿主

SM 实测：

```text
CODEX_HOME=/home/dell/projects/ctc-s08-r1-home codex plugin list --json
```

失败：`config.toml:65 duplicate key`。原因是同一 project key 重复声明。该 home 不能作为 W8 原始会话启动环境；即使缓存树内容正确，也不满足“安装候选可通过标准入口使用”的 WC 条件。

## B-4（阻塞，WC）：R1 来源与 hook trust 不可追溯

R1 `config.toml` 的 marketplace 仍指向远程 GitHub `ref=v1.3.0`，与结果文档“marketplace 源＝冻结工作树本地路径”矛盾。公开 v1.3.0 的 Git tag 指向 `bf71b34`，而候选 manifest 指向 `0e3bbd1`，不可能由该远程 ref 安装出当前缓存。

R1 的三条 claudetocodex hook trusted hash 与日常 `/home/dell/.codex/config.toml` 完全相同，且配置疑似复制而来；这不是 PO 在 R1 home 内实际执行信任的证据。SM 另建全新标准安装后，配置中没有这些 trust，进一步证明 R1 的 trust 状态不是本次安装自然产生。

处理：废弃现有 R1 作为验收环境；修复 W6/W7a 后重建候选，再用全新 home 通过本地冻结来源执行标准 marketplace/plugin 安装。PO 在该新 home 内执行 `/hooks` 信任并记录实际执行者与 trust 结果。

## M-1（必须修正，W7a）：字节稳定性声明不成立

W7A-RESULTS 声称“同输入同字节”。SM 在 detached worktree `0e3bbd1`、`sourceRef=HEAD` 下重建，所有 29 个 zip entry 内容完全一致，但 zip SHA 不同；差异来自每个 entry 的 mtime（stage 写入当前时间）。因此当前构建是**内容可复现**，不是**字节可复现**。

处理二选一：

1. 修复 build/zip 使用来源 commit 时间或固定 timestamp，补同源两次构建字节一致测试；
2. 修改 W7A 结果与 HOW 口径为“内容可复现 + sidecar 完整性”，明确不承诺字节稳定。

由于 B-1/B-2 修改文档后必须重建候选，建议同步修复 M-1，避免新旧包哈希只因构建时间变化。

## M-2（必须补记，WC）：冻结来源记录不完整

SM-FIXES-RESULTS 写“冻结 commit：见下方记录”，但下文没有直接写 commit。实际包 manifest 为：

- runtime sourceCommit：`0e3bbd19e252f040927ace3f67f99eb1430dcbc9`
- package version label：`sprint08-candidate`
- zip SHA256：`68436d0fd9cef00990c8c005e2cc188afc55361b53dfe3f893f89790ec23708e`

当前分支 `ec93d44` 比 `0e3bbd1` 仅新增项目记忆，不改变插件运行时；这可以接受，但 WC 记录必须明确“候选运行时冻结在 0e3bbd1，ec93d44 仅过程记忆提交”。后续若修改文档 / 构建工具 / 运行时代码，必须重建新候选并生成新 SHA。

## 标准入口可行性的独立反证

SM 新建隔离 home `/home/dell/projects/ctc-sm-wc-verify-home`，从本地冻结工作树执行：

```text
codex plugin marketplace add <frozen-worktree>
codex plugin add claudetocodex@claudetocodex-dev
```

结果：安装成功，`plugin list` 显示 local marketplace / local source，installedPath 正确；缓存与 R1 缓存逐字节一致；新配置 TOML 有效且没有任何预置 claudetocodex hook trust。该实验证明标准入口可用，问题在 Developer 的 R1 环境准备过程与证据记录，而不是插件安装机制。

## 处置要求

1. Developer 修复 B-1、B-2、M-1，并更新 W6/W7A/WC 结果记录。
2. 重建候选（建议仍以 runtime commit 为准，写入明确 sourceRef/sourceCommit/SHA）。
3. 新建 R1 home，从本地冻结来源标准安装；配置必须可解析、marketplace source 必须与来源一致、不得预置 trust。
4. PO 在新 R1 home 执行 `/hooks` 信任和 Claude 接收策略动作，记录实际执行者。
5. SM 复核新 R1 后才允许 W8。当前 `/home/dell/projects/ctc-s08-r1-home` 只能保留为失败证据，不得继续作为验收环境。
