# Sprint 04 Backlog：一 Codex 对多 Claude Code 会话

- 创建：2026-09-11（Sprint Planning）。
- 参与者：Product Owner、Scrum Master / Codex。Developer 尚未为本 Sprint 分配；本日志不向 Sprint-03 的 Developer 派工或索取评估。
- 关系：PO 选择让 Sprint 03 与 Sprint 04 并行推进。Scrum 的单一团队原则要求两条工作流各自保持透明的 Goal、Backlog、容量和验收记录；同一代码树上的改动须按文件所有权和合并顺序协调，不能把两个 Sprint 的工作混成一个隐形 Backlog。
- 状态：Sprint 04 Planning 已落盘，施工尚未开始。时长尚未由 PO 指定；在确定前不假定固定容量或收口日期。若按严格 Scrum Sprint 执行，首次 Daily Scrum 前需补充固定长度。

## 第一部分：Sprint Goal 与 DoD

### Sprint Goal

> 交付一个可验证的多会话桥接最小增量：让一个 Codex 原始会话能够显式按名称维护至少两个 Claude Code 原始会话的独立桥接，把消息路由到指定目标，并让各目标的回复回到同一个 Codex 会话，从而支持多个项目或一个项目内的并行协作。

与 Product Goal 的关系：Product Goal 要求 Codex 与 Claude Code 的原始会话能直接交流并把反馈用于决策和行动；本 Goal 将已验证的单对桥扩展到多个明确目标，同时保留原始会话、证据链和用户控制边界。

### DoD（抄写自 Product Backlog）

**Definition of Outcome Done**

PO 在真实使用场景中亲身体验产品，确认当前 Product Goal 所约定的价值已经实现，并记录体验场景与结论。

**Definition of Output Done**

Increment 已集成到产品中，可通过标准产品入口使用，通过与其声明范围相适应的质量验证，并由 PO 按事先约定的验收标准验收通过。

## 第二部分：选入 PBI

### 2.1 PBI-11（PO 确认的 Sprint 04 方向；团队承诺待容量确认）

| 编号 | 标题 | 用户故事 | 当前状态 |
|---|---|---|---|
| PBI-11 | 一 Codex 对多 Claude Code 会话 | 作为日常使用者，我要让一个 Codex 会话同时与多个 Claude Code 会话保持桥接并按名称往来，以便并行开展多项协作，而不是每次换目标都要换配对。 | Sprint 04 选中（PO 方向） |

### 2.2 价值验收边界（Planning 版，Developer 负责实现方式）

以下是 PO 为本 Sprint 提出的 PBI-11 最小可验收切片；Developer 确认容量和方案后，SM 再把它视为团队承诺。实现结构、命令细节和工作项分解由 Developer 决定，并须在首个工作节点后回报：

1. **两个明确目标共存**：在声明支持的 Windows 环境中，一个 Codex 原始会话可以显式建立并保留至少两个正在运行的 Claude Code 原始会话目标；目标按唯一名称或等价的稳定选择依据区分，并能从状态入口看出各自的存在和去向。
2. **按目标路由**：发送或回复时必须明确目标；消息发给目标 A 不会出现在目标 B，目标 B 的消息也不会回到 A。名称不存在或不唯一时，命令失败并给出可执行的下一步，不得猜测或静默切换。
3. **真实双向闭环**：分别向两个原始 Claude 会话发送至少一条业务消息，各自收到后回复；同一个 Codex 原始会话收到两条回复，并能用自动生成的 `messageId`、`pairId`、`conversationId`、`replyTo` 及目标标识核对关联。每个目标至少再完成一次追问或后续回复。
4. **隔离与故障边界**：单个 Claude 端点停止、重启或需要重新连接时，其他目标的配对和历史证据保留；重连或替换必须显式执行并留下可查记录，不得静默覆盖另一目标的数据。证据链仍以接收方原始会话事件、数据目录和时间窗判定，`submitted:true` 不作为收信证明。
5. **单目标兼容**：只配置一个目标时，现有已验证的单对消息路径和身份校验不回退；本 Sprint 不把“多个目标”解释为自动并发投递、自动重试或自动选择目标。
6. **产品化与同步**：改动落位 `bridge/` 与 `plugins/claudetocodex/bridge/` 两棵代码树并保持一致；相关回归测试、状态/连接文档和标准产品入口同步更新；真实验证从安装后的产品入口执行。

### 2.3 明确不纳入本 Sprint

- 不承诺任意数量的 Claude 会话、跨机器或跨平台能力。
- 不承诺消息的并发投递顺序、广播、自动重试、送达回执或事务性投递。
- 不自动启动、替换或恢复 Claude 会话；身份、信任和端点生命周期边界沿用已验证规则。
- 不把 PBI-09 的消息呈现改版或 PBI-10 的完整状态/换配对体验重新吸收进本条；仅实现多目标路由所必需的最小状态与显式边界。
- 不静默迁移既有单配对数据；任何迁移方案必须先保留旧证据并经 PO 检视。

## 第三部分：首个检查点与 Developer 工作区

### 3.1 PBI-11 pre-study 检查点

PBI-11 在 Product Backlog 中原本标为“待精化”，现有实现事实仍是单 `pair.json`、单 Codex 身份和单端点路径。按 Planning 规则，Developer 先完成一个短的可行性检查，再承诺后续实现切片。检查至少回答：

- 多目标路由记录如何共存并保持目标身份校验；
- `connect`、`send`、`reply`、`status` 的用户选择依据如何保持显式且不与 PBI-10 冲突；
- Codex 待收槽、Claude 管道、回复关联和旧数据归档如何按目标隔离；
- 从当前单配对数据到多目标结构是否需要迁移，以及失败时如何保留证据；
- 两个目标的最小真实验证如何在不承诺并发语义的前提下完成。

检查退出条件：Developer 给出一份基于真实数据记录（脱敏）的架构选择、风险、容量估计和最小工作项；若证据否定当前切片，SM 召集 PO 适应 Sprint Backlog，而不是把未验证能力写成已完成。

### 3.2 工作项与进展

本节由未来分配的 Developer 维护，记录 How、顺序、估计、完成证据和 impediment。SM 不替 Developer 指定实现方式；当前没有向 Sprint-03 Developer 发出施工任务。

**当前进展：**（等待 Developer 在 pre-study 后填写）

### 3.3 并行工作流协调

- Sprint 03 的 `scrum/sprint-03-usability-polish/SprintBacklog.md` 保持其自身 Goal 和工作项；Sprint 04 不重写或代替它。
- 两个工作流若修改相同文件，Developer 需先在本文件和 Sprint 03 工作区标明文件所有权、依赖和合并顺序；SM 负责把冲突作为 impediment 公开并协调。
- 每个工作节点完成后，Developer 通过桥向 SM 报告；SM 依据原始会话收信和 Git 差异合并对应 worktree。Sprint Review、Retro、标签、发布和清理仍分别由 PO 拍板。

## 第四部分：证据与验收记录

- 证据分层：fixture → 宿主加载 → 实际执行 → 接收原始会话收信；任何单层记录都不能替代下一层。
- 真实收信核对：两个 Claude 原始会话各自出现对应业务消息和回复，关联字段与目标名称一致；PO 不手写标记、ID 或桥环境变量。
- 技术 AC 与 PO DoD 在同一轮真实使用中分别记录，失败或受阻项保留原始记录，不改写为通过。
- Sprint 收口时按项目规则把过程证据蒸馏到唯一 Review 文档，清理一次性 Sprint 文件；Git 历史保留可追溯源。


