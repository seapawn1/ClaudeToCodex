# Sprint 02 - Install, Package, Release

日期：2026-09-09。参与者：PO、Scrum Master / Codex、Developer / Claude Code。

时间盒：2026-09-09 至 2026-09-15（Asia/Shanghai，一周上限，可提前交付）。

状态：按 PO 首用反馈新增 PBI-08，与 PBI-05 共同交付 Codex CLI 插件；Developer 审阅后施工，SM 技术验收通过后交 PO 亲身验收。旧 ZIP 为前一候选的证据，不代表新插件已通过验收。

## 1. Sprint Goal 与 DoD

### 1.1 Sprint Goal

发布 ClaudeToCodex 1.0.0，使目标用户在声明支持的 Windows 环境中，仅凭发布物和使用说明，即可完成安装、配置，并在 Codex 与 Claude Code 的原始会话之间开展双向工作交流。

首批用户为 PO 本人，使用入口限定 Codex CLI。基于现有 bridge 交付最小插件，通过 GitHub 分发；用户安装插件并完成必要授权后，指定已运行的 Claude 会话即可交流，不手动管理端点、会话 ID 或桥数据目录。

### 1.2 DoD

以下原文摘自 [Product Backlog](../ProductBacklog.md)（`3fa8fa9`）。

#### Definition of Outcome Done

PO 在真实使用场景中亲身体验产品，确认当前 Product Goal 所约定的价值已经实现，并记录体验场景与结论。

#### Definition of Output Done

Increment 已集成到产品中，可通过标准产品入口使用，通过与其声明范围相适应的质量验证，并由 PO 按事先约定的验收标准验收通过。

PO 验收是本团队的完成标准，可在 Sprint 内进行。技术质量验证与 PO 验收均须通过；验收中新发现的需求进入 Product Backlog，不自动改写已约定的完成标准。

## 2. PBI 与精化

### 2.1 PBI 原文

本次选择 PBI-05 与 PBI-08，以下整行照抄当前 Product Backlog，包含其原状态；本次施工状态由第三节维护。

| 编号 | 标题 | 用户故事 | 架构定位 | 当前状态 | 备注 |
|---|---|---|---|---|---|
| PBI-05 | 1.0.0 版本发布与分发 | 作为首批用户，我要取得有明确版本的正式发布物，以便保存、再次获取并安装同一版本产品。 | 建立独立于开发工作区的分发产物与版本说明；发布渠道和包格式待确定。 | 待精化 | 验收：PO 可从约定位置取得标识为 `1.0.0` 的完整发布物和版本说明，安装使用不依赖开发工作区；说明明确分发内容、前置条件、支持范围及限制，渠道、可见范围和分发许可与首批使用方式一致。正式发布前，PO 使用最终分发的同一份发布物，在无现成 bridge 配置的新环境或项目中按说明安装、配对，完成双向请求、回复、追问与再答并验收通过；体验中反馈用于推进真实协作事项，PO 无需转述业务消息，记录版本、环境、问题与体验结论。 |
| PBI-08 | Codex CLI 插件化与免手动配置连接 | 作为用户，我要在 Codex CLI 安装插件后，指定一个正在运行的 Claude 会话即可交流，无需手动登记端点、复制会话 ID、配置数据目录或操作 Claude 侧桥命令，保留必要授权。 | 将现有 bridge、连接 skill 与必要 hooks 封装为 Codex CLI 插件，自动发现并连接选定的 Claude 原始会话，向其提供可直接使用的回复入口与数据位置；沿用 Windows 本机、单对会话、短文本串行通信。 | 待 Developer 审阅 | 验收：AC-08-01 插件可通过声明的 Codex CLI 插件入口安装并在新会话加载，skill 与 hooks 指向安装位置，不依赖开发工作区；AC-08-02 按用户指定的会话连接，找不到、重名或端点失效时明确提示，不连错对象、不静默替换已有不同配对；AC-08-03 用户无需执行 register/pair、复制 ID 或设置桥环境变量，Claude 无需安装插件或手动配置桥即可使用收到的回复入口；AC-08-04 请求、回复、追问保持对象与关联正确，hook 不重复注入；AC-08-05 保留宿主必要授权，不自动修改接收策略，失败不伪报成功，凭据不出现在消息或日志中。提供逐项对应 AC 的可重复技术检查，失败返回非零状态，跳过或受阻不得计为通过；模拟测试与真实宿主加载证据分开记录，SM 技术验收后再由 PO 亲身端到端验收。 |

### 2.2 本次精化与验收标准

PBI-08 负责插件与自动连接，PBI-05 负责分发同一插件候选及验收后的发布。复用现有通信核心，不另开预研；Developer 先实现最小插件，随施工做加载和连接自检。

| 条目 | 本次精化 | 验收标准与证据 |
|---|---|---|
| PBI-08 / AC-08-01 插件加载 | 提供插件清单、一个连接与通信 skill、必要 hooks 及现有 bridge；安装方式符合目标 Codex CLI 实际支持的插件入口。 | 自动校验包结构、引用路径和插件安装位置；在隔离配置下执行真实 Codex CLI 加载检查，记录版本及 skill/hooks 可用证据。文件存在或模拟配置通过不能替代宿主加载。 |
| PBI-08 / AC-08-02 自动建联 | 通过会话名称选择已运行的 Claude 原始会话，自动发现端点并建立配对；选择不唯一时返回候选供用户确认。 | 自动测试唯一匹配、找不到、重名、旧注册记录、端点失效与已有不同配对；不误连、不静默覆盖，报错不伪报成功。 |
| PBI-08 / AC-08-03 免手动配置 | 用户不执行桥命令、不复制 ID、不设置 CTC_BRIDGE_DIR；Claude 不安装插件、不手动 register，也能按消息所附入口回复。数据位置由产品自动管理。 | 隔离进程测试双方未预设桥环境变量时的登记、配对和回复路由；回复命令指向实际安装位置及本次连接的数据，不能依赖开发会话的环境。 |
| PBI-08 / AC-08-04 双向通信 | 沿用单对会话、短文本、串行请求/回复/追问与普通消息 priority=next，维持去重和原会话身份。 | 复用并扩展管道、存储、hook 回归，自动核对对象、conversationId/replyTo、消息正文及注入次数。真实会话收信仍以唯一标记加接收方原始会话事件判定。 |
| PBI-08 / AC-08-05 授权与失败行为 | 保留插件 hooks 信任及 Claude 入站所需授权；不自动改权限或绕过提示。 | 自动核对接收设置不被修改、连接异常和超时不返回成功、凭据不出现在正文及日志中。授权提示或宿主不可用时报告受阻，不以跳过代替通过。 |
| PBI-05 插件分发与说明 | GitHub 候选提供插件包、校验值、版本说明和实际可用的安装入口；README/INSTALL 按「安装插件、必要授权、选择会话、交流」说明，替代手动 register/pair 教程作为首用路径。 | 从 GitHub 重新下载，核对包、manifest 和来源版本；包内无端点、令牌、配对或消息记录。在仓库外通过插件入口安装，引用不回指开发工作区。 |
| SM 技术验收与 PO 验收 | Developer 提供一条可重复执行的技术验收入口和 AC 对应报告；SM 检视实现、运行检查并核对候选后，才通知 PO 亲身验收。 | 技术报告逐项列出通过、失败或受阻，失败/受阻返回非零退出码；模拟与真实宿主证据分别记录。PO 从 GitHub 安装同一插件候选，完成真实请求、回复、追问与再答并记录体验结论；技术通过不代替 PO DoD。 |

目标仓库：[seapawn1/ClaudeToCodex](https://github.com/seapawn1/ClaudeToCodex)，可见性为公开。当前未附开源许可证，按此事实说明许可状态，不自行新增许可证授权；「首批用户是 PO 本人」不限制发布渠道为本地。

测试数据与当前 Planning 桥隔离，由产品和测试工具处理，不能要求最终用户手动设置桥环境变量。宿主必要授权由相应用户或权限机制完成，自动化不得代为授予。

PBI-02、03、06、07 继续留在 Product Backlog，本次不整体纳入。范围不增加桌面端、多会话并发、卸载、升级或自动恢复；仅处理目标 Codex CLI 插件安装及一次连接所必需的行为。必要的实现选择与任务拆解由 Developer 负责；影响 Goal 或显著扩大范围时及时摊开。

后续顺序：Developer 自检 → SM 技术验收 → PO 亲身验收 → Sprint Review → Sprint Retrospective → 正式发布同一份通过验收的插件资产。前一 ZIP 候选保留为历史，不沿用其验收状态或哈希指代新插件。

## 3. Developer 施工计划

PO 依首用反馈新增 PBI-08（Codex CLI 插件化与免手动配置连接），当前按 WI-07..12 插件路线施工。每个工作项不超过一天；除标注需 SM/PO 参与外由 Developer 独立完成。

### 3.1 当前计划（插件路线）

| # | 工作项 | 内容 | 验证 | 状态 |
|---|---|---|---|---|
| WI-07 | 插件格式与自动发现核验 + 骨架 | 依官方文档核实 Codex CLI 插件格式（`.codex-plugin/plugin.json`、`.agents/skills/`、`hooks/hooks.json`）与隔离加载机制；核实 `~/.claude/sessions` 可发现字段（会话名、id、管道、peer key）。产出最小插件骨架与事实清单。 | 骨架在隔离配置下被真实 Codex CLI 加载（skill/hooks 可见）；事实清单记入本节 | 完成 |
| WI-08 | 插件封装与免手动连接 | bridge 封装进插件结构；连接 skill 枚举运行中 Claude 会话、按名选择、自动发现端点并建联；处理唯一匹配/找不到/重名/端点失效/已有不同配对五类行为；回复指引携带安装位置与数据位置（扩展 renderPeer）。 | 五类建联行为自动测试通过；Planning 桥不受影响 | 完成（真实宿主 connect 现场留待 WI-09/验收轮） |
| WI-09 | AC-08-01..05 技术检查与证据 | 一条可重复技术验收入口，逐 AC 报告（通过/失败/受阻），失败/受阻非零退出；扩展 store/pipe/hook 回归；真实宿主加载证据与模拟测试分开记录。 | 全部 AC 有报告；模拟/真实证据齐备 | 完成（8 通过/0 失败/2 受阻；01c/01d 宿主证据待 SM 轮以 -HookEvidence/-SkillEvidence 复判） |
| WI-10 | 插件候选分发（PBI-05） | Build-Release 产插件包（含 manifest）；README/INSTALL 重写为「安装插件 → 必要授权 → 选择会话 → 交流」；上传 GitHub 草稿 Release 新候选并回读核对。 | GitHub 下载资产与本地构建哈希一致；包内无凭据 | 完成 |
| WI-11 | SM 技术验收与 PO 亲身验收（需 SM/PO 参与） | SM 运行技术验收入口并独立审查实现与候选；通过后通知 PO，PO 从 GitHub 安装同一插件候选，完成真实请求/回复/追问/再答并记录结论。 | SM 验收记录 + PO DoD 结论；技术通过不代替 PO DoD | 进行中（SM 验收：F01/F02/F03 复验通过；AC-08-01c 受阻——3 hooks untrusted，等宿主授权后做真实执行验证；PO 验收未开始） |
| WI-12 | 正式发布（PO 验收、Review、Retro 均结束后经 SM 交接） | 在验收通过的 commit 打 tag `v1.0.0`；同一份插件资产转正式 Release；tag/manifest/资产三者可核对。 | 正式资产与验收资产校验值一致 | 待开始 |

顺序：Developer 自检（WI-07～09）→ 插件候选分发（WI-10）→ SM 技术验收 → PO 亲身验收（WI-11）→ Sprint Review → Sprint Retrospective → 正式发布（WI-12）。前 ZIP 候选（SHA256 `c5d448d4…`）保留为历史证据，其验收状态与哈希不指代新插件候选。

### 3.2 历史：前 ZIP 候选施工记录（保留为证据；完成状态不表示插件工作已完成）

按「先定包内容与说明，再自检候选包，候选就位后 PO 验收，通过后正式定版发布」推进。除 WI-05 需 PO 参与外，其余由 Developer 独立完成；每个工作项不超过一天。

| # | 工作项 | 内容 | 验证 | 状态 |
|---|---|---|---|---|
| WI-01 | 发布物清单与打包脚本 | 包内容：`bridge/`（代码、delivery、docs、test、release）、`INSTALL.md`、`RELEASE-NOTES.md`、构建时生成的 `manifest.json`（每文件 SHA256、版本、来源 commit）；打包脚本 `bridge/release/Build-Release.ps1` 从指定 Git ref 构建 ZIP，保留 `bridge/` 目录层级；校验脚本 `bridge/release/Verify-Release.ps1` 供核对清单与哈希。 | 脚本从 Git ref 构建出候选包 | 完成 |
| WI-02 | 最短安装使用说明与版本说明 | `INSTALL.md` 覆盖 2.2 枚举全部步骤（含 Claude 侧入站策略确认与双侧一致 `CTC_BRIDGE_DIR`）；`RELEASE-NOTES.md` 覆盖分发内容、前置条件（Node 已验证基线 v24.14.0）、支持范围与限制、使用范围声明。 | 与 2.2 三行验收逐项对照 | 完成 |
| WI-03 | 候选包自检（预发布） | 仓库外解压候选包：`Verify-Release.ps1` 核对 manifest；运行三套离线回归；在临时干净项目执行 `install --hooks-file`，核对 hook 命令指向解压位置；不运行 register（避免干扰 Planning 桥端点）。 | 校验通过；回归通过；hook 路径锚定包内 cli.mjs | 完成 |
| WI-04 | 候选资产准备与草稿 Release（非正式） | 候选 ZIP 与 `.sha256` 本地构建、自检并在 `%LOCALAPPDATA%\ClaudeToCodex\releases\candidates\1.0.0\` 暂存（仅为构建暂存）；目标仓库确认后上传为 **GitHub 草稿 Release** 资产供 PO 下载；**不打正式 tag、不正式发布**；Developer 不自行选择可见性、不创建仓库。 | 草稿 Release 中的资产与本地候选为同一文件（SHA256 一致） | 完成 |
| WI-05 | PO 验收轮（需 PO 参与） | PO **从 GitHub 草稿 Release 下载同一份 ZIP**，在无现成 bridge 配置的新项目按 `INSTALL.md` 完成安装、配对与双向请求/回复/追问/再答；双侧原始会话及 hook 使用同一独立 `CTC_BRIDGE_DIR`；唯一标记与接收方原始会话事件核对；PO 记录版本、环境、问题与结论。 | 2.2 验收标准；验收对象与后续正式发布资产为同一文件 | 待开始 |
| WI-06 | 正式发布（PO 验收通过 **且 Sprint Review 与 Retrospective 结束后**，经 SM 交接执行） | 在验收通过的 commit 上打 tag `v1.0.0`；将**通过验收的同一份资产**转为正式 GitHub Release（不重建、不重传不同内容），复核校验值一致；manifest 中 `sourceCommit` 即 tag 指向的 commit。**取包来源约束：重传备选只能使用已验收的 GitHub 资产（SHA256 `c5d448d4…5c563`，可从 GitHub 重新下载或用已验证回读副本）；本地 `releases\candidates\1.0.0\` 中为过期旧包（`32e2a385…`，commit `95fc7f7` 时期产物），不得取用。** | tag、manifest、正式 Release 资产三者可核对；正式资产与验收资产校验值一致 | 待开始（技术准备就绪，按新顺序等待） |

顺序依据：PBI-05 原验收要求「正式发布前，PO 使用最终分发的同一份发布物…验收通过」，故 PO 验收（WI-05）先于正式发布（WI-06）；依 PO 最新决定（RELEASE-AFTER-EVENTS-W），正式发布进一步排在 **Sprint Review 与 Sprint Retrospective 均结束之后**，由 SM 在两项事件结束后交接执行。验收未通过则修复、重建候选、重新验收，tag 始终落在最终通过的 commit 上。当前候选包字节与 GitHub 草稿保持原样。

进度记录：

- 2026-09-09：第三节填写完成，WI-01 开工。
- 2026-09-09：WI-01/02 完成（commit `e26f990` + 校验脚本补充提交）；依 DOD-ORDER-N 调整顺序为「候选就位 → PO 验收 → 正式 tag 与发布」，未打 tag、未写入正式位置；WI-03 进行中。
- 2026-09-09：WI-03 自检通过——`Verify-Release.ps1` 对候选 ZIP 校验 `VERIFY=OK`（15 文件、0 多余）；解压副本（仓库外）离线回归 16/16；临时干净项目两次 install 后 hook 命令仍单组且指向解压位置、退出码 0。
- 2026-09-09：WI-04 完成——候选包（commit `d5d1c31`，SHA256 `01b52e9c…d38f7f`）就位 `%LOCALAPPDATA%\ClaudeToCodex\releases\candidates\1.0.0\`，就位后校验值复核一致。下一步 WI-05 等 PO 参与。
- 2026-09-09：依 ACCEPTANCE-PREP-P 修正 INSTALL.md 步骤 3（先进入目标项目目录再启动会话；Codex 必须在目标项目目录内启动才能读到项目级 `.codex\hooks.json`）并对齐第三节开头顺序。候选包重建并替换就位（新 commit `81dffd1`，SHA256 `426b66a7…5a4f`，取代 `01b52e9c…`）：Verify-Release 全文件核对 OK，包内 INSTALL 已含新步骤；代码未变，回归结论（16/16）沿用。仍无 tag、正式位置未写入。
- 2026-09-09：依 GITHUB-DISTRIBUTION-R（PO 纠正分发渠道为 GitHub Release）：INSTALL.md 步骤 1 改为「从 GitHub Release 获取（验收阶段用草稿 Release 同一份资产）」；RELEASE-NOTES.md 分发与使用范围改为 GitHub Release、可见性与许可以发布仓库设置及声明为准；第三节 WI-04/05/06 改为「本地候选暂存 → 草稿 Release 资产 → PO 下载验收 → 验收通过后同一资产转正式 Release」。本地 `releases\candidates\1.0.0\` 降级为构建暂存。核查：本仓库当前无 origin remote；本机 gh 2.97.0 已登录 `seapawn1`——草稿 Release 技术可行，待 SM/PO 确认目标仓库与可见性后执行上传；Developer 不自行选择可见性、不创建仓库、不正式发布。
- 2026-09-09：依 TARGET-HANDOFF-T（PO 授权公开仓库 seapawn1/ClaudeToCodex）：文档落定具体仓库与许可事实（commit `f2d12c9`——仓库公开、尚未附开源许可证、作者保留权利）；最终候选构建并校验（16 文件，SHA256 `c5d448d4…5c563`）；`main` 已推送 origin（仅 main，无 force）；草稿 Release 已建：标签名 `v1.0.0-candidate.1`（**草稿不产生 tag ref，已实测远端 tags 为空**；发布时才会在目标 commit 创建 tag）、target `f2d12c9`、三项资产（ZIP、`.sha256`、`RELEASE-NOTES.md`）。GitHub 服务端资产 digest 与本地构建一致；从 GitHub 重新下载回读校验：ZIP SHA256 一致、`Verify-Release` 全文件 `VERIFY=OK`。**WI-04 完成，WI-05 就绪**——PO 从草稿 Release（https://github.com/seapawn1/ClaudeToCodex/releases/tag/untagged-1bcb0f216620d4e96ccf，需仓库权限）下载同一份 ZIP 验收；验收通过后 WI-06 在 `f2d12c9` 打正式 tag `v1.0.0` 并发布同一份资产。
- 2026-09-09：依 RELEASE-AFTER-EVENTS-W（PO 决定）：正式发布顺延至 Sprint Review 与 Retrospective 均结束后由 SM 交接执行（新顺序：PO 验收 → Review → Retro → 正式发布同一份 GitHub 资产）。技术准备（WI-01～04）已就绪，WI-05 等 PO 亲身验收；候选包字节与 GitHub 草稿保持原样，未重跑已通过的验证，未改 DoD/PBI 原文，PBI-05 未标记 Done。
- 2026-09-09：依 PLUGIN-PBI-REVIEW-X：审阅 PBI-08 与第一、二节无阻塞（插件机制已核实存在：.codex-plugin/plugin.json + .agents/skills/ + hooks/hooks.json，官方文档，Codex v0.117.0+）；第三节改为插件路线 WI-07..12，旧 WI-01..06 移入 3.2 历史记录。WI-07 开工。
- 2026-09-09：WI-07 完成核心核验与骨架（提交 7f23645，sprint 分支）。事实清单：①插件清单 .codex-plugin/plugin.json（name/version/description/author/repository/skills/interface；defaultPrompt 为字符串数组）；②skill 自动发现 skills/<name>/SKILL.md；③hooks 默认 hooks/hooks.json，无需 manifest 字段；④marketplace 清单位于仓库根 .agents/plugins/marketplace.json，条目 source 对象 tag 字段为 "source"（{source:local,path:./plugins/<name>}）——误写 "type" 落入 unsupported source 被静默跳过（SM MANIFEST-REVIEW-AC 指出，实测证实）；⑤安装链 marketplace add <本地根> → plugin add <name>@<marketplace> → 缓存 <CODEX_HOME>/plugins/cache/<marketplace>/<plugin>/<version>/，插件树自包含复制；⑥插件 hook 属非 managed，需用户信任。隔离实测：CODEX_HOME=临时目录子进程环境完成 add/add/list，installed+enabled，bridge\cli.mjs 已随缓存复制；对照插件 history-library@personal 同法安装成功；未触碰用户全局配置。待补证据：真实宿主会话内 hook 发现/执行（信任后）——WI-09 记录。~/.claude/sessions/<pid>.json 含 sessionId/name/messagingSocketPath/status/cwd + 同名 .key（peer key），自动发现输入齐备。下一步 WI-08。
- 2026-09-09：WI-08 完成——新增 bridge/sessions.mjs（枚举 ~/.claude/sessions 注册表：名称/sessionId/管道/存活/peer key，CTC_SESSIONS_DIR 供测试隔离）与 cli 子命令 sessions/connect（按名选择→DPAPI 合成端点→pair；找不到/重名/进程已死/缺 key 明确报错，不同配对拒绝静默替换沿用 store.pair 原有保护）；renderPeer 扩展为携带数据目录前缀与安装路径的回复入口（Claude 侧零配置即可回复）；插件 hooks/hooks.json 换为真实 bridge hook（node "${PLUGIN_ROOT}/bridge/cli.mjs" hook），SKILL.md 写入正式连接/发送/回复指引（经 codex plugin list 定位安装位置）；探针移除。回归：根 bridge 23/23（含新增 connect.test.mjs 7 用例：无匹配/重名/已死/缺 key/唯一成功/不同配对拒绝/清单无密钥），插件副本同步后 23/23。PLUGIN_ROOT 展开语法与真实 connect 现场留待 WI-09 与 SM 验收轮。分支已按 BRANCH-AND-HOST-AE 推送 origin 同名备份。
- 2026-09-09：WI-09 完成——技术验收入口 bridge/release/Test-Acceptance.ps1（单命令、逐 AC 报告、失败/受阻非零退出、模拟与真实宿主证据分离）。按对抗式审计（19 个独立审计/复核代理、23 条原始发现、10 项主题确认）修复：①全部模拟判定改为以发布副本 plugins/claudetocodex 为准；②回复入口断言锚定被测模块 commandString()；③安装缓存强校验（SKILL.md/hooks 锚定/无开发工作区引用扫描）；④05b 扩展为名称+内容扫描（.key/pair.json/events.jsonl/数据目录/DPAPI 样块）；⑤05c 同时扫发布与开发树；⑥01b 区分 FAIL 与 BLOCKED、快照恢复 CODEX_HOME；⑦01c/01d 诚实措辞（调用方举证、出处由 SM 判断）；⑧新增用例：畸形 socket、死管道 send 非零且无 submitted、无环境变量时默认数据目录；⑨产品修复：connect 的 peer key 改经进程环境传递（不再上命令行）、DPAPI 失败不回显密钥；⑩UTF-8 编码、解析失败计数、隔离 node home、残留警告。当前：8 通过 / 0 失败 / 2 受阻（01c hook 执行、01d skill 可用性——待 SM 验收轮以 -HookEvidence/-SkillEvidence 复判）。connect 套件 11/11（根与发布副本一致）。
- 2026-09-09：WI-10 完成——Build-Release 增插件模式（ZIP 根即插件根 + RELEASE-NOTES + manifest，21 文件）；README/INSTALL/RELEASE-NOTES 重写为插件首用路径（安装插件→必要授权→选择会话→交流）；新增 docs/HOST-EVIDENCE-STEPS.md（01c/01d 真实宿主证据取得步骤，含安装副本执行证明方法与当前证据缺口）。候选：commit 4a91abd（sprint 分支），ZIP SHA256 2d171bc2bb1dce74644dba08b2feb4bc232849291851955bea38e6dfee6f80cb。GitHub 草稿 Release：标签名 v1.0.0-plugin-candidate.1（草稿不产生 tag，实测远端 tags 为空）、target 4a91abd、URL https://github.com/seapawn1/ClaudeToCodex/releases/tag/untagged-ee55cb5899579ffe5139、6 项资产（ZIP、.sha256、RELEASE-NOTES、HOST-EVIDENCE-STEPS、包内/仓库两份验收报告）。回读核对：下载 ZIP 哈希一致、Verify-Release 全文件 OK。包内运行验收 7/0/3（01b 按口径受阻：包内无 marketplace 根；01c/01d 待宿主证据）；仓库运行 8/0/2。候选安装：marketplace add … --ref sprint-02-install-package-release + plugin add claudetocodex@claudetocodex-dev。下一步 WI-11 等 SM 集中技术验收。
- 2026-09-09：依 ARTIFACT-LOCATION-AJ（PO 指令）归档修正：docs\HOST-EVIDENCE-STEPS.md 迁移至本目录（scrum\sprint-02-install-package-release\HOST-EVIDENCE-STEPS.md），README 引用同步修正；该文档无内部相对路径需改。检查本轮其他中间产物：审计/检查报告均不在仓库（会话临时目录与 GitHub 草稿资产），施工记录在第三节，产品文档（README/INSTALL/RELEASE-NOTES）保持产品职责位置；后续 Sprint 过程资料统一归本目录。插件候选（4a91abd）内容不含 docs/，字节不受影响，哈希与草稿资产不变。
- 2026-09-09：SM 集中技术验收（SM-DEFECTS-AL）确认两阻塞并已修复重交候选 2——F01（AC-08-03）：真实注册表 key 文件为 JSON（peerToken/procStartFt/pidDomain），connect 原把整份文件当令牌；现解析 JSON 仅取 peerToken，非 JSON/缺字段明确报错；回归断言解密凭据恰等于 peerToken（与 SM real-registry-token-check 同口径），夹具改为真实 JSON 结构，新增缺 peerToken 用例。F02（AC-08-01/03）：SKILL.md 改为从插件缓存布局自行定位 <PLUGIN_ROOT>（0.153.4 list 无 installedPath）；INSTALL 首用主路径改为「安装→授权→向 Codex 指定会话→交流」，桥命令移入排查参考。插件副本回归 28/28；仓库 harness 8/0/2；候选 2：commit b6286c0、SHA256 185da0bf…6cb5e6b、草稿 v1.0.0-plugin-candidate.2（https://github.com/seapawn1/ClaudeToCodex/releases/tag/untagged-9bb19c582c9897125c71）、6 资产、回读哈希一致 Verify-Release OK、远端 tags 为空。候选 1 保留为历史。SM 验收证据文件（sm-acceptance-candidate-1/）随 b6286c0 入库。待 SM 对候选 2 复验。
- 2026-09-09：依 CANDIDATE2-DOCS-AN 收口文档修正（插件字节不变，候选 2 ZIP 保留）：README 快速开始改为与 INSTALL 一致的自然语言主路径（安装→授权→指定会话→交流），命令移入排查参考并注明 list 无安装路径字段；HOST-EVIDENCE-STEPS.md 重写证据层级——安装位置/宿主加载/真实执行三层不可互替，明确「Claude 回复入口指向安装路径仅证明发送端 renderPeer 生成该路径，不构成 hook 执行证据」；步骤 2 改缓存布局定位；步骤 7 按运行方式注明预期（仓库两证齐全 10/0/0 退出 0；包内 01b 恒受阻，两证齐全 9/0/1 退出 1 属正确预期）；候选 2 草稿的 HOST-EVIDENCE-STEPS 资产同步替换。SM 通报：候选 1 宿主加载层证据已取得（skill 发现/新线程 3 hooks 加载/PLUGIN_ROOT 展开，API 原始响应），hooks untrusted、实际执行待授权；F01 针对性复验通过（matchesPeerToken=true）。协作约定：后续按明确文件列表暂存，不再 git add -A（避免扫入 SM 生成中的验收证据）。
- 2026-09-09：SM 候选 2 集中复验（汇总见 scrum/sprint-02-install-package-release/sm-acceptance-candidate-2/SM-Technical-Acceptance.md，提交 c494bdc）：F01（真实注册表认证值）、F02（skill 定位片段→实际安装目录）、F03（用户主路径与交接说明）针对性复验通过；ZIP 哈希与 19 安装文件一致、包内 28 测试通过、harness 7/0/3 退出 1；真实新 Codex 宿主发现候选 2 skill、3 条 hooks 加载并正确展开 PLUGIN_ROOT（原始响应已记录）。技术验收整体维持 BLOCKED（AC-08-01c）：三条 hooks 均 untrusted，真实执行/上下文注入证据待宿主授权后取得——SM 将向 PO 说明该授权障碍；未改信任、未用绕过参数、不将 PO 最终体验替代技术检查。候选 2 资产保持不变。
