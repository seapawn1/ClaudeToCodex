# Sprint 02 - Install, Package, Release

日期：2026-09-09。参与者：PO、Scrum Master / Codex、Developer / Claude Code。

时间盒：2026-09-09 至 2026-09-15（Asia/Shanghai，一周上限，可提前交付）。

状态：第一、二节已定稿；Developer 审阅无阻塞意见（`CTC-SPRINT02-REDUCED-DRAFT-REVIEW-L`），第三节由 Developer 填写并维护。

## 1. Sprint Goal 与 DoD

### 1.1 Sprint Goal

发布 ClaudeToCodex 1.0.0，使目标用户在声明支持的 Windows 环境中，仅凭发布物和使用说明，即可完成安装、配置，并在 Codex 与 Claude Code 的原始会话之间开展双向工作交流。

首批用户为 PO 本人，本次只交付基于现有能力的最小版本包。

### 1.2 DoD

以下原文摘自 [Product Backlog](../ProductBacklog.md)（`3fa8fa9`）。

#### Definition of Outcome Done

PO 在真实使用场景中亲身体验产品，确认当前 Product Goal 所约定的价值已经实现，并记录体验场景与结论。

#### Definition of Output Done

Increment 已集成到产品中，可通过标准产品入口使用，通过与其声明范围相适应的质量验证，并由 PO 按事先约定的验收标准验收通过。

PO 验收是本团队的完成标准，可在 Sprint 内进行。技术质量验证与 PO 验收均须通过；验收中新发现的需求进入 Product Backlog，不自动改写已约定的完成标准。

## 2. PBI 与精化

### 2.1 PBI 原文

本次仅选 PBI-05，以下整行照抄 Product Backlog，包含其原状态；本次施工状态由第三节维护。

| 编号 | 标题 | 用户故事 | 架构定位 | 当前状态 | 备注 |
|---|---|---|---|---|---|
| PBI-05 | 1.0.0 版本发布与分发 | 作为首批用户，我要取得有明确版本的正式发布物，以便保存、再次获取并安装同一版本产品。 | 建立独立于开发工作区的分发产物与版本说明；发布渠道和包格式待确定。 | 待精化 | 验收：PO 可从约定位置取得标识为 `1.0.0` 的完整发布物和版本说明，安装使用不依赖开发工作区；说明明确分发内容、前置条件、支持范围及限制，渠道、可见范围和分发许可与首批使用方式一致。正式发布前，PO 使用最终分发的同一份发布物，在无现成 bridge 配置的新环境或项目中按说明安装、配对，完成双向请求、回复、追问与再答并验收通过；体验中反馈用于推进真实协作事项，PO 无需转述业务消息，记录版本、环境、问题与体验结论。 |

### 2.2 本次精化与验收标准

PBI-05 不再拆成多个 PBI。只做「打包、最短说明、从包开始验收」三部分，复用现有 bridge 和安装入口。

| 内容 | 本次精化 | 验收标准 |
|---|---|---|
| 版本包 | 本地 ZIP，配套版本说明与文件清单；保存到 `%LOCALAPPDATA%\ClaudeToCodex\releases\1.0.0\`，对应 Git tag `v1.0.0`，仅供 PO 本人获取使用。 | PO 能取得并保存明确标识版本的完整包，可核对来源版本与文件清单；包中不夹带本机会话端点、令牌、配对或消息记录。 |
| 最短安装使用说明 | 复用现有安装命令，在无现成 bridge 配置的新项目启用；说明前置条件、解压位置、安装、必要信任与重载、Claude 侧入站策略确认、登记、配对及发送回复，沿用当前已声明的能力边界。 | 在仓库之外解压，PO 仅按包内说明即可安装并使用；产品入口及 hook 路径指向解压后的产品文件，不依赖开发工作区。 |
| 一轮 PO 验收 | 对实际准备分发的同一份包，在上述新项目中完成一次真实协作往返；复用适用的现有离线回归。 | 适用回归通过；两个原始会话完成请求、回复、追问与再答，以唯一标记和接收方原始会话事件核对，反馈推进实际工作且 PO 无需转述；记录版本、环境、问题与 PO 结论。正式发布的包与验收通过的包一致。 |

验收双方的原始会话及其 hook 使用同一独立的 `CTC_BRIDGE_DIR`，与当前 Planning 桥的数据目录区分；此为现有配置方式，不增加产品功能。

PBI-02、03、06、07 均留在 Product Backlog。本次不另做安装器、卸载、换位置重装、升级、混合 hook 配置兼容改进或扩展故障排查。若发现直接阻塞上述最小场景的问题，先摊开具体证据，只讨论实现本目标所需的最小处理。

## 3. Developer 施工计划

按「先定包内容与说明，再自检候选包，候选就位后 PO 验收，通过后正式定版发布」推进。除 WI-05 需 PO 参与外，其余由 Developer 独立完成；每个工作项不超过一天。

| # | 工作项 | 内容 | 验证 | 状态 |
|---|---|---|---|---|
| WI-01 | 发布物清单与打包脚本 | 包内容：`bridge/`（代码、delivery、docs、test、release）、`INSTALL.md`、`RELEASE-NOTES.md`、构建时生成的 `manifest.json`（每文件 SHA256、版本、来源 commit）；打包脚本 `bridge/release/Build-Release.ps1` 从指定 Git ref 构建 ZIP，保留 `bridge/` 目录层级；校验脚本 `bridge/release/Verify-Release.ps1` 供核对清单与哈希。 | 脚本从 Git ref 构建出候选包 | 完成 |
| WI-02 | 最短安装使用说明与版本说明 | `INSTALL.md` 覆盖 2.2 枚举全部步骤（含 Claude 侧入站策略确认与双侧一致 `CTC_BRIDGE_DIR`）；`RELEASE-NOTES.md` 覆盖分发内容、前置条件（Node 已验证基线 v24.14.0）、支持范围与限制、使用范围声明。 | 与 2.2 三行验收逐项对照 | 完成 |
| WI-03 | 候选包自检（预发布） | 仓库外解压候选包：`Verify-Release.ps1` 核对 manifest；运行三套离线回归；在临时干净项目执行 `install --hooks-file`，核对 hook 命令指向解压位置；不运行 register（避免干扰 Planning 桥端点）。 | 校验通过；回归通过；hook 路径锚定包内 cli.mjs | 完成 |
| WI-04 | 候选资产准备与草稿 Release（非正式） | 候选 ZIP 与 `.sha256` 本地构建、自检并在 `%LOCALAPPDATA%\ClaudeToCodex\releases\candidates\1.0.0\` 暂存（仅为构建暂存）；目标仓库确认后上传为 **GitHub 草稿 Release** 资产供 PO 下载；**不打正式 tag、不正式发布**；Developer 不自行选择可见性、不创建仓库。 | 草稿 Release 中的资产与本地候选为同一文件（SHA256 一致） | 进行中 |
| WI-05 | PO 验收轮（需 PO 参与） | PO **从 GitHub 草稿 Release 下载同一份 ZIP**，在无现成 bridge 配置的新项目按 `INSTALL.md` 完成安装、配对与双向请求/回复/追问/再答；双侧原始会话及 hook 使用同一独立 `CTC_BRIDGE_DIR`；唯一标记与接收方原始会话事件核对；PO 记录版本、环境、问题与结论。 | 2.2 验收标准；验收对象与后续正式发布资产为同一文件 | 待开始 |
| WI-06 | 正式发布（PO 验收通过后） | 在验收通过的 commit 上打 tag `v1.0.0`；将**通过验收的同一份资产**转为正式 GitHub Release（不重建、不重传不同内容），复核校验值一致；manifest 中 `sourceCommit` 即 tag 指向的 commit。 | tag、manifest、正式 Release 资产三者可核对；正式资产与验收资产校验值一致 | 待开始 |

顺序依据：PBI-05 原验收要求「正式发布前，PO 使用最终分发的同一份发布物…验收通过」，故 PO 验收（WI-05）先于正式 tag 与正式位置（WI-06）；验收未通过则修复、重建候选、重新验收， tag 始终落在最终通过的 commit 上。

进度记录：

- 2026-09-09：第三节填写完成，WI-01 开工。
- 2026-09-09：WI-01/02 完成（commit `e26f990` + 校验脚本补充提交）；依 DOD-ORDER-N 调整顺序为「候选就位 → PO 验收 → 正式 tag 与发布」，未打 tag、未写入正式位置；WI-03 进行中。
- 2026-09-09：WI-03 自检通过——`Verify-Release.ps1` 对候选 ZIP 校验 `VERIFY=OK`（15 文件、0 多余）；解压副本（仓库外）离线回归 16/16；临时干净项目两次 install 后 hook 命令仍单组且指向解压位置、退出码 0。
- 2026-09-09：WI-04 完成——候选包（commit `d5d1c31`，SHA256 `01b52e9c…d38f7f`）就位 `%LOCALAPPDATA%\ClaudeToCodex\releases\candidates\1.0.0\`，就位后校验值复核一致。下一步 WI-05 等 PO 参与。
- 2026-09-09：依 ACCEPTANCE-PREP-P 修正 INSTALL.md 步骤 3（先进入目标项目目录再启动会话；Codex 必须在目标项目目录内启动才能读到项目级 `.codex\hooks.json`）并对齐第三节开头顺序。候选包重建并替换就位（新 commit `81dffd1`，SHA256 `426b66a7…5a4f`，取代 `01b52e9c…`）：Verify-Release 全文件核对 OK，包内 INSTALL 已含新步骤；代码未变，回归结论（16/16）沿用。仍无 tag、正式位置未写入。
- 2026-09-09：依 GITHUB-DISTRIBUTION-R（PO 纠正分发渠道为 GitHub Release）：INSTALL.md 步骤 1 改为「从 GitHub Release 获取（验收阶段用草稿 Release 同一份资产）」；RELEASE-NOTES.md 分发与使用范围改为 GitHub Release、可见性与许可以发布仓库设置及声明为准；第三节 WI-04/05/06 改为「本地候选暂存 → 草稿 Release 资产 → PO 下载验收 → 验收通过后同一资产转正式 Release」。本地 `releases\candidates\1.0.0\` 降级为构建暂存。核查：本仓库当前无 origin remote；本机 gh 2.97.0 已登录 `seapawn1`——草稿 Release 技术可行，待 SM/PO 确认目标仓库与可见性后执行上传；Developer 不自行选择可见性、不创建仓库、不正式发布。
