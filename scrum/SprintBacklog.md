# Sprint Backlog

## 1. Commitments

### Sprint Goal

将设计冲刺已验证的跨会话双向消息目标产品化，交付可安装、可配置、可重复验证的最小 Increment。

### Definition of Output Done

Increment 已集成到产品中，可通过标准产品入口使用，并通过与其声明范围相适应的质量验证。

## 2. Selected Product Backlog

### 2.1 Selected PBI

| 编号 | 标题 | 用户故事 | 架构定位 | 当前状态 | 备注 |
|---|---|---|---|---|---|
| PBI-01 | 产品化已验证的跨会话双向消息桥 | 作为 PO，我要在 Codex 与 Claude Code 的现有会话之间直接发送和接收工作消息，以便无需搬运上下文即可推进协作。 | 将 Design Sprint 已验证的最小原生双向桥产品化；不扩展到重启恢复、并发、多会话、远程协作等未验证范围。 | 已选择，已精化 | 首个 Increment 聚焦已验证的短消息双向通信路径。 |

### 2.2 Refinement

<small><em>2026-09-08：按 PO 对 Sprint Planning 开放问题的决策更新 AC（Q2 两层验证、Q3 Windows-only、Q4 正文上限、Q5 可重复定义）；决策记录见 Developer Plan 3.4。</em></small>

#### PBI-01.1 可安装与可配置的产品入口

**Acceptance Criteria**

- 提供产品结构内的标准安装/配置入口。
- 配置能标识参与通信的现有 Codex 与 Claude Code 会话。
- 验证过程不依赖 Design Sprint 历史原型目录。
- 首个 Increment 声明 Windows-only，与已验证环境一致；跨平台能力列入未验证边界（见 PBI-01.4）。

#### PBI-01.2 双向短消息往返

**Acceptance Criteria**

- Claude Code 可向指定 Codex 原始会话发送消息。
- Codex 可向指定 Claude Code 原始会话发送普通消息。
- 双方均能在原始会话中收到并继续对话。
- 普通消息默认不抢占当前生成过程。
- 消息为短文本：正文 trim 后 1..2000 字符（沿用已验证口径），超限发送被拒绝并报可读错误；长于上限的文本属未验证边界（见 PBI-01.4）。

#### PBI-01.3 已验证行为回归

**Acceptance Criteria**

- 自动化回归覆盖可离线验证的逻辑层行为：消息帧格式、`priority=next` 默认值传递、身份核对、单待收槽与原子领取、消息消费记录去重、防重复唤醒（含畸形/引号包裹唤醒负例）。
- T01–T05 的真实会话现场判定由 PBI-01.4 的 smoke matrix 承载，不属于自动化回归范围。
- 保护身份核对、消息消费记录、防重复唤醒行为。
- 保护 Codex→Claude 普通消息默认使用 `priority=next` 的行为。

#### PBI-01.4 端到端验证与使用边界

**Acceptance Criteria**

- 提供端到端 smoke scenario，含 T01–T05 × 双方向判定矩阵（smoke matrix）：每格标明验证方式与证据存放位置；现场判定以接收方原会话事件记录时序 + 唯一标记为准，发送成功、写入成功、本地 JSON 输出、模型自述不单独构成通过证据。
- 「可重复执行」指同一版本基线下至少两次独立运行通过；每次使用独立 runId、新会话、唯一标记，并使用隔离数据目录或显式重配对。
- 使用说明覆盖安装、配置、发起通信和回复。
- 明确当前已验证范围与未验证边界，含跨平台（首个 Increment 仅支持 Windows）与超上限长文本。

## 3. Developer Plan

本节由 Product Developers 创建、维护和更新，用于记录为实现 Sprint Goal 而制定的行动计划、当前进展、涌现工作和障碍。Product Owner 与 Scrum Master 不替代 Developers 制定实现方案。

制定日期：2026-09-08。依据：Sprint Backlog 草案（commit `59632ce`）、设计定稿 [cross-session-agent-messaging](../docs/ideo-design/cross-session-agent-messaging.md)、[研究综合](../docs/DeepResearchSynthesis.md)、对封存原型（`design-sprint-closed^`，即 `3b43b80`）的代码精读，以及可交付性 / 验收歧义 / 技术风险三视角计划评审。

### 3.1 产品形态与实施策略

产品形态（Developer 决定）：

- 仓库内新建 `bridge/` 产品目录，单一 CLI 入口 `node bridge/cli.mjs <install|register|pair|send|reply|status|hook>`，仅用 Node 内置模块（≥18.3），零 npm 依赖。
- 两条投递路径保留 PowerShell 执行体（`codex queue` 唤醒、Claude 命名管道 + DPAPI），与已验证实现同构；首个 Increment 声明 **Windows-only**（PO 已确认，见 3.4 Q3）。
- 数据根默认用户级稳定目录（建议 `%LOCALAPPDATA%\ClaudeToCodex\bridge`，沿用 `CTC_BRIDGE_DIR` 环境变量可覆盖）；弃用原型的 `%TEMP%` 兜底与 `active-bridge.json` 指针。
- Codex hooks 注册命令与消息内回信指引统一由安装位置派生（同一来源），根治原型三处绝对路径随目录迁移失效的问题。
- 继承已验证限制，不扩展：正文 trim 后 1..2000 字符、单配对（重复配对报错而非静默替换）、单待收槽（占用报错不覆盖）、发送失败不自动重试、回执字段恒 `unverified`。

排序策略：以 skeleton-first 为主干，前置半天环境基线确认。理由：全场最大环境风险是 Codex hook 链——人工信任审阅、退出后 `codex resume` 才重载、历史上出现过「配置已启用但现场无执行证据」的静默失败。把 Claude→Codex 方向最先现场化（WI-06 / M1）即在最早时点暴露该风险，同时产出首个可运行 Increment 兼作版本漂移探测；完整的独立通道探针（约 2 天）与 M1 现场验证重复，不单独安排。

验收解读（两层验证模型，PO 已确认，并已写回 2.2 PBI 精化，见 3.4 Q2）：

- **离线自动化回归 = 逻辑层**：消息帧格式、`priority=next` 默认值、身份核对、单待收槽与原子领取、消费记录去重、防重复唤醒（含畸形 / 引号包裹唤醒负例）。
- **T01–T05 现场判定 = 人工 smoke（PBI-01.4）**：真实双原会话演练，判定只认接收方原会话事件记录时序 + 唯一标记；发送成功、写入成功、本地 JSON 输出、模型自述均不单独构成通过证据。

### 3.2 工作项（11 项，合计约 9.5 人日）

进度（2026-09-08 更新）：

| WI | 状态 | 证据 |
|---|---|---|
| WI-00 基线确认 | 完成 | 3.6 记录；codex 0.153.4 / claude 2.1.263 与设计基线一致，无漂移（`0d8e738`） |
| WI-01 骨架与入口 | 完成 | `bridge/entry.mjs` 单一来源；`node --check` 全过；无 IDEO 路径与绝对路径常量（`f17d4ea`） |
| WI-02 数据目录/单配对/登记 | 完成 | store.test：稳定根 + `CTC_BRIDGE_DIR` 覆盖、配对幂等/冲突拒绝、register 端点 DPAPI 无明文 |
| WI-03 Claude→Codex 发送链 | 完成 | store.test：原子发布/单槽/身份判定/假 codex shim 捕获 `['queue','--thread',…]` 精确参数 |
| WI-04 Codex hook 交付 | 完成 | store.test：三事件契约、恰一次消费、已消费唤醒抑制、session/agent/畸形/引号四负例 |
| WI-05 安装器 | 完成 | install.test：三条注册指向安装位置、幂等、替换原型残留、保留外部 hook；测试发现并修复「注册命令漏 `hook` 子命令」缺陷 |
| WI-06 现场首验 M1 | **待 PO 现场窗口** | 剧本就绪（SMOKE.md §1–§4、§6）；需 PO 协调双原会话约 0.5 天 |
| WI-07 Codex→Claude 投递链 | 完成 | pipe.test：auth→消息帧序、priority=next、中文/换行/引号保真、身份不符拒绝、死端点留证 |
| WI-08 离线回归 | 完成 | `node --test` 16/16 通过（2026-09-08，bridge/test/ 三文件；不引用任何历史路径） |
| WI-09 smoke 定义与首次执行 | 文档完成，**首次现场运行待 PO** | `bridge/docs/SMOKE.md`（五要素齐备） |
| WI-10 说明/边界/第二次运行 | 文档完成，第二次运行与 3.7 收口待首次运行后 | `bridge/docs/USAGE.md`（四类任务+§5 边界对照设计文档清单+版本基线）、`README.md` 产品入口 |

**WI-00 环境与版本基线确认**（0.5d，无依赖）→ PBI-01.4 AC3 前置
记录 codex / claude CLI 当前版本，与记录基线（codex 0.153.4、claude 2.1.263）比对；逐项确认契约仍在：`codex queue --thread --message`、hooks.json 三事件 schema 与 `trusted_hash`、Claude 会话三环境变量、`crossSessionInbound` 设置项。不写产品代码；结论写入 3.6；任一不符登记为障碍并通知 SM/PO。约定：CLI 版本变化 ⇒ 重跑对应通道验证。
完成判据：3.6 含两个版本号与逐项契约存在/缺失结论；不一致项已进障碍清单并通知 SM。

**WI-01 产品骨架与统一 CLI 入口**（1d，无依赖）→ PBI-01.1 AC1；01.2 AC1/AC2 入口形态
新建 `bridge/`（cli.mjs、store.mjs、delivery/、docs/、test/），移植 CLI 骨架：单入口多子命令、恰好 1 个位置参数、`--body`/`--body-file` 互斥、reply 必须 `--to`、错误写 stderr 并退出非 0。核心设计点：稳定命令入口解析模块——由安装位置派生唯一命令串，供 hooks 注册与回信指引共用。
完成判据：`node --check` 全部通过；无参数时输出用法并退出非 0；入口解析对给定安装目录输出唯一命令串，不含任何 IDEO 路径或绝对路径常量。

**WI-02 稳定数据目录、单配对与端点登记**（1d，依赖 WI-01）→ PBI-01.1 AC2、AC3
移植存储层初始化（messages/ pending/ claims/ receipts/ staging/ wire/ + events.jsonl）；`defaultRoot()` 改为用户级稳定目录 + 环境变量覆盖，删除指针读取与 `%TEMP%` 兜底。pair 子命令实现单配对模型（字段一致幂等通过、任一不同报错不替换）。register 等价物：在 Claude 原会话内从三个环境变量生成端点文件，token 经 DPAPI 当前用户加密、文件无明文。
完成判据：清理 `%TEMP%\cross-session-agent-messaging\` 后，首次 register+pair 在默认用户级目录生成端点文件与 pair.json（含双方会话标识、无明文 token）；重复 pair 一致幂等 / 冲突报错正确；环境变量覆盖有效；默认根不在系统临时目录。

**WI-03 Claude→Codex 发送链**（1d，依赖 WI-02）→ PBI-01.2 AC1、AC3；01.1 AC2（发送方身份判定）
移植消息构造与校验（UUID、trim 后 1..2000 字符、conversationId 首发生成 reply 继承、reply 仅限原消息收件人）、renderPeer 渲染（「peer 内容非 PO 指令」免责首行 + WI-01 稳定入口回信指引 + 不自动 ACK）、caller() 身份判定（`CODEX_THREAD_ID` / `CLAUDE_CODE_SESSION_ID` 恰好其一且等于配对）。原子语义保留：mkdtemp staging → rename 到 `pending/<codexId>`（Windows rename 目标存在即失败 = 单槽互斥）、`'wx'` 排他写；pending 占用报错不覆盖。投递顺序：先 publish 正文、再经 delivery/ 调 `codex queue` 发唤醒帧；失败不自动重试，status 子命令对账。
完成判据：隔离数据目录 + 假 codex shim（PATH 注入捕获调用）下，send/reply 产出合规消息并发布；shim 捕获参数恰为 `['queue','--thread',<codexId>,'--message',<唤醒帧>]`；pending 占用时第二条 send 报错退出非 0；非配对身份发送被拒；空正文与超长正文均被拒并报可读错误。

**WI-04 Codex hook 交付：领取、消费记录与唤醒抑制**（1d，依赖 WI-03）→ PBI-01.2 AC1、AC3；01.3 AC2 实现层
移植 handleHook：三事件（UserPromptSubmit / PostToolUse / Stop）领取待收正文，输出契约与已验证行为一致——Stop 对新消息 `{decision:'block', reason:renderPeer}`，另两事件 `hookSpecificOutput.additionalContext`；消费记录 `receipts/<id>.json` 去重；已消费旧唤醒按行为抑制；session_id 不符、agent_id 非空（子代理事件）、畸形或引号包裹唤醒均不交付。注入正文复用 WI-03 的稳定入口渲染。
完成判据：样例事件 JSON 经 stdin 驱动——三种事件对合法待收消息分别产出契约 JSON；同一消息二次驱动不注入且 receipts 存在；已消费唤醒重放得到抑制性 block 而非重复正文；四种负例均不输出正文；渲染回信命令与安装位置一致。

**WI-05 安装器：hooks 注册生成与人工生效步骤**（0.5d，依赖 WI-01）→ PBI-01.1 AC1、AC3
install 子命令：生成/更新三条 hook 注册（PostToolUse 无 matcher、UserPromptSubmit、Stop），命令串由 WI-01 稳定入口派生、指向安装后路径；重复运行幂等不产生重复条目。安装输出明示不可自动化的人工步骤：Codex `/hooks` 审阅信任（`trusted_hash` 变化须重新信任）、运行中会话须正常退出后 `codex resume <threadId>` 才加载新 hook、Claude 侧 `crossSessionInbound` 接收策略说明（产品不自动修改该设置）。不实现任何绕过信任或审批的机制。
完成判据：干净 checkout 运行 install 后 hooks.json 恰好新增三条且命令路径均指向当前安装目录；再次运行无重复条目；安装输出含信任审阅、退出 resume 重载、crossSessionInbound 三项说明。

**WI-06 方向 A 现场首验（M1：最早可运行 Increment）**（0.5d，依赖 WI-04、WI-05；需 PO 配合）→ PBI-01.1 AC1/AC3 现场实证；01.2 AC1 现场层
与 PO 协调在真实双原会话执行：全新数据目录（清理历史状态与 `%TEMP%` 残留）→ install → 人工信任与 resume 重载 → Claude 原会话内 register/pair → 从 Claude 原会话 send 含唯一标记的短消息 → 以 Codex 原会话会话事件（rollout JSONL 或等价 transcript）按时间序判定正文与标记到达（T01/T02 级证据）。本项兼作继 WI-00 之后的环境漂移探测点，发现协议漂移立即登记障碍。证据留存位置与命名规则在此确定，供 WI-09 沿用。
完成判据：存在一次现场运行记录，判定依据为 Codex 原会话事件按时间序出现该唯一标记与正文（发送方本地输出与模型自述仅作过程记录）；hook 生效证据与安装产物路径（指向安装位置、无 IDEO 路径）一并留档。

**WI-07 Codex→Claude 投递链：端点复核与 priority=next 管道帧**（1d，依赖 WI-03）→ PBI-01.2 AC2、AC3、AC4；01.3 AC3 实现层
把 Send-ClaudeProbe 等价物落为 delivery/ 投递体，保留 PowerShell + NamedPipeClientStream + DPAPI 与已验证实现同构：send/reply 判定 `to.tool==='claude'` 时读端点文件（schema=1 校验、BOM 容忍保留）、发送前复核 `endpoint.sessionId===pair.claudeId`（不符报身份变化错误）、renderPeer 正文以 `'wx'` 写 `wire/<messageId>.txt`、先写 auth 帧再写消息帧（msgV=1、type=user、priority 默认固定 `next`、LF 结尾、UTF-8 无 BOM）。不含任何 now / later 路径（now 仅属专门测试的排除项）。
完成判据：用 node:net 假管道服务器（监听测试命名管道 + 预置端点文件）驱动：auth 帧与消息帧顺序正确；消息帧 priority 为 next、session_id 等于端点 sessionId；含中文/换行/双引号的正文逐字保真；端点 sessionId 与配对不符时退出非 0 且不写管道。

**WI-08 离线自动化回归移植（12 项等价 + 行为负例）**（1d，依赖 WI-04、WI-07）→ PBI-01.3 AC1 离线部分、AC2、AC3
在 `bridge/test/` 重建等价 `node --test` 套件（假 codex shim + PATH 注入 + 数据目录/TEMP 重定向 + node:net 假管道，不触真实会话）：移植 Bridge 9 项等价（配对幂等与不同配对报错、conversationId 继承与 reply 收件人反转、空闲唤醒注入与重复抑制、PostToolUse 单次消费、Stop 续接不循环、session/agent 隔离、单待收槽、两进程并发领取恰一个、win32 下 send 的 queue 调用参数）与 ClaudePipeProbe 3 项等价（端点登记无明文 token、帧格式/priority=next/正文保真、回信路径 queue 调用参数）。唤醒判据按行为断言，不绑定帧字面格式。
完成判据：`node --test` 在 bridge/test/ 全部通过；测试不 import 或引用任何 IDEO/历史路径；三类保护行为（身份核对、消息消费记录、防重复唤醒）各至少一条正例加一条负例；priority=next 默认值有直接断言。

**WI-09 端到端 smoke 定义与首次双方向执行（含 T01–T05 判定矩阵）**（1d，依赖 WI-06、WI-07；需 PO 在场）→ PBI-01.4 AC1；01.2 AC3 判定口径落地；01.3 AC1 现场层
编写 smoke 文档，五要素：环境前置（Windows、WI-00 基线版本、hook 已信任且所在会话已 resume 重载、crossSessionInbound 状态与所需人工批准步骤、运行 send/reply 前确认仅存在本方身份环境变量）；文档化人工流程（可附编排脚本辅助制造发送时机，脚本不判定通过）；T01–T05 × 双方向判定矩阵，每格标验证方式与证据存放位置；证据规则原文写入（发送成功/写入成功/本地 JSON/模型自述单独不构成通过）；重复运行约定（独立 runId、独立数据目录或显式重配对；端点失效走显式重配对，非自动恢复）。随后与 PO 执行首次完整运行，覆盖全部十格。
完成判据：smoke 文档存在且含五要素；首次运行产出十格判定矩阵完整填表，每格至少一份现场证据（会话事件记录 + 唯一标记）留存于声明位置。

**WI-10 使用说明、边界声明与 smoke 重复运行收口**（1d，依赖 WI-09）→ PBI-01.4 AC1（可重复性第二次运行）、AC2、AC3；Sprint DoD 交叉核对
使用说明四部分：安装（含人工信任/resume 重载与 crossSessionInbound 设置）、配置（register/pair、单配对模型与显式重配对、数据目录位置与生命周期边界）、发起通信与回复（send/reply 用法、trim 后 1..2000 字符上限、单待收槽、失败不自动重试与 status 对账、receipt 恒 unverified 的送达语义）、故障排查（身份环境变量污染、pending 单槽占用、端点失效走显式重配对）。边界声明逐条对照设计文档 §4 清单，并补平台（Windows-only）与版本基线，不得暗示未验证能力已完成。最后按 smoke 文档做第二次独立运行（新会话/新标记/独立数据目录），并对照 3.7 Increment 收口核对记录逐项核对留档。
完成判据：四类任务各含可直接执行步骤；第二次独立运行按既有 smoke 文档完成并通过同样证据判定；边界声明逐条对应设计文档 §4 并点名平台与两 CLI 版本；3.7 Increment 收口核对记录全部勾选并留档。

### 3.3 Sprint 假设

- Sprint 不设固定时长（PO 决策，见 3.4 Q1）；11 个工作项约 9.5 人日是 Developer forecast，不作为 Sprint 前提或承诺。容量或障碍影响交付时，在 Daily Scrum 中检视和调整；调整弹性优先在 WI-10 的文档与留档形式，四组 AC 的覆盖不裁。
- 现场验证（WI-06、WI-09、WI-10 第二次运行）需 PO 与两个原会话配合，时间提前协调；每轮使用新会话与唯一标记。
- 版本锁定：codex / claude 锁定 WI-00 记录的基线，Sprint 内不主动升级；任一 CLI 升级即触发对应通道重验（约 0.5 天内）后再继续依赖该通道的工作。
- 移植源为 git 历史中的原型（`design-sprint-closed^`，即 `3b43b80`）；产品运行与全部验证不引用 IDEO 历史路径。
- Claude 侧 crossSessionInbound 由 PO 决定保留默认（每轮人工批准）或 accept（P05 已验证配置）；产品只在使用说明中说明，绝不自动修改，也不构建绕过人工批准的机制。
- 命名建议值（`bridge/`、`%LOCALAPPDATA%\ClaudeToCodex\bridge`、`CTC_BRIDGE_DIR`）在 WI-01 开工时定案即可，不影响排布。

### 3.4 Sprint Planning 决策记录（PO 已确认，2026-09-08）

- **Q1 Sprint 时长**：不设固定时长；约 9.5 人日为 Developer forecast，不作为 Sprint 前提或承诺；容量或障碍影响交付时，在 Daily Scrum 中检视和调整。
- **Q2 T01–T05 覆盖口径**：确认两层验证模型——PBI-01.3 自动化回归覆盖逻辑层；T01–T05 真实会话现场判定放入 PBI-01.4 smoke matrix。已写回 2.2 PBI 精化。
- **Q3 平台边界**：首个 Increment 声明 Windows-only；跨平台列入未验证边界。已写回 2.2。
- **Q4 正文上限**：沿用 trim 后 1..2000 字符。已写回 2.2。
- **Q5 可重复定义**：同一版本基线下至少两次独立运行通过；每次使用独立 runId、新会话、唯一标记，并使用隔离数据目录或显式重配对。已写回 2.2。
- **Q6 DoD**：全局 Definition of Output Done 不修改；Developer Plan 增设 3.7 Increment 收口核对记录，引用 PBI AC、自动化回归、smoke 证据和干净环境复验结果。

### 3.5 主要风险与缓解

| 风险 | 缓解 |
|---|---|
| codex/claude CLI 契约漂移（queue 子命令、hooks schema、管道帧均为无稳定承诺的实测行为） | WI-00 基线 + Sprint 内版本锁定 + 升级触发重验 + WI-06/WI-09 现场探测 |
| Codex hook 信任与 resume 重载是不可自动化的人工环节，存在静默失败史 | 安装器明示步骤（WI-05）；smoke 前置检查「hook 已信任且会话已重载」 |
| 去重必需的持久状态落在易失的 %TEMP% | 稳定数据目录（WI-02），弃用指针与临时目录兜底 |
| 安装期绝对路径三处耦合（hooks 注册路径、回信指引、同目录 PS1 定位） | WI-01 稳定入口单一来源，安装期统一生成 |
| Claude 端点随进程存活，失效即阻断 Codex→Claude 方向 | 显式重配对流程（文档化人工操作，非自动恢复——排除项） |
| 身份环境变量污染（如 CODEX_THREAD_ID 被 Claude 子进程继承，P06 实测被拒） | 使用说明故障排查条目 + smoke 前置「仅存在本方身份环境变量」 |

### 3.6 环境与版本基线记录（WI-00，2026-09-08 确认）

| 检查项 | 当前状态 | 与基线比对 |
|---|---|---|
| codex CLI 版本 | `codex-cli 0.153.4` | 一致，无漂移 |
| claude CLI 版本 | `2.1.263 (Claude Code)` | 一致，无漂移 |
| Node.js | `v24.14.0` | 满足 ≥18.3 |
| `codex queue` 子命令 | 存在；`--thread <Session UUID>`、`--message <TEXT>` 参数形状与原型一致 | 一致 |
| Codex hooks 信任机制 | 存在（顶层 `--dangerously-bypass-hook-trust` 标志证明持久化 hook 信任机制在）；`config.toml` 有 `[projects.'d:\claudetocodex'] trust_level = "trusted"`；本机当前无 hooks.json（`5edff9b` 移除后未重建，符合预期） | 机制在；三事件 schema 的最终确认留 WI-06 现场验证 |
| `codex hooks list` 子命令 | 0.153.4 无此命令（设计期 README 所述 `hooks/list` 来自官方文档其他版本描述） | 记录差异，不构成阻塞 |
| Claude 会话三环境变量 | 本会话实测齐备：`CLAUDE_CODE_SESSION_ID`、`CLAUDE_CODE_MESSAGING_SOCKET`（`\\.\pipe\` 命名管道）、`CLAUDE_CODE_MESSAGING_TOKEN` 均存在 | 契约在；本会话可作为 Codex→Claude 方向的真实接收端 |
| 身份环境变量污染 | 本 Claude 会话内 `CODEX_THREAD_ID` 为空 | 无污染 |
| `crossSessionInbound` | 用户级 `~/.claude/settings.json` 为 `accept`（设计期 P05 后 PO 设置，已验证配置） | Codex→Claude 消息不会暂存等待批准 |

**结论**：全部契约与设计基线一致，无漂移，无障碍登记。Sprint 内锁定 codex 0.153.4 / claude 2.1.263；任一 CLI 升级即触发对应通道重验。

### 3.7 Increment 收口核对记录

全局 Definition of Output Done（第 1 节）不变。本节不是新的 DoD，而是本 Increment 收口时的证据核对记录，用于逐项引用客观证据，判断 DoD 与 PBI AC 是否已满足。

| # | 核对项 | 状态 | 证据位置 |
|---|---|---|---|
| 1 | PBI-01.1 全部 AC（标准安装/配置入口、会话标识、不依赖历史目录、Windows-only 声明） | 待检 | |
| 2 | PBI-01.2 全部 AC（双向发送、原会话收信并继续对话、不抢占、trim 后 1..2000 字符上限） | 待检 | |
| 3 | PBI-01.3 全部 AC（逻辑层自动化回归；T01–T05 现场判定归 PBI-01.4 smoke matrix） | 待检 | |
| 4 | PBI-01.4 全部 AC（smoke matrix 十格证据、两次独立运行、使用说明、边界声明） | 待检 | |
| 5 | 自动化回归 `node --test` 全部通过且结果留档 | 待检 | |
| 6 | smoke 现场证据（原会话事件时序 + 唯一标记）齐备并留存于声明位置 | 待检 | |
| 7 | 干净环境复验：按使用说明可复现安装与配置，不引用历史原型路径 | 待检 | |