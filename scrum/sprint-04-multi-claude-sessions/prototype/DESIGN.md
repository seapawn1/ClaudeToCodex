# Sprint 04 / PBI-11 原型设计笔记（多配对扩展）

- 状态：预研稿，2026-09-13。作者：Developer（Claude 会话 6aeef5d8）。
- 基线：已发布 1.0.0（`bridge/` @ main 2b46e77）。本目录为隔离原型，不改产品源码。
- 范围：一个 Codex 原始会话 ↔ 至少两个 Claude 原始会话，配对共存、目标确定、回复归属、重叠来信三态。不含任意规模、广播、并发吞吐、自动启动/恢复。

## 1. 单配对触点清单（1.0.0 实测代码，非假设）

| # | 位置 | 单配对假设 | 多配对影响 |
|---|---|---|---|
| 1 | `store.pair()` / `getPair()` | 数据根下唯一 `pair.json`；不同配对直接抛错拒绝 | 改为配对注册表（每配对一文件），保留"不静默替换"语义 |
| 2 | `store.caller(env)` | 环境变量必须匹配唯一配对的双侧之一 | Codex 侧唯一（本桥数据根服务一个 Codex 会话）；Claude 侧按 claudeId 定位配对 |
| 3 | `store.prepare()` | 隐式读唯一配对 | 显式传入配对：reply 按被回复消息的 pairId 定位；codex 新发送按目标名称定位 |
| 4 | `store.publish()` | `pending/<codexId>` 单槽，占用即抛"wait for it to be consumed" | 改 `pending/<pairId>` 每配对一槽；不同配对互不占用 |
| 5 | `store.take(event)` | 只认唯一配对的 codexId 与唯一槽 | 扫描全部 `pending/<pairId>/`，按消息 createdAt 最旧先取；唤醒文本带 pairId 时优先取该槽 |
| 6 | `handleHook()` | `pair.codexId` 单配对门控；唤醒抑制按唯一 pair.id | 门控改为注册表共享 codexId；唤醒抑制按注册表查 pairId |
| 7 | `cli.mjs connect` | `store.pair()` 一步建唯一配对 | upsert：同 claudeId 更新端点，不同 claudeId 新增共存配对（codexId 必须一致），记录 claudeName 供目标选择 |
| 8 | `cli.mjs send` | 无目标参数 | `send --name <目标>` 必填（reply 不变，按 --to 归属） |
| 9 | `cli.mjs status` | 单配对 + 单待收 | 列出全部配对及各自端点观察、待收槽、最近事件 |

## 2. 已具备的多配对基础（无需改动）

- 消息模型：`pairId` / `conversationId` / `replyTo` / 双侧 sessionId 本来按配对隔离；`validMessage` 按配对校验。
- `endpoints/claude-<sessionId>.json` 按 sessionId 存放，天然多端点；`connect` 合成端点的逻辑与目标数量无关。
- Codex→Claude：每端点独立命名管道 + `priority=next`，无共享资源，无串扰路径。
- 唤醒文本 `[CTC-WAKE <pairId> <messageId>]` 已携带 pairId，天然可区分多配对。
- `receipts/<messageId>.json` 全局按 messageId 去重，重复注入抑制与配对数无关。
- `wire/`、`claims/`、`messages/` 均按 messageId 全局唯一，配对数无关。
- `renderPeer` 的回复入口按 `--to <messageId>` 解析，与配对数无关。

## 3. 设计决策

### D1 配对注册表

- 存储：`pairs/<pairId>.json`，每文件 `{ id, codexId, claudeId, claudeName, endpointPath, createdAt }`，`{ flag: 'wx' }` 写入，沿用现有崩溃安全风格；不用单索引文件（避免写坏全表）。
- 不变量：同一数据根内所有配对 `codexId` 必须一致——本桥目录服务一个 Codex 原始会话；违反即抛错，不猜测。
- 共存上限：原型不设硬上限，但不承诺任意规模（验收最低 2 个）。
- `connect` upsert 语义：同 `{codexId, claudeId}` → 沿用配对、端点路径变化时更新 `endpointPath` 并记 `endpoint-updated` 事件；不同 claudeId → 新配对（事件 `paired`）；不影响其他配对（S04-11-1 连接 B 不拆 A）。
- 迁移：数据根存在旧 `pair.json` 且无 `pairs/` 时，只读识别为单配对注册表项（原型阶段只设计、不实测迁移；S04-11-7 阶段再验）。

### D2 目标确定（S04-11-2）

- Codex 新发送：`send --name` 必填。名称在注册表内解析：唯一匹配 → 该配对；无匹配 → 报错并列出可选用目标；多义 → 报错并列出候选与各自 claudeName/sessionId 尾号/项目上下文，要求更精确名称。不猜测、不默认最近使用。
- 名称只是选择依据：投递身份始终是配对的 claudeId + endpoint.sessionId 双重核对（沿用 1.0.0 的 `endpoint.sessionId !== pair.claudeId` 校验），端点失效即失败，不静默改投。

### D3 回复归属（S04-11-3）

- `reply --to <msgId>`：按消息文件定位 `pairId` → 加载该配对 → 校验调用方身份（claude 调用方须等于该配对 claudeId；codex 调用方须等于共享 codexId）。不匹配即报错，正文不落盘。
- 归属链只看被回复消息，与最近发送、当前选择、候选排序无关（代码路径上 `prepare` 不接受"当前目标"默认值即可保证）。

### D4 待收槽与重叠三态（S04-11-5）

- 每配对一槽 `pending/<pairId>/`，槽内仍为"整目录 rename 原子发布"，占用语义不变。
- **接纳**：A、B 各自 publish 到各自槽（互不占用），各自的 wake 独立入队；Codex 每次钩子事件至多取一条（取最旧），两条先后进入上下文，各自留 `context-prepared` 与收据。可观察：两条正文都出现在同一 Codex 原始会话，且各自 messageId 完整。
- **等待**：同配对槽被占（同目标上一条未消费）→ publish 报"该目标有待收未消费"，状态入口可见占用中的 messageId；或 wake 先于前一条消费到达 → 后一条留在槽内等下一次钩子事件。等待是显式状态，不是丢失。
- **拒绝**：端点失效/身份不符 → pipe 写入失败，`send-error` 记录原因与下一步，不自动重试、不静默改投。
- 无覆盖（每槽 wx+rename）、无串目标（claim 时按消息 pairId 重验）、无重复注入（全局收据去重）。
- 不承诺全局顺序：只保证单配对内 FIFO + 跨配对按 createdAt 最旧先入上下文。

### D5 钩子与唤醒

- `handleHook`：无配对 → 返回 `{}`（行为同 1.0.0）；有配对但 `event.session_id` ≠ 共享 codexId（或带 agent_id）→ `{}`。
- `take`：UserPromptSubmit 且 prompt 是合法 CTC-WAKE 时，优先尝试唤醒指向的 `<pairId>` 槽；否则取全部槽中最旧。收据与 `wake-suppressed` 逻辑不变（唤醒抑制本就按 pairId 比对）。

### D6 状态入口

- `status` 输出：配对数组（各含 claudeName、claudeId/codexId、createdAt、endpointPath 是否存在、待收槽无/有及 messageId）+ 最近事件。原型先给结构化输出；可读化呈现属 Sprint 03 / PBI-09 范畴，不在本原型展开。

## 4. 原型验证计划（fixture 层，W3）

1. 共存：connect A、connect B 后两配对并存，重复 connect A 沿用且 B 不受影响（S04-11-1）。
2. 目标确定：`send --name` 无匹配/多义报错且不产生消息文件；唯一匹配投给正确配对（S04-11-2）。
3. 回复归属：切到 B 发送后，对 A 旧消息 `reply` 仍归 A；B 的调用方 reply A 的消息被拒绝（S04-11-3）。
4. 重叠三态：A、B 相近时间 publish 均接纳、依次消费、收据各自唯一；同槽第二条等待；端点缺失发送失败留 send-error（S04-11-5）。
5. 唤醒去重：同 messageId 重复唤醒被抑制，不重复注入（S04-11-5 附带）。
6. 回归：单配对路径（只 connect 一个）在多配对代码上行为不回退（S04-11-7 的 fixture 前置）。

## 5. 未决问题（向 SM/PO 报告后定）

- 专用测试 Codex 会话启动方式（W4 前需明确）。
- 旧 `pair.json` 单配对数据的实测迁移与"继续使用/重建"路径放到 S04-11-7 阶段，原型仅设计。
- `claudeName` 在配对文件内快照化（连接时的名称）；会话改名后名称与身份的关系如何呈现，待 S04-11-2 真实场景定。
