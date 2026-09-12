# Sprint 04 Review & Retrospective：一 Codex 对多 Claude Code 会话

- 日期：2026-09-13（Asia/Shanghai；原始事件时间沿用 2026-09-12 UTC）。
- 参与者：Product Owner（首批用户）、Scrum Master / Codex、Developer / Claude Code。
- 结论：Sprint Goal 达成；PBI-11 Increment 的技术验收与 PO DoD 均通过；Review 与 Retrospective 完成。Developer 分支已合入 `main`，活跃 Sprint 材料已蒸馏清理。后续是否发布、更新日常安装或开启下一个 Sprint 由 PO 另行决定。

## 1. Sprint Review：Increment 与价值检视

Sprint Goal：

> 让 PO 通过同一个 Codex 原始会话，与至少两个可明确辨认的 Claude Code 原始会话持续开展独立交流，无需为了更换交流对象而拆除另一条连接，且每次消息、回复与连接操作都作用于正确目标。

本次交付 PBI-11：一个 Codex 原始会话可同时保持多个 Claude Code 配对，按名称选择目标；回复沿原消息归属；每配对独立待收槽；相近来信逐事件注入且不覆盖、不串目标、不重复；可显式退役单个目标并重建；1.0.0 单目标与 legacy 路径保持可用；产品双树、skill、README、INSTALL、USAGE、SMOKE 与插件清单同步。

### 1.1 Increment 检视

| 检视项 | 结果 |
|---|---|
| 技术 AC | `ee73808` 的 S04-11-1 至 S04-11-8 全部通过；SM 使用固定提交、安装清单、原始会话帧与事件时间线独立核对 |
| 产品回归 | bridge 代码与独立通过 50/50 的 `b8e392e` 一致；16 个 bridge 源文件与插件镜像一致 |
| 安装候选 | 隔离本地 marketplace 安装；19 个文件全部匹配源提交且无夹带；完整清单摘要 `37750c3756370fb2282a61d4b6e341306fbe46c7edd34d761592bb1f056c3374` |
| 实际插件路径 | 候选 hooks、CLI、reply 入口和原会话入站帧均指向同一隔离安装；原型项目 hooks 已备份移除 |
| A/B 业务交流 | A/B 各自完成业务请求、回复、追问和再答；八条当前候选消息完整对象匹配，正确原会话各一次，另一目标零误投 |
| 回复归属 | 与 B 往来后回到 A 旧消息，`replyTo`、pair 与 conversation 均保持 A |
| 重叠边界 | 两条发布时间相差约 0.66 秒，均先于首个上下文准备；两条 wake 均逐事件送达；重复唤醒被抑制；不声称槽并存时长 |
| 工作中收信 | T03CX、T04CX、T03XC 通过；生成、工具、priority=next 三种边界均以原始事件区分，不使用模型自述替代 |
| PO DoD | 通过。PO 原话：“非常好，很容易分清两个对象，我觉得非常好。是的，不需要拆除另一条连接，这样就很方便。追问也很好。支持，我觉得我很满意了。” |

历史证据按层保留：fixture、真实原型、最终安装候选不互相冒充。人工恢复、误判样本、未构成工作中收信的记录与 Developer 自主重发均保留原定性，不倒改为自动成功。

### 1.2 PO 价值检视

Product Goal 是让 PO 在实际项目中通过原始会话直接交流，无需人工转述。Sprint 04 将该价值从“一对一协作”扩展到“一个 Codex 与多个可辨认 Claude 协作对象并行推进”。

PO 在当前有效隔离候选上亲自判断：

- 容易分清两个对象；
- 更换交流对象不需要拆除另一条连接；
- 追问回到预期对话；
- 当前已支持自己想要的多方协作；
- 整体满意。

因此 PBI-11 同时满足 Definition of Output Done 与 Definition of Outcome Done。

### 1.3 已知边界

- 已验证最低规模为一个 Codex 原始会话与两个 Claude Code 原始会话；不承诺任意规模、广播或并发吞吐。
- Windows 本机、短文本 1..2000 字符、串行投递与每配对待收槽边界保持。
- 回执仍为 `unverified`；收信验收以接收方原始会话完整入站帧和自动关联字段为准。
- 会话重启或端点失效后需显式连接/重建；不自动恢复、不自动重试。
- 本轮为隔离本地 marketplace 候选；没有声称 ZIP 发布、日常安装更新或更多宿主版本兼容。
- 候选 hook 信任有效且真实执行，但建立者未能从现有配置追溯，记为未知。
- PO 的单场景满意不扩大为长期日常使用或多用户结论。

## 2. Review 的 Product Backlog 适应

PBI-11 从未完成列表移入“已交付能力”。本次 Review 只记录以下候选项与建议输入，最终排序仍由 PO 决定：

1. **PBI-09 呈现可读性**：A 的业务回答建议正文前置、元数据折叠后置；reply 命令已可自动携带 `--to`，常规展示不必要求用户查看 ID。该输入可 refine 验收，不改变 PBI 优先级。
2. **PBI-12 目标辨识**：B 指出“孪生候选”是高风险场景——同项目、同机器、同时间窗且行为相似时，启发式不足以区分；真正歧义时可考虑单键确认、线程内记忆选择，并展示零成本区分线索。
3. **PBI-10 / PBI-13**：多配对技术基础已具备，但单配对状态的人话呈现、快捷状态入口和显式断开体验仍未由 Sprint 04 完成；PBI-13 的 UX 入口可复用 `retire` 生命周期语义。
4. **安装维护**：候选优先验证暴露了源外夹带、完整清单和 metadata 描述问题；后续版本流程应把安装副本验证前移，但这属于流程改进，不自动新增产品 PBI。

没有未完成的 Sprint 04 PBI 需要退回 Product Backlog。

## 3. Review 决策记录

- PBI-11 Increment：验收通过。
- Sprint Goal：达成。
- PO DoD：通过。
- 发布/日常安装更新：未由本记录决定；候选仍在隔离环境，日常插件、缓存、marketplace、共享配置与默认桥保持原状。
- 分支合入与活跃资料清理：已按 PO 指令执行；`worktree-s04-pbi-11` 合入 `main`，产品源候选为 `ee73808`，本 Review/Retro 收口 commit 删除活跃 Sprint 目录并仅保留本总结文档。

## 4. Sprint Retrospective：质量与有效性改进

### 4.1 Worked well

1. **三阶段风险递减路径有效**：隔离原型先验证机制，真实三会话闭环暴露宿主与原会话行为，最后进入产品双树与安装候选。机制性风险没有带入最终产品整合。
2. **SM 独立帧级复验有效**：SM 的固定提交、跨进程实验和原始会话帧核对发现了半写入、锁所有权、证据时间线误读等真实缺口；Developer 的实现质量因此显著提高。
3. **PO 小切口决策有效**：启动目录纠正与并发深度砍停避免了数量级无效功。价值边界由 PO 拍板、SM 转译、Developer 执行的协作方式值得保留。
4. **分层证据与失败样本保留有效**：人工恢复、误判、拒绝和重发样本没有被“洗成”成功，使最终验收能明确说明复用依据。
5. **queue 异步协作适合本团队**：19 份正式报告与多次反馈在不打断 PO 的情况下保持了透明，但后续需要更早暴露范围成本。

### 4.2 Corrected assumptions

1. **“事件已记录”不等于“消息已收到”**：`created`、`published`、`context-prepared` 只是过程层证据；只有接收方原始会话完整入站帧与自动关联字段一致，才可作为收信证据。
2. **次级时间信号不能替代原始边界**：文件落盘时间、模型自述、包装函数提前返回、工具结束时间都不能直接证明生成中收信或工作中收信。必须分别读取发布、唤醒、注入、模型输出和工具执行的原始时间线。
3. **原型路径通过不等于安装候选通过**：源外夹带、清单、metadata、实际 hooks 与 reply 入口只有在安装副本中才可见。
4. **AC 字面完成与工程加固深度不同**：并发修复早期由 Developer 自行吸收，直到 PO 不得不划定边界。超过验收所需深度时应作为范围与成本问题上升，而不是默认继续施工。
5. **宿主编排必须符合宿主真实行为**：既有 SMOKE 模板比临时自创包装更可靠；异步 yield、工具元数据丢失和进程生命周期都可能制造假样本。

### 4.3 Improvement actions

| 改进 | 具体动作 | 落地位置 |
|---|---|---|
| 原始帧证据纪律 | 边界类结论只允许使用 publish / wake / context-prepared / 原始会话入站帧等可追溯时间戳；模型自述和次级信号只能作线索 | 写入 Sprint 04 长期记忆与后续 Sprint Backlog 模板 |
| 候选优先验证 | 新特性冻结后立即装入隔离插件缓存，AC 实测直接跑在安装副本上；同时核对完整文件清单与 metadata | 后续 Sprint 计划与安装验收模板 |
| 范围成本即时上升 | 当工作为质量所需但超出 AC 字面或显著超出估计时，Developer 停在可回顾点并向 SM/PO 呈现选项，不自行吸收 | 写入团队协作记忆与 Daily 检查 |
| 既有判定模板优先 | 工作中收信、空闲收信、工具边界和真实 Smoke 先复用已验证模板；新编排必须保留宿主元数据与外部时间戳 | SMOKE / 测试计划 |
| 授权与进程归属留痕 | 安装、hook 信任、重启和停止进程时记录操作者、目标 PID/路径与时间；无法追溯则明确未知 | 安装验证记录模板 |

### 4.4 Retro 结论

本次不修改全局 DoD。以上改进进入长期记忆与后续 Sprint 计划，其中“候选优先验证”和“原始帧证据纪律”是下一 Sprint 最直接落地的两项。下一个 Sprint 的具体范围和排序仍由 PO 在 Planning 决定。

## 5. 追溯与保留

| 对象 | 记录 |
|---|---|
| 产品源候选 | `ee73808cc9e5a2324f4a6900f404cf364af65ace` |
| Developer 分支 | `worktree-s04-pbi-11`（合入前分支头 `9946d2a7d7cf94adaf53af5e7e3368b4e4062468`） |
| 安装路径 | `C:/Users/DELL/AppData/Local/ClaudeToCodex/s04-test/codex-home/plugins/cache/claudetocodex-dev/claudetocodex/1.0.0` |
| 安装内容摘要 | `37750c3756370fb2282a61d4b6e341306fbe46c7edd34d761592bb1f056c3374` |
| 原始 Review 证据提交 | `9414f9d724f4d029e03dc28730e4d818a5e57ad7`；最终收口 commit 将其作为第二父提交引用 |
| Developer Retro 输入 | Claude 原始会话 `6aeef5d8-75be-4627-8daf-7ae829fee49b`，2026-09-13 |

### 原始证据检索

原始验收 JSON、PO 记录、SM 反馈与中间检视保存在证据提交 `9414f9d724f4d029e03dc28730e4d818a5e57ad7`：

```powershell
git show 9414f9d:scrum/sprint-04-multi-claude-sessions/coordination/acceptance-review.json
git show 9414f9d:scrum/sprint-04-multi-claude-sessions/coordination/candidate-ee73808-review.json
git show 9414f9d:scrum/sprint-04-multi-claude-sessions/coordination/po-experience-record.md
```

Developer 原型、harness、Sprint Backlog 与第三部分记录由已合入的 `worktree-s04-pbi-11` 提交历史追溯；关键产品源候选为 `ee73808`。按项目约定，本文件是活跃仓库中的唯一 Sprint 04 总结；一次性过程资料已从活跃树移除。
