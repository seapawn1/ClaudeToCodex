# Sprint 03 Review & Retrospective：可读到达与自动继续

- 日期：2026-09-16（Asia/Shanghai；原始事件时间沿用 UTC 记录）。
- 参与者：Product Owner（首批用户与主持人）、Scrum Master / Codex、Developer / Claude Code。
- 结论：Sprint Goal v2 达成；PBI-09 通过安装候选、SM 独立现场验证和 PO 手动端到端验收。S03-09-1 至 S03-09-7、Definition of Output Done 与 Definition of Outcome Done 全部 PASS。Review 与 Retrospective 完成；本文件是活跃仓库中的唯一 Sprint 03 过程总结。
- 发布决策：PO 决定发布 **1.3.0**。最终收口 commit 包含本总结、Product Backlog 适配、版本与发布文档、SMOKE 证据、记忆更新和一次性 Sprint 材料清理；两个 annotated tag `v1.3.0` 与 `sprint-03-readable-arrival-review-retro` 均指向该 commit。
- 证据边界：`04f002e` 是已通过 I7 / I8 的运行时代码源提交，也是 1.2.0 命名的安装候选来源；1.3.0 包在最终收口 commit 上重建。收口 commit 只追加版本、文档与过程材料，不改变已验收运行时代码。

## 1. Sprint Review：Increment 与价值检视

Sprint Goal v2：

> 在 Codex 侧与 Claude Code 协作时，PO 无需催问复述、人工搬运或翻查数据文件，即可理解 Claude 答复并继续协作：Claude 到达在 Codex 侧以可读排队消息保留来源、正文与回复关联；空闲到达自动触发下一次处理，工作中排队且不破坏当前调用，正文在随后调用进入上下文；请求—回复—追问—再答的完整往返按此体验闭环。PO 以模型回答为主要阅读层，可按需在会话内追溯完整原文。

本次交付主题：

- **PBI-09 消息与标记呈现可读性**；
- 多行可读 wake：来源头行、完整正文、独立尾部 marker；
- hook 注入层保留可执行回复入口，且不重复注入正文；
- 空闲自动继续、忙碌排队与同轮 / 跨轮重复防御；
- 在途旧单行 wake 兼容；
- 跨 pair 伪造 marker 防劫持；
- 双树、产品文档、回归、隔离安装与真实会话验证同步。

### 1.1 Increment 检视

| 检视项 | 结果 |
|---|---|
| 运行时代码源提交 | `04f002e35d7b11128fe3afa34a5119d1ecd3f14e`（`04f002e`）：尾部 marker 规则修复跨 pair marker 劫持，并新增跨 pair 伪造 marker 与双真实 wakeText 堆叠回归 |
| Sprint 增量合并 | `583bbad` 将 `c031cec` 的 Sprint 03 增量普通合并到 `main`，保留实现与证据提交链 |
| 产品回归 | 开发树 `bridge/` 87/87 通过；插件树 `plugins/claudetocodex/bridge/` 87/87 通过 |
| 安装候选 | `claude-to-codex-plugin-1.2.0.zip`，SHA256 `892d029962f063c4a56faa9464188596cff2e2a5fccaa942e14a5f4a153e74aa`；manifest sourceCommit `04f002e`，25 文件；尾部 marker 修复包内核实在位 |
| 隔离安装 | 全新隔离 `CODEX_HOME` 中安装；installedPath 位于 `...\claudetocodex-dev\claudetocodex\1.2.0`；缓存关键文件 hash 与候选 manifest 匹配；manifest version 1.2.0；三条 hooks 均指向 `${PLUGIN_ROOT}/bridge/cli.mjs`；缓存树 87/87 通过 |
| SM 现场验证 | I7 在真实原始会话完成 S03-1..5 与 S03-09-6，全 PASS；S03-5 有测试操作偏差，候选按旧 marker-only 路径兼容并投递完整 frame，偏差留痕且不判为产品缺陷 |
| PO 手动 E2E | I8 完成请求、回复、追问、再答四段往返；PO 确认直接理解 Claude 答复、可辨认外来来源、无重复正文干扰、无需手动复制首轮回复 |
| PO Outcome | PO 明确结论：“整体非常好，我验收通过了。” Outcome Done 达成 |
| 开发收口 | I0 / I2 / I2b / I6 / I7 / I8 全部完成；净 Developer 工作量约 2 天，在 4–5.5 天估算内；一轮实质返修；无未决阻塞 |

### 1.2 AC / DoD 矩阵

| 判据 | 结果 | 证据摘要 |
|---|---|---|
| S03-09-1 呈现结构 | PASS | I7 `b022e48b` / `02074f66`：排队文本含 Source 头行、完整正文、独立尾部 marker；hook 注入层保留 reply 入口，正文不重复注入 |
| S03-09-2 来源边界 | PASS | Codex 侧保留简短来源声明；I7 / I8 中 PO 能辨认答复来自 Claude，未把外来答复提升为 PO 指令；Claude 侧未见回退 |
| S03-09-3 唤醒与提示 | PASS | 正常 wake 事件链可理解；已排队未处理未被误报为故障；`created → published → wake-submitted → context-prepared` 分层留痕 |
| S03-09-4 原会话行为 | PASS | I7 S03-2 双 hook 同轮二次处理放行并记录 noop；S03-4 两条忙碌到达先排队，当前调用完整，随后在不同 PostToolUse 边界进入；四段链覆盖两个方向 |
| S03-09-5 兼容与防重复 | PASS | 同轮 noop、跨轮 `wake-suppressed`、旧单行 marker fallback、普通输入回归均通过；`04f002e` 补跨 pair 伪造 marker 与双真实 wakeText 堆叠回归 |
| S03-09-6 真实往返 | PASS | I7 四段链 `7339696d → b022e48b → b3b34b83 → 053c2528`，conversationId 一致；I8 另行完成 PO 四段链 |
| S03-09-7 到达即可理解答复 | PASS | PO 无需催问复述、人工搬运或读取数据文件；可理解来源、答复与回复去向，并能辨认这是 Claude 的外来答复 |
| Output Done | PASS | 增量经标准插件入口安装；双树、安装缓存、真实宿主与文档 / 回归同步；SM 逐项核对 AC，PO 按约定验收 |
| Outcome Done | PASS | PO 在真实协作中亲自验收，并明确确认 Sprint Goal v2 的协作价值已实现 |

证据分层保持独立：fixture / 源码测试、双树、解包候选、隔离安装缓存、真实宿主事件、原始会话 rollout、PO 亲身体验不互相冒充。`submitted:true`、pipe 写入、消息文件、裸 wake、模型自述均未单独作为收信证明。

### 1.3 关键缺陷与返修

SM 对抗复核发现：两个 pair 各有 pending 时，A 正文内嵌入指向 B 的完整有效 marker，原“取首个匹配”解析会劫持路由提示并误消费 B 的待收消息。这说明仅测试同 pair 正文的 marker-like 内容存在确认偏误。

修复采用**尾部 marker 规则**：

1. wakeText 生成不变量保证真实 marker 是最后一行；
2. 解析完整匹配的独立 marker 行时取最后一个；
3. 正文嵌入的完整 marker 不劫持路由；
4. 旧单行格式唯一匹配时行为不变；
5. 双真实 wakeText 堆叠时按宿主逐 item 注入不变量处理，最后 marker 对应当前 item，其余保 FIFO 槽位等待下一次投递机会；
6. 新增跨 pair 伪造 marker 与堆叠真实 wakeText 两个回归。

该缺陷在候选验收前被发现并修复，未进入 PO 验收后的发布结论。

### 1.4 Product Backlog 适配

Review 决策：

- PBI-09 移入“已交付能力”，不再保留在未完成条目表；
- 发布版本由 1.2.0 升级为 1.3.0；
- Sprint 06（PBI-10+13）与 Sprint 07（PBI-12）仍为待 Planning 种子，不因本次收口自动开工；
- 后续优先级与是否开启 Sprint 06 / 07 由 PO 另行决定；
- 本 Sprint 不修改全局 Product Goal 或 DoD。

已交付能力摘要：PBI-09 交付可读 Claude→Codex 到达与自动继续，包括来源头行、完整正文、独立尾部 marker、注入层 reply 入口、正文不重复注入、空闲自动续跑、忙碌排队、同轮双 hook noop、跨轮重复抑制、旧单行兼容、跨 pair marker 防劫持，并通过隔离安装与 PO E2E 验收。

## 2. Sprint Retrospective：过程检视与改进

### 2.1 What went well

1. **PO 早期 Empathize 参与修正了问题定义**。PO 的 LS3 推翻了“必须直接阅读到达行”的隐含假设，Sprint Goal 从呈现层承诺修正为“无需催问复述即可理解答复”的能力承诺。
2. **拆分过宽 Sprint 有效**。原 Sprint 03 中 PBI-10 / 12 / 13 各自足以成为独立冲刺；拆分后团队只承诺 PBI-09，范围与证据收口明显更清晰。
3. **三方 HOW 讨论防止过度设计**。Developer 主导基本 HOW，SM 对抗审阅，PO 参与关键体验选择；reply 入口从排队文本移回 hook 注入层，避免了层级错误。
4. **SM 独立复核产生实质价值**。跨 pair marker 劫持不是由同 pair happy path 暴露的，说明验收检查必须主动构造对抗场景。
5. **分层证据有效**。fixture、双树、安装缓存、真实宿主事件、原始会话证据与 PO 体验分别判定，避免把测试数量或模型自述误当收信。
6. **返修闭环健康**。发现问题后保留现场、复现根因、修复、加回归、重建候选并重跑关键验证；净工作量约 2 天，未失去估算控制。

### 2.2 Corrected assumptions

1. **“到达行可读”不是产品价值本身**。真实价值是 PO 以模型回答为主要阅读层时，不需要催问复述、搬运或查文件；到达行承担来源与正文可追溯性。
2. **“正文包含 marker-like 内容不匹配”不够**。只测同 pair 相似文本存在确认偏误；跨 pair 完整有效 marker 是可劫持路由的对抗输入。
3. **“freeze”需要操作定义**。不能把开发树通过测试称为冻结；冻结必须包含双树一致、测试绿、已提交、commit hash 可作为候选来源。
4. **状态行不是过程装饰**。Sprint Backlog 的执行状态曾短暂滞后，影响透明性；状态必须随切片冻结同步更新。
5. **大段多文件编辑不能只靠最后一次检查**。一次编辑曾损坏 `store.mjs` 结构，需重读后修复；分段语法 / 快速检查能更早止损。

### 2.3 Improvement actions

| 改进 | 具体动作 | 落地位置 |
|---|---|---|
| 边界测试先列对抗矩阵 | 写边界测试前显式列出跨 pair、伪造 marker、堆叠真实 wakeText、legacy 格式与普通输入，不只用同 pair happy path 代表边界 | 后续 Sprint 检查单与测试设计 |
| 切片冻结操作化 | freeze = 双树同步、声明测试全绿、变更已提交、该 commit hash 进入候选 manifest；缺一项不得称冻结 | `.claude/CLAUDE.md` 与 Sprint 03 retrospective memory |
| 状态随冻结同步 | 每个切片 freeze commit 必须同步 Sprint Backlog 状态与证据摘要，不能等待事后集中补记 | 后续 Sprint 协作规则 |
| 大编辑分段校验 | 多区块 / 多文件编辑后按编辑段执行语法或快速测试，发现结构损坏立即重读原文件并修复 | Developer 工作习惯与 memory |
| 保持证据分层 | 原始入站、前端可见、后续行动、PO 体验继续分层记录；模型自述只作线索，不作 receipt | 长期工作规则与本次总结 |

### 2.4 Retro 结论

本次不修改全局 DoD。既有 DoD 已覆盖标准入口、质量验证、安装候选、真实原始会话证据与 PO 验收；本次暴露的缺口属于边界测试设计、冻结定义与记录透明性，已转化为上述可执行规则和项目记忆。

## 3. 追溯与保留

| 对象 | 记录 |
|---|---|
| Planning 基线 | `a25860f` 基线记录；`6986df8` 拆分过宽范围 |
| Planning 定稿与授权 | `28233f1`、`47091a2`（HOW v04.1） |
| 核心实现与中期证据 | `7052c60`（I2+I2b）、`778fa34`（中期 memory）、`9b2ff16`（TE1）、`0e7765d`（I6） |
| I7 与返修 | `45e488f`、`04f002e`、`2fd17f8`、`bd0fc86`、`02cbaf1`、`e3c8e63` |
| PO I8 | `5abd7d7` 指南；`1c490cb` PO PASS 记录 |
| Developer 收口与合并 | `c031cec`；`583bbad` |
| 已验收运行时代码 | `04f002e35d7b11128fe3afa34a5119d1ecd3f14e` |
| I7 技术验证环境 | Codex thread `01a0a583-159e-75e1-9a8b-d72c35478279`；Claude `S03-I7-Claude-04f002e` / session `7507d698-c2b9-4f2f-bf95-e3cc09c06368`；pair `36ae4c88-bf4f-4d08-bbf1-300025256abd` |
| I7 关键消息 | `7339696d` → `b022e48b` → `b3b34b83` → `053c2528`；忙碌堆叠 `0f3bec2c` / `489c3905`；完整性检查 `00e79075` |
| I8 PO 环境 | Codex thread `01a0a5c1-d151-79a1-8682-dd16aab0237b`；Claude `S03-I8-Claude-PO` / session `172e752e-9956-408c-979f-87ea5049e4fa`；pair `6a4c614d-f36a-4236-8b9a-91e21912b932` |
| I8 四段链 | 请求 `6693e12f-62a4-4db9-81f9-100b530437c5`；回复 `ea40d45d-8ad9-462a-a953-b17e14022fbe`；追问 `0df90299-369c-400a-8958-92ca0ae891b4`；再答 `e65ea5c5-35c2-48e3-b8eb-288d362033e0` |
| 1.3.0 发布 | 两个 annotated tag 均指向本总结所在最终收口 commit；最终包由该 commit 构建，包 hash 在 tag / 发布验证输出中追溯 |

### 原始证据检索

Sprint 过程材料在删除前记录于 `c031cec`，可用 Git 历史检索：

```powershell
git show c031cec:scrum/sprint-03-readable-arrival/SprintBacklog.md
git show c031cec:scrum/sprint-03-readable-arrival/I8-PO-E2E-Acceptance.md
```

Developer 分支历史由合并提交 `583bbad` 保留；实现分支与其 worktree 在发布验证和远端推送后清理。按项目约定，本文件是活跃仓库中的唯一 Sprint 03 总结；一次性 Sprint 材料已从活跃树移除。

## 4. 边界与限制

- 已验证的是本 Sprint 声明的可读到达、自动继续、重复防御与旧格式兼容范围；不承诺任意宿主异常注入形态。
- Windows-only；短文本 trim 后 1..2000 字符；串行逐事件注入；回执仍为 `unverified`。
- 不承诺自动启动 / 终止进程、自动恢复、广播、自动重试、跨机器或跨平台能力。
- PBI-03 的完整投递状态语义、PBI-10 / 13 的状态与生命周期、PBI-12 的目标辨识仍留给后续 Planning，不因本次 release 自动开工。
- 未验证任意跨版本升级路径或未来 CLI 兼容性。
