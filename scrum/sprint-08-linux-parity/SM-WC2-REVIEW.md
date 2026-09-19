# SM 复核：WC 重做版（Sprint 08）

- 日期：2026-09-18。
- 审阅对象：`c0f8d6e`（运行时冻结）与 `eccf298`（WC 记录；仅过程材料）。Developer 报告的 B-1..B-4 / M-1 / M-2 处置。
- 结论：**通过**。W6 发布口径、SMOKE 平台化说明、W7a 按源 commit 字节可复现构建、WC 标识与 R1-2 标准安装均复核通过。可以进入 W8；W8 前置仅剩 PO 在 R1-2 内执行必要信任 / 接收策略动作。

## 逐项复核

| 原 SM 发现 | 复核结论 |
|---|---|
| B-1 获取指引装错版本 | PASS。README / INSTALL 明确公开 v1.3.0 仅 Windows；WSL2/Linux 属未发布候选，无公开安装入口，内部验收使用冻结源隔离安装。 |
| B-2 SMOKE 全局 `--profile glm` | PASS。S05 系改为引用 §1 前置 8 的平台化启动约束；Linux 隔离 home 不强制 profile，Windows 以 W10 环境记录为准。 |
| B-3 R1 配置 duplicate key | PASS。R1-2 `config.toml` TOML 解析有效，`codex plugin list --json` 正常。旧 R1 保留为失败证据，不再使用。 |
| B-4 来源与 trust 不可追溯 | PASS。R1-2 marketplace 为 local source，指向冻结工作树；`plugin list` 显示 local source；配置中 hook trust 条目为 0。PO 信任留待 R1-2 首启执行。 |
| M-1 非字节可复现 | PASS。构建 entry 时间戳固定为源 commit UTC 时刻；SM 在 `TZ=UTC` 与 `TZ=Asia/Shanghai` 下从 `c0f8d6e` 各重建一次，两者与声明候选 ZIP 均为 `aaa5edf7cc8c303bb37a4aa022cb66b39968d42fb59fc6f10b3c586e555524d6`。 |
| M-2 WC 标识缺失 | PASS。WC-RECORD 明确冻结 commit、ZIP SHA、R1-2 installedPath、旧 R1 失败证据与零 trust 边界。 |

## 候选与安装证据

- Runtime freeze：`c0f8d6e84bd53711a89956578a4ef22de8a7e440`。
- ZIP：`claude-to-codex-plugin-sprint08-candidate.zip`。
- SHA256：`aaa5edf7cc8c303bb37a4aa022cb66b39968d42fb59fc6f10b3c586e555524d6`。
- Verify：`VERIFY=OK checked=28 extra=0`；Python zipfile `testzip()` 无错误。
- Manifest：version `sprint08-candidate`、sourceCommit `c0f8d6e…`、29 entries；plugin `version=1.3.0` 保持候选未发布状态。
- R1-2 installedPath：`/home/dell/projects/ctc-s08-r1-home-2/plugins/cache/claudetocodex-dev/claudetocodex/1.3.0`。
- 安装缓存 vs manifest：27/27 插件文件 SHA256 与 bytes 一致；无缺失或额外文件。
- 安装候选测试：115 tests / 113 pass / 0 fail / 2 explicit skip（两项 release 构建测试因安装缓存不是 Git checkout 显式跳过）。
- 安装候选 `sessions` 探针 exit 0。
- 包内 29 entries 未发现 API key / bearer token 模式；delivery `.ps1` 为 0，`transport.mjs` 在包内，`Test-Acceptance.ps1` 按计划保留。

## 测试复核

| 环境 | SM 独立结果 |
|---|---|
| Linux source tree | 115 / 115 pass，0 fail，0 skip。 |
| Linux plugin tree | 115 / 115 pass，0 fail，0 skip。 |
| 原生 Windows checkout（D: 盘，非 UNC） | 115 tests / 100 pass / 0 fail / 15 explicit skip。 |
| Windows 经 `\\wsl.localhost` UNC 运行 | 一次全量出现 1 个并发 hook 用例 ENOENT；单独重跑 1/3 通过。随后原生 D: checkout 同用例 3/3 通过、全量 0 fail。判定为 UNC 测试环境波动，不是候选产品路径证据。W10 必须在原生 Windows checkout / 同源候选安装执行，不得以 UNC 结果替代。 |

## 冻结纪律

`c0f8d6e..HEAD` 仅新增 WC 记录，`bridge/` 与 `plugins/claudetocodex/` 无变化。本 SM 复核记录也仅是过程材料，不改变候选。后续任何插件树 / 用户文档 / 构建逻辑变化都必须重建候选、更新 SHA 并重新 SM 复核；过程材料提交不改变 runtime freeze，但需保持逐文件差异可审计。

## W8 前置

1. 仅使用 R1-2 与上述 ZIP / manifest 对应的 installedPath。
2. PO 在 R1-2 home 首启 Codex，审阅并信任三条 hooks；记录实际执行者、trust hash 与时间。
3. PO / Operator 确认或设置本轮 Claude `crossSessionInbound=accept`，并记录策略与批准行为。
4. W8 全部现场证据取自 R1-2 安装候选，不以开发树或 UNC Windows 测试替代。
