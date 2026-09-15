# Sprint 03 Backlog：可读到达与自动继续

- 创建：2026-09-14；拆分自原"日常桥接体验与连接控制"Planning 稿。
- 范围：PO 决定聚焦 PBI-09；PBI-10 / 13 拆至 [Sprint 06](../sprint-06-connection-control/SprintBacklog.md)，PBI-12 拆至 [Sprint 07](../sprint-07-target-identification/SprintBacklog.md)。
- 状态：施工进行中——实现分支 `s03-implementation-dev-20260915`（HEAD `02cbaf1`，未合并 main）。I0/I2/I2b/I6/I7 完成；安装候选 sourceCommit `04f002e`（隔离缓存 hash 核对一致）。S03-1..5 现场格与 S03-09-6 四段往返技术验证 PASS（SM 真实会话证据，见工作项与进展）。剩余 I8（PO 手动 E2E）与 SM AC 独立核对。
- 参与者：PO（主持人）、SM / Codex、Developer / Claude Code。
- 节奏：按 PO 决定，不设固定 timebox；以 Sprint Goal、AC 与 DoD 收口。

## 第一部分：Sprint Goal 与 DoD

### Sprint Goal（v2，2026-09-15 定稿）

> 在 Codex 侧与 Claude Code 协作时，PO 无需催问复述、人工搬运或翻查数据文件，即可理解 Claude 答复并继续协作：Claude 到达在 Codex 侧以可读排队消息保留来源、正文与回复关联；空闲到达自动触发下一次处理，工作中排队且不破坏当前调用，正文在随后调用进入上下文；请求—回复—追问—再答的完整往返按此体验闭环。PO 以模型回答为主要阅读层，可按需在会话内追溯完整原文。

**变更说明**（相对于 v1）：v1 说"直接看到可读的到达内容"，把阅读层锁定在到达行；v2 改为"无需催问复述…即可理解答复"（能力式承诺，与 S03-09-7 对齐），允许 PO 以模型回答为主要阅读层，到达行承担可追溯角色。新增"请求—回复—追问—再答的完整往返闭环"子句。其余不解决项（多目标辨识、状态摘要、断开/重连、投递状态语义）仍拆到后续 Sprint。

与 Product Goal 的关系：产品价值仍是让两个原始会话直接交流并推进协作。当答复已经进入接收会话而 PO 看不见、或空闲到达不能自动引发处理时，Product Goal 的日常协作价值仍未实现。

本次基线为 `main` / `v1.2.0`（`15309b2`，Planning 基线提交 `a25860f`）。[Sprint 04 Review](../../docs/scrum-sprint/sprint-04-multi-claude-sessions-review-retro.md) 已交付多配对、每配对待收槽、回复归属与单配对退役；[Sprint 05 Review](../../docs/scrum-sprint/sprint-05-bridge-root-consistency-review-retro.md) 已交付 per-Codex 数据根与连续官方投递。历史证据须说明适用性，不能自动替代本次候选验收。

### Planning 补充：Empathize 与 Define（2026-09-14）

**Empathize 补充证据（PO 三问回答，2026-09-14）**

PO 的痛点不是等待速度，而是队列不透明导致需要让 Codex 复述一遍才能知道 Claude Code 说了什么。排队本身是正体验（类似 Claude Code 机制，无明显打断感）；主阅读层是模型回答，到达行承担可追溯角色。

- LS1（错过成本）：看到 UUID 行后，PO 会让 Codex 再解释一遍，以此知道 Claude Code 回答了什么。
- LS2（工作中收信）：消息排队比较好，类似 Claude Code 机制，没有明显打断感。
- LS3（阅读层次）：排队排到模型回答完毕，先看答案；PO 认为到达行与模型回答的层次区分不重要。

**Define（POV / HMW）**

- POV：在 Codex 与 Claude Code 间协作的 PO，需要在 Claude 到达后不催问、不搬运、不查数据文件就理解答复并继续协作；洞察是排队本身是正体验，真正痛点是 UUID 队列不透明，迫使 PO 让 Codex 复述。若排队消息保留可读正文与来源、空闲自动续跑、工作中安全排队，PO 可以以模型回答为主阅读层并按需追溯原文。
- HMW1：如何让排队中的 Claude 到达足够可读可追溯，使 PO 不需要复述也能信任下一步？
- HMW2：如何让空闲到达自动推进协作，同时让工作中到达安全排队且不破坏当前调用？

**Goal v2 修订理由**：PO LS3 明确说到达行与模型回答的层次区分不重要，推翻了 v1 的"直接看到可读到达"隐含的阅读层假设。v2 采用"无需…即可"能力式承诺，与 S03-09-7 的能力判定标准一致。Developer 对抗审阅确认 v2 更贴证据、无范围扩大、无裸露子句。

**新建 PBI 检查（2026-09-14）**

本轮 Empathize / Define / HMW 扫描后，不新建 PBI。排队可见性尚无已证实缺口（留 I8 证据采集）；双 hook 治理归 PBI-10 精化输入；多条到达堆叠归 AC-1 通则 + I6 回归。各附升格触发条件见 Developer 回信。

### DoD（与 Product Backlog 一致）

**Definition of Outcome Done**

PO 在真实使用场景中亲身体验产品，确认本 Sprint Goal 约定的价值已经实现，并记录体验场景与结论。

**Definition of Output Done**

Increment 已集成到产品中，可通过标准产品入口使用，通过与其声明范围相适应的质量验证，并由 PO 按事先约定的验收标准验收通过。

## 第二部分：选入 PBI 与验收标准

来源：[Product Backlog](../ProductBacklog.md)。范围拆分由 PO 于 2026-09-14 决定；下表不替 PO 排定其他未完成条目的优先级。

| 编号 | 标题 | 用户故事 | 本次责任边界 |
|---|---|---|---|
| PBI-09 | 消息与标记呈现可读性 | 作为日常使用者，我要在两侧会话里直接读懂每条消息的内容与来龙去脉，而不是面对一串 UUID 和 JSON 倾倒，以便把注意力放在协作本身。 | 消息、唤醒和处理提示可读；空闲唤醒自动运行，工作中收信保持模型 / 工具边界；防重复、旧格式兼容和真实往返不回退。 |

### 不纳入本次范围

- PBI-10 / 13 的状态全景、指定配对断开、重连及在途呈现，见 [Sprint 06 Backlog](../sprint-06-connection-control/SprintBacklog.md)。
- PBI-12 的候选辨识、歧义选择和发送前纠正，见 [Sprint 07 Backlog](../sprint-07-target-identification/SprintBacklog.md)。
- 自动启动或终止进程、自动恢复、广播、自动重试、送达回执、跨机器 / 跨平台能力。
- PBI-03 的完整投递状态语义；本次仍须诚实区分已知与未知，不得把连接存在、领取或 `submitted:true` 表述为原会话收信。

### 验收标准（v2，2026-09-15 定稿）

以下编号沿用拆分前稿，便于追溯历史讨论与证据。v2 修订对齐 Goal v2 和 Empathize/Define 补充证据。

1. **S03-09-1 呈现结构**：两侧原始入站消息保留可辨认的发送方 / 目标、创建时间、回复关联、头行 + 完整正文 + 机器标记行（排队消息），可执行回复入口在注入层保留（不在排队行内）。日常呈现可读，不全量倾倒内部 JSON / UUID；完整 messageId 保留在回复入口，其余关联信息可按需查证。排队行的内容结构由 I2 瘦身。回复入口不塞进排队行，由 hook 注入层完整保留，正文不重复注入。PO 可见正文按 S03-09-7 单独检视。
2. **S03-09-2 来源边界**：Claude 侧省略桥自身重复声明的前提，是实际宿主仍可辨认外来来源；Codex 侧保留简短等价声明。对端内容不被提升为 PO 指令或授权。
3. **S03-09-3 唤醒与提示**：唤醒、已处理及没有待收正文等提示可理解，正常收信和重复抑制不被文案误报为故障。明确区分正文进入模型上下文、前端是否呈现、未知 / 失败；宿主未暴露的状态不得推定。审计侧重："已排队未处理"状态文案不得误报为故障。
4. **S03-09-4 原会话行为**：两个方向都须验证空闲收信触发下一次模型调用，无需 PO 再输入推动；工作中收信保持当前模型调用及工具执行完整，并在随后模型调用前提供正文。2026-09-14 现场证据显示，同轮重复 hook 会把首次空闲唤醒拦截，必须纳入回归。审计侧重：工作中到达时 PO 前端实际可见什么，记录观察事实（不设通过/失败门槛），纳入 I8 验收。
5. **S03-09-5 兼容与防重复**：同一消息不重复注入，已消费唤醒不重复触发业务处理，普通用户输入不被错误抑制。唤醒文本和呈现方案由 Developer 依据宿主实证选择；若改变格式，须明确在途旧格式兼容及解析回归。审计侧重：忙碌时多条到达的排队堆叠仍可读（I6 回归场景）。
6. **S03-09-6 真实往返**：安装后的同一候选在两个原始会话间完成请求、回复、追问、再答；正文和自动关联字段核对一致。此项不能替代空闲与工作边界的独立判据。
7. **S03-09-7 到达即可理解答复**：PO 在等待协作答复时，无需催问复述即可理解来源、答复内容和回复去向；完整原文可经会话内呈现或回复入口追溯，无需翻查数据文件。PO 以模型回答为主要阅读层；排队消息承担可追溯角色。原会话入站、前端可见与后续行动分别记录证据，模型自述不能充当收信证明。Claude 侧现有呈现已获 PO 认可，本次以不回退为边界，不过度设计。体验准绳：PO 无需再让 Codex 复述一遍 Claude 的回复。

### 验收标准审计侧重注记（2026-09-14 Planning 补充）

以下五条为本轮 Planning 的审计侧重，不改 AC 编号和主体文本，供 SM 独立核对和 PO 端到端验收时使用：

1. **09-7 能力式准绳**：以"PO 无需再让 Codex 复述"为验收准绳，而非仅看排队行是否有正文。
2. **09-3 文案准绳**：排队中不是故障，"已排队未处理"不得误报为错误。
3. **09-4/I8 证据采集**：工作中到达时，记录 PO 前端实际看到什么（只记录不判定 pass/fail）。
4. **09-1 回归确认**：I2 瘦身后，回复入口仍在注入层完整保留。
5. **I6 回归场景**：忙碌时多条到达排队堆叠仍可读。

### Planning 证据与决定（2026-09-14，v2 更新）

**已有证据（v1 保留）**

- Empathize / Define v1 结论：PO 的痛点不是单纯等待速度，而是"到达的东西不可读"。可见层可能只有 `[CTC-WAKE ...]`，PO 无法判断对方回复了什么，也无法决定下一步。
- PO 决定取消独立 Prototype to Decide 轮：已有证据足以把排队唤醒文本改为可读消息，作为代码问题直接实施；施工后第一次真实到达请 PO 过目，最终仍以安装候选 AC / DoD 验收。
- 双 hook 现场事实：项目级与插件级 hooks 同时生效时，首个 handler 领取正文，第二个 handler 对同一 turn 返回 block，导致任务空结束。该问题归属既有 S03-09-4 / 5，不是新增 PBI。

**v2 补充证据（2026-09-14 三方会谈）**

- PO LS1 确认：看到 UUID 行后让 Codex 复述一遍——这就是本次要消除的人工接力成本。
- PO LS2 确认：工作中消息排队是正向体验（类似 Claude Code 机制），不打断当前任务。
- PO LS3 推翻 v1 强假设：主阅读层是模型回答，到达行的层次区分不重要。
- Developer 对抗审阅：v2 更贴证据，I2 设计从"PO 读到达行"修正为"排队时内容可达、可读、作为自动处理输入"；回复入口留在注入层。不触发新 Ideate/原型。
- 新建 PBI 检查：不新建。排队可见性留 I8 证据采集；双 hook 治理归 PBI-10 精化输入；堆叠可读归 I6 回归。
- Developer v2.3 判断保留：I2 与 I2b 可并行；首个可检视成果是"一次真实空闲到达：可读正文 + 模型自动运行（PO 过目）"。

### 共同验收要求

- `bridge/` 与 `plugins/claudetocodex/bridge/` 保持一致，产品 skill、使用说明及相关回归同步；真实验证经安装后的标准产品入口执行。
- 特性冻结后尽早验证隔离安装候选，核对完整 manifest、metadata、有效 hooks 与回复入口；记录候选和实际宿主版本。宿主状态操作沿用显式目标 home 与输出路径防护。
- 收信按接收方原始会话完整正文、自动 messageId / pairId / conversationId / replyTo、数据目录和时间窗核对。fixture、宿主加载、实际执行与原会话收信分别判定。
- 同一轮真实使用分别记录技术 AC 与 PO DoD，PO 无需手写标记、ID 或环境变量。

## 第三部分：Developer 工作区

本部分由 Developer 自行维护。拆分后须从原 v2.3 HOW 中移除 10 / 12 / 13 的施工承诺，保留 09 所需路线、验证和容量，并对本文件前两部分做反例审阅。

### 基本 HOW（v04.1，2026-09-15 定稿；Developer 主导，SM 二审与落盘复核通过）

定位：本 Sprint 仅 PBI-09。Developer 依据 Goal v2、AC v2 与 Empathize/Define 证据主导技术方案；SM 对抗审阅通过。v04.1 修正了 v04 中"回复入口放入排队文本"的层级错误，明确回复入口只在 hook 注入层。**施工现状（2026-09-15）**：I0/I2/I2b/I6/I7 已在实现分支完成（HEAD `02cbaf1`）；SM 对抗复核发现的跨 pair marker 误路由已修复（`04f002e`，尾部 marker 规则）并以双回归钉死；安装候选经隔离 home 安装核对（缓存 hash 一致）与真实会话现场验证（S03-1..5、09-6 全 PASS）。剩余 I8（PO 手动 E2E）。

**基线事实（I0，已完成）**：Node v24.14.0、codex-cli 0.154.0、Claude Code 2.1.268；源基线 main `15309b2`，拆分提交 `6986df8`（Planning 基线 `a25860f`）。日常插件缓存仅 1.2.0。日常环境存在项目级 + 插件级双 hook 注册；I2b 的目标是让该共存形态功能安全，不能当作已具备能力。

#### D1：I2 队列消息格式（Ideate 分叉点）

当前 wake 格式为单行 `[CTC-WAKE <uuid> <uuid>]`。v04.1 选定方案 A：多行可读 + 行扫描。

排队文本仅包含三部分：

```text
[Source: Claude Code -> Codex | <timestamp>]

<完整正文，原文不截断>

[CTC-WAKE <pairId> <messageId>]
```

- 头行：简短来源声明，满足 S03-09-2。
- 正文：完整原文，不截断，满足 S03-09-1。
- 机器标记：独立行，格式不变，供解析。
- 回复入口：不进入排队文本；由 hook 注入层提供完整 reply 入口。
- 正文已在排队文本中时，hook 注入层跳过重复正文，只补充回复入口，避免正文重复注入。

方案对比：

| 方案 | 内容 | 优点 | 风险 / 取舍 | 结论 |
|---|---|---|---|---|
| A 多行可读 + 行扫描 | 头行 + 完整正文 + 机器标记行；回复入口在注入层 | 排队可读、正文完整、marker 独立解析；与 AC-1 对齐 | 多行宿主行为未知，需 TE1 首验 | 选定 |
| B 单行紧凑 | 单行来源 + 摘要 / 紧凑正文 + marker | 宿主多行风险低 | 长正文易截断，完整正文与可读性弱 | 仅作 TE1 失败后的降级候选，须回三方由 PO 决定 |
| C 保留旧排队 + 仅 hook 注入 | 排队仍为旧标记，正文只在注入层 | 格式改动最小 | 排队层不可读，与 AC-1 冲突 | 不选 |

TE1 触发条件：若宿主拒绝、截断、重排多行排队文本或导致不可读，立即停止施工，回三方重议；不得静默降级。

#### D2：I2b 同轮 / 跨轮判定（方案空间窄，无需新 Ideate）

consumed 分支按 receipt `turnId` 区分：

- 同轮 `turnId` 匹配：视为另一 handler 已服务本 turn，放行并记录可观测 noop 事件。
- 跨轮 `turnId` 不匹配：视为真实重复唤醒，维持抑制。
- `turnId=null`：无法区分，保守抑制并记录事件；若比例超过 20%，呈报 SM/PO 决定后续投入。

#### 旧格式兼容与 marker 边界安全

解析优先级：

1. 逐行扫描，寻找完整匹配 `[CTC-WAKE <uuid> <uuid>]` 的独立 marker 行；**取最后一个匹配**（尾部 marker 规则：wakeText 生成不变量保证真实 marker 是最后一行，正文嵌入的 marker 样式行必在其前——含指向其他 pair 的完整有效 marker 也不得劫持路由提示；旧单行格式唯一匹配，行为不变）。
2. 未找到独立 marker 行时，回退旧单行全文匹配。
3. marker 识别使用锚定整行正则 `^\[CTC-WAKE ([0-9a-f-]{36}) ([0-9a-f-]{36})\]$`（大小写不敏感）；正文中的 UUID、括号或部分相似文本不匹配。
4. 正文不解析、不截断、不改写；仅移除识别出的 marker 行。
5. 确定性：多匹配时以最后一个为准（2026-09-15 SM 对抗复核发现取首匹配的跨 pair 误路由，已修复并加双 pair 回归）。

回归要求：新多行格式可解析；旧单行格式仍可解析；正文含 marker-like 内容不误匹配；正文不被吞；普通无标记输入不被抑制。

#### 实现切片（净 Developer 工作量，置信度中）

| 切片 | 内容 | 主要 AC | 粗估（天） |
|---|---|---|---|
| I0 | 基线事实采集 | — | 0.5（已完成） |
| I2 | 可读排队到达：wakeText 多行改写、行扫描正则、hook 注入回复入口并跳过重复正文、旧格式 fallback、提示文案 | S03-09-1/2/3/5/7 | 1.5–2 |
| I2b | 空闲唤醒修复：consumed 分支按 turnId 区分、noop 事件、null 保守处理 | S03-09-4/5 | 0.5–1 |
| I6 | 范围化同步：双树一致、09 触面文档与回归扩展，不提前实现 Sprint 06/07 | 共同 DoD | 0.5–1 |
| I7 | Developer 隔离安装候选验证：manifest、metadata、有效 hooks、reply 入口、双 hook 判据、原会话证据 | 共同 DoD | 1 |
| I8 | PO 手动 E2E：真实四段往返与到达体验检视；PO 参与不计净 Developer 工作量 | S03-09-6/7 | PO 参与 |

I7 与 I8 分开：I7 是 Developer 技术验证；I8 是 PO 端到端体验验收，不占 Developer 容量。

#### 依赖与顺序

I0 → I2 ∥ I2b → I6 → I7 → I8。

首个可检视成果：I2 + I2b 后的一次真实空闲到达——排队正文可读、模型自动运行；请 PO 过目一次，属施工内检视，不是验收。

#### 容量

- 总计划口径：I0 0.5（已完成）+ I2 1.5–2 + I2b 0.5–1 + I6 0.5–1 + I7 1 = **4–5.5 天**。
- 剩余施工口径：不含已完成 I0，为 **3.5–5 天**。
- 估算不含隐性缓冲；不确定性在 I2 宿主渲染、旧格式样本量与 I2b null 比例。超过 5.5 天总口径时停在可回顾点，向 SM/PO 呈选项；范围 / 时序取舍由 PO 决定。

#### AC / DoD 全映射

| AC | 切片 | 验证方法 | 审计侧重 |
|---|---|---|---|
| S03-09-1 呈现结构 | I2 | 双树真实入站帧检查；I7 候选安装检查 | 回复入口在注入层完整保留；正文不重复 |
| S03-09-2 来源边界 | I2 | 双侧入站来源声明对比 | Claude 侧不重复声明；Codex 侧保留简短等价声明 |
| S03-09-3 唤醒与提示 | I2 | 正常唤醒、重复抑制、无待收的日志 / 呈现检查 | "已排队未处理"不得误报为故障 |
| S03-09-4 原会话行为 | I2b | 双方向空闲 / 生成中 / 工具边界，按原始事件时间线判定 | 记录工作中到达时 PO 前端实际可见什么，不设 pass/fail |
| S03-09-5 兼容与防重复 | I2、I2b | 新旧格式解析、防重复、普通输入回归 | 忙碌多条到达堆叠仍可读（I6 回归） |
| S03-09-6 真实往返 | I7 | 安装候选四段往返，正文与自动关联字段核对 | 不以施工期样本替代 |
| S03-09-7 到达即可理解答复 | I2、I7、I8 | 原始入站、前端可见、后续行动分别取证 | PO 无需再让 Codex 复述 Claude 回复 |

DoD 映射：

- Outcome Done：PO 在安装候选上完成 I8，确认 Goal v2 的协作价值已实现。
- Output Done：Increment 经标准产品入口集成；I7 通过声明范围内质量验证；PO 按 AC 验收通过。

#### 验证安排

- S03-09-4：双 hook 注册形态下，同轮二次 handler 放行且模型正常运行；跨轮真实重复唤醒仍抑制。以原始会话事件时间线判定，不用模型自述。
- S03-09-5：在途旧格式可解析；同一消息不重复注入；重复唤醒抑制；普通输入不误伤。
- S03-09-6：同一安装候选完成请求 / 回复 / 追问 / 再答，正文与自动关联字段一致。
- S03-09-7：PO 在安装候选上验收；原始入站、前端可见、后续行动分别取证；模型自述不作收信证明；Claude 侧以不回退为边界。
- 所有收信按接收方原始会话完整入站帧 + 自动 messageId / pairId / conversationId / replyTo 判定；等待禁用 Start-Sleep / 轮询（S05 规则）。
- SM 独立核对 AC；PO 完成端到端验收，不手写标记、ID 或环境变量。

#### 预研 / 实验点

施工前独立预研：无。PO 已取消独立 Prototype to Decide；以下作为施工内首验：

- TE1：宿主 UserPromptSubmit 对多行排队文本的行为——是否可见、截断、重排或报错。
  - 结果（2026-09-15，SM 独立验证）：**PASS**。隔离 Codex home + 安装候选 7052c60 + 专用 Claude 会话（S03-TE1-Claude-7052c60，22a9051c）完成真实双向往返。Codex 线程历史直接捕获新多行排队格式：头行 `[Source: bridge message | <timestamp>]`、完整 10+ 行正文、独立 `[CTC-WAKE <pairId> <messageId>]` marker 行；无截断、无报错。事件链 `created → published → wake-submitted → context-prepared` 证明空闲自动触发成功。消息链 `d6c1f91d`（Codex→Claude 请求）→ `1f0c2e43`（Claude→Codex 回复，多行正文）→ `a9d58b11`（Codex→Claude 追问确认）完成请求—回复—追问闭环；replyTo 关联完整。TE1 Claude 独立确认双侧入站帧字段和正文逐字可读。方案 A（多行可读 + 行扫描）在真实宿主可行，无需降级方案 B。
- TE2：在途旧格式样本量，影响 I6 回归时间。
- TE3：`turnId=null` 的实际比例与事件可观测性。

TE1 失败立即回三方重议；降级方案 B 也须由 PO 决定，不得静默切换。

#### 风险与回调

| 风险 | 概率 | 回调触发 | 决策者 |
|---|---|---|---|
| TE1 宿主不接受多行 | 中 | 首验发现截断 / 重排 / 不可读 / 报错 | PO 决定降级或重议 |
| `turnId=null` 比例高 | 低 | 超过 20% | PO 决定继续统计、投入近似机制或接受 |
| 旧格式样本超预期 | 低 | I6 开始时统计 | PO 决定延长回归窗口或收窄范围 |
| 总容量越界 | 低 | 总口径超过 5.5 天 | PO 决定范围 / 时序取舍 |

#### 进度边界

- 每片冻结后立即装入隔离缓存测试，候选优先验证。
- I2 宿主行为异常时停止并回三方，不强行推进。
- `turnId=null` 比例透明上报，超过阈值呈选项。
- 容量越界停在可回顾点，由 PO 取舍。
- Developer 回报原始事实与证据；SM 核对并汇总入唯一 Sprint 记录。

#### 文档同步范围（I6）

仅同步 PBI-09 触面：`bridge/` 与 `plugins/claudetocodex/bridge/` 一致性、README、INSTALL、USAGE、SMOKE、产品 skill、旧格式兼容回归。不提前实现 Sprint 06/07 的状态或辨识交互。

### 工作项与进展

- 2026-09-14：v03 落稿；Developer 完成前两部分反例审阅与 06 / 07 种子检查，SM 核对并修正"双 hook 共存安全"为待验证目标。PO 接受当前方案，Planning 定稿关闭并授权 Developer 施工；旧 worktree `s03-planning-dev-20260914` 中未提交的 v2.2 / v2.3 为历史底稿，可清理。
- 2026-09-14（Planning 重开）：PO 主持三方会谈。Empathize 补充 LS1-LS3，Define 产出 POV/HMW，Developer 确认不新建 PBI。Goal 从 v1 修订为 v2（能力式承诺 + 阅读层弹性；PO LS3 推翻 A1 强形式"PO 的阅读点就是到达行本身"）。验收标准对齐 v2，新增五条审计侧重。Sprint Planning 继续进行中，待 PO 对 v2 Goal 定稿后正式收口。Developer 未写代码。
- 2026-09-15：Developer 主导 HOW v04，用 Ideate 比较多行可读、单行紧凑与旧格式方案；SM 首审发现回复入口层级、容量口径、I7/I8 边界等问题并返修。v04.1 修正后 SM 二审通过并落盘。Developer 未写代码；待落盘复核后正式收口 Planning。
- 2026-09-15：Developer 对落盘后的 HOW v04.1 做只读复核，D1 瘦排队行、注入层回复入口、旧格式 / marker 解析、I7/I8 分离、容量口径、AC / DoD 映射、风险回调与 I6 范围全部通过。Sprint Planning 正式收口；施工入口打开，尚未写实现代码。
- 2026-09-15（施工）：I2+I2b 实现冻结 commit `7052c60`（store.mjs 多行 wakeText/行扫描正则/renderPeer body-skip/receiptFor turnId 判定、cli.mjs 传 body+createdAt、BridgeQueue.ps1 去 ValidatePattern、测试适配同轮/跨轮/null 三路径）；双树 83/83 绿。TE1 首验由 SM 独立验证 PASS（见预研/实验点）。PO 纠偏：实现分支不在 Review/验收前合并 main。TE1 记录随 commit `9b2ff16` 落盘。
- 2026-09-15（I6）：范围化同步 commit `0e7765d`（USAGE 到达语义+同轮/跨轮抑制措辞、SMOKE 新增 S03 系 5 格、SKILL 到达描述、+2 测试：在途旧单行 wake 投递、marker-like 正文边界）；双树 85/85 绿。未实现 Sprint 06/07 内容。
- 2026-09-15（I7 本地核对）：以 `0e7765d` 构建插件候选（Build-Release.ps1，plugin 模式）。产物 `claude-to-codex-plugin-1.2.0.zip`，SHA256 `37e453aa6a0944ea1ddd247714355d97b68ae71750e5ba191eac16a0bd66ef55`；manifest 记录 sourceCommit `0e7765db4919c3615b96477890a9cf7c7592eb68`、25 文件。核对：store.mjs 包内 SHA256 `a409f4d4…` 与源树一致；hooks.json 三条（UserPromptSubmit/PostToolUse/Stop）均指向 `${PLUGIN_ROOT}/bridge/cli.mjs`；entry.mjs `commandString()` 运行时自安装位置派生（回复入口随安装位置更新）；I2/I2b 代码在包内逐点在位。**该候选因跨 pair 缺陷作废，由下方 v2 候选取代。**
- 2026-09-15（SM 对抗复核返修）：SM 复现跨 pair 误路由（双 pending + A 正文嵌入指向 B 的完整有效 marker → 取首匹配劫持路由提示、误消费 B）。修复 commit `04f002e`：行扫描改为**尾部 marker 规则**（取最后匹配；wakeText 生成不变量保证真实 marker 是尾行）；宿主不变量（每个 queue item 独立 UserPromptSubmit，TE1 链与 S05 R5 为证）写入代码注释，堆叠防御由测试钉住（最后 marker 路由、其余保 FIFO 槽位于下一投递机会进入，不丢不误投）。+2 回归（跨 pair 伪造 marker、双真实 wakeText 堆叠）；README 过期已知问题行替换为 Sprint 03 候选说明；INSTALL 交流段补"排队可读、排队非故障"；解析优先级描述同步更新。双树 87/87 绿。SM 另行决定：I7 隔离 home 全新另建，不沿用 TE1 home；SM 并行复跑时开发树出现一次 Windows Temp `.lock` EPERM，串行复跑通过，记录为测试执行方式干扰非产品缺陷。
- 2026-09-15（I7 候选 v2）：以 `04f002e` 重建候选。产物 `claude-to-codex-plugin-1.2.0.zip`，SHA256 `892d029962f063c4a56faa9464188596cff2e2a5fccaa942e14a5f4a153e74aa`；manifest sourceCommit `04f002e35d7b11128fe3afa34a5119d1ecd3f14e`、25 文件；尾部 marker 修复代码包内核实在位。**当前有效候选**。待办：全新隔离 home 安装 + S03 系现场格（与 SM 协调）。
- 2026-09-15（I7 隔离安装核对，SM 授权后执行）：全新隔离 home `C:\Users\DELL\.claude\jobs\abaad007\tmp\s03-i7-isolated-home`（不复用 TE1 home）。安装命令：`CODEX_HOME=<隔离home>` 下 `codex plugin marketplace add <worktree>` + `codex plugin add claudetocodex@claudetocodex-dev`；installedPath `<隔离home>\plugins\cache\claudetocodex-dev\claudetocodex\1.2.0`，23 文件（插件树；manifest/RELEASE-NOTES 不入缓存属安装器常态）。核对：缓存 store.mjs SHA256 `8315ea61…` = 候选 v2 manifest 值；BridgeQueue.ps1、entry.mjs hash 同 MATCH；plugin.json version 1.2.0；hooks.json 三条（UserPromptSubmit/PostToolUse/Stop）均 `node "${PLUGIN_ROOT}/bridge/cli.mjs" hook`；尾部 marker 修复（store.mjs:577）与 I2b noop（:647）缓存在位；**安装缓存目录内全量测试 87/87 绿**（node --test test/*.test.mjs，执行目录=缓存 bridge/）。**BLOCKED**：S03-1..5 现场格需真实宿主会话与 PO hook trust（宿主交互），不得绕过——待 PO/SM 安排。
- 2026-09-15（S03 现场格证据，第 1/2 批）：SM 在全新隔离 home + `04f002e` 候选 + 真实会话完成 S03-1..3，全 PASS。环境：Codex `01a0a583…`、Claude `7507d698…`、pair `36ae4c88…`、bridge root `01a0a583…`。S03-1 PASS（`b022e48b`/`02074f66`：Source 头行+完整正文+尾部 marker；事件链 created→published→wake-submitted→context-prepared；正文不重复注入）。S03-2 PASS（两条消息均有 same-turn noop 事件——双 handler 同轮放行实证）。S03-3 PASS（`0f3bec2c`/`489c3905`/`02074f66` 在新 turn 均 wake-suppressed，含 current turnId 与 receiptTurnId 字段）。S03-4/S03-5 证据待 SM 第 2 批。
- 2026-09-15（S03 现场格证据，第 2/2 批 + 09-6）：**S03-4 PASS**（`0f3bec2c`=STACK-A、`489c3905`=STACK-B 在 busy turn `01a0a595` 内先排队，随后分别在不同 PostToolUse 边界 context-prepared；当前调用未破坏、逐条可读）。**S03-5 PASS with note**（`053c2528` 为测试操作误用主树 pre-I2 CLI 产生的旧单行 marker，随后手动恢复；候选 hook 按 marker-only 兼容路径投递完整 frame——send-error/手工恢复记录为**测试偏差，非候选缺陷**）。**S03-09-6 PASS**（`7339696d`→`b022e48b`→`b3b34b83`→`053c2528` 四段链闭合，conversationId 一致；`00e79075` 确认头行/marker/正文未截断）。**I7 现场格全部完成；S03-5 的测试偏差如实留痕。**
