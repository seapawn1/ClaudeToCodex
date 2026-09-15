# Sprint 03 I8：PO 手动端到端验收方案

- 日期：2026-09-15
- 状态：PASS（2026-09-16，PO 验收通过）
- 目的：验证 Sprint Goal v2 的真实协作价值，而不是重复 I7 技术测试矩阵。
- 候选：安装候选 sourceCommit `04f002e`；实现记录分支 `s03-implementation-dev-20260915`，未合并 `main`。
- 参与者：PO 执行真实体验；SM 准备环境并记录证据；Developer 不参与实现，除非 I8 失败后返修。

## 1. 验收问题

I8 只回答一个核心问题：

> PO 在 Codex 侧与 Claude Code 协作时，是否无需催问复述、人工搬运或翻查数据文件，即可理解 Claude 答复并直接继续协作？

四段链路必须自然完成：

```text
Codex 请求 → Claude 回复 → Codex 追问 → Claude 再答
```

## 2. 环境与边界

### SM 准备

- 使用已安装的 `04f002e` 隔离候选。
- 新建 I8 专用 Codex / Claude 原会话，不复用 I7 技术验证会话。
- Codex 使用隔离 `CODEX_HOME` 与 GLM profile。
- Claude 从 `D:\ClaudeToCodex` 启动，保持正确项目身份。
- SM 用安装候选 CLI 建立 pair；PO 不执行 connect、不设置环境变量、不手写 ID。

### PO 边界

PO 只做自然语言操作和体验判断：

- 不手写 messageId / pairId / threadId。
- 不设置 `CODEX_HOME` 或 `CTC_BRIDGE_DIR`。
- 不打开 wire / messages / events / receipts 等数据文件。
- 不要求 Codex 复述 Claude 刚才说了什么。
- 不手动搬运 Claude 正文。
- 如出现宿主 hook 信任提示，由 PO 确认；这是唯一需要 PO 处理的宿主交互。

## 3. PO 操作流程

### 步骤 0：确认窗口

使用标题为 **`S03 I8 Codex - PO E2E`** 的 Codex 窗口。

不要使用：

- 主 checkout 的日常 Codex 会话。
- I7 技术验证窗口。
- Developer 施工会话。

### 步骤 1：发起真实请求

在 I8 Codex 窗口输入一个真实、有内容的问题，让 Codex 发给 Claude。示例：

> 请问 Claude：从 PO 的日常使用体验看，这次“可读到达”最重要解决了什么问题？请用几句话说明。

也可以换成 PO 真实关心的问题，但应要求 Claude 给出可判断的多行答复。

观察点：

- 发送后不催促、不追问、不手动推动。
- 等待 Claude 回复自动到达 Codex。
- 到达后直接理解内容。

失败示例：

- PO 需要问 Codex：“Claude 刚才说了什么？”
- PO 需要切换到 Claude 侧复制正文。
- PO 需要查看任何 bridge 数据文件。

### 步骤 2：检视首次到达

Claude 首答后，PO 回答三个观察：

1. 我是否直接理解 Claude 的答复？
2. 我是否能辨认这是 Claude 的外来答复，而不是 Codex 自编？
3. 是否没有同一大段正文重复注入造成阅读干扰？

通过倾向：

- 直接理解。
- 来源可辨认。
- 正文不重复造成负担。
- 以模型回答为主要阅读层，排队消息可追溯原文。

### 步骤 3：基于内容直接追问

必须基于 Claude 的答复内容追问，不能要求复述。

推荐示例：

> 我同意这个点。请追问 Claude：如果用户正在忙，排队体验应该优先保护什么？

失败示例：

> Claude 刚才说了什么？
> 你能复述一下它的原话吗？

观察点：

- 追问自然发出。
- Claude 收到并理解上下文。
- PO 不需要手动复制首轮回复。

### 步骤 4：等待 Claude 再答

发出追问后等待 Claude 第二次回复自动到达 Codex。

预期：

- 无需 PO 再次输入推动。
- 无需切换窗口搬运。
- Codex 能基于第二次回复继续回答或总结。
- 四段链路自然闭合。

### 步骤 5：工作中到达观察（建议执行）

让 Codex 执行一个稍微耗时的整理任务，同时让 Claude 发来一条消息。

观察：

- 当前 Codex 调用没有被破坏。
- 消息排队是正常状态，不是故障。
- 当前任务结束后，消息在后续边界进入上下文。
- 不需要手动重发。

判定：

- “已排队未处理”不是错误。
- 空结束、正文丢失、必须手动重发、当前调用被打断，均为失败。

### 步骤 6：Claude 侧不回退检查

快速查看 Claude 侧两点：

1. Claude 仍能看到请求 / 追问。
2. Claude 侧呈现没有变成乱码、UUID 倾倒或来源不明。

无需重复完整技术矩阵；I7 已提供技术证据。

## 4. PO 观察表

PO 完成后填写以下观察。可用“是 / 否 / 说明”。

| # | 观察 | 结果 | 备注 |
|---|---|---|---|
| 1 | 我直接理解了 Claude 的答复 | 是 | PO 明确确认直接理解答复 |
| 2 | 我没有让 Codex 复述 Claude 回复 | 是 | PO 明确确认无需复述 |
| 3 | 我没有人工搬运文本 | 是 | 四段链路由 bridge 自动关联 |
| 4 | 我没有翻查数据文件 | 是 | PO 只在 I8 Codex 窗口操作 |
| 5 | 空闲回复自动推动下一次处理 | 是 | 事件链含 wake-submitted 与 context-prepared |
| 6 | 工作中到达没有打断当前任务 | 通过 | I8 整体无异常；专项边界由 I7 S03-4 PASS 覆盖 |
| 7 | 排队 / 到达状态没有被误报为故障 | 是 | PO 整体验收通过 |
| 8 | 来源、正文、回复去向可信 | 是 | PO 能辨认外来答复；replyTo 链完整 |
| 9 | Claude 侧没有回退 | 是 | PO 整体验收通过 |
| 10 | 我愿意在日常协作中继续使用此体验 | 是 | PO 明确表示“整体非常好，验收通过” |

### I8 结果：PASS（2026-09-16）

- PO 明确结论：**“整体非常好，我验收通过了。”**
- 首答观察：直接理解 Claude 答复；能辨认这是 Claude 的外来答复而非 Codex 自编；没有同一大段正文重复注入造成阅读干扰。
- 追问观察：追问自然发出；Claude 收到并理解上下文；PO 不需要手动复制首轮回复。
- 真实四段链路：
  - 请求 `6693e12f-62a4-4db9-81f9-100b530437c5`（Codex → Claude）
  - 回复 `ea40d45d-8ad9-462a-a953-b17e14022fbe`（Claude → Codex，replyTo 请求）
  - 追问 `0df90299-369c-400a-8958-92ca0ae891b4`（Codex → Claude）
  - 再答 `e65ea5c5-35c2-48e3-b8eb-288d362033e0`（Claude → Codex，replyTo 追问）
- SM 原始事件证据：两次 Claude→Codex 到达均有 `created → published → wake-submitted → context-prepared`，并伴随同轮 `wake-same-turn-noop`；重复唤醒在新 turn 被 `wake-suppressed`，receiptTurnId 可追溯。
- 环境：安装候选 sourceCommit `04f002e`；I8 Codex thread `01a0a5c1-d151-79a1-8682-dd16aab0237b`；Claude `172e752e-9956-408c-979f-87ea5049e4fa`；pair `6a4c614d-f36a-4236-8b9a-91e21912b932`。
- 工作中到达未在 I8 中单独复测；该判据由 I7 S03-4 两条真实 PostToolUse 到达证据覆盖，且 I8 整体体验无异常。

## 5. I8 PASS 判定

以下全部满足才判定 PASS：

1. 四段往返完整：请求、回复、追问、再答。
2. PO 未额外催问复述。
3. PO 未人工搬运。
4. PO 未查看 bridge 数据文件。
5. 空闲到达自动触发 Codex 后续处理。
6. 工作中到达不破坏当前调用。
7. 正文可理解，来源可辨认，回复去向可信。
8. Claude 侧没有回退。
9. PO 确认 Goal v2 的协作价值已实现。

## 6. I8 FAIL 处理

如任一关键步骤失败：

1. PO 立即停止操作，保留现场。
2. 记录失败点、界面现象与当时的操作。
3. SM 保存 bridge 事件、原会话线索和候选信息。
4. Developer 诊断并返修。
5. 返修后重建安装候选。
6. 重新执行 I8；不能沿用失败候选的 I8 结论。

## 7. SM 取证记录

SM 记录以下内容，PO 不需要填写：

- Codex threadId、Claude sessionId、pairId、bridge root。
- 每段消息的 messageId、replyTo、conversationId。
- `created / published / wake-submitted / context-prepared` 事件链。
- 空闲与工作中边界事件。
- 排队文本是否包含 Source 头行、完整正文、尾部 marker。
- hook 注入层是否保留 reply entry 且正文不重复。
- PO 前端可见性观察与原始事件分层记录。

## 8. I8 完成后

I8 PASS 后：

1. SM 将 I8 结果与 S03-09-1 至 S03-09-7 最终状态写入 Sprint Backlog。
2. 召开 Sprint Review，检视 Increment 与价值。
3. Review 后由 PO 决定是否合并实现分支到 `main`。
4. 召开 Sprint Retro。
5. 后续进入 Sprint 06 / 07 Planning，而不是重新扩大 Sprint 03。

