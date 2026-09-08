# 端到端 Smoke Scenario（T01–T05 × 双方向）

本剧本是本 Increment 的现场验证流程：由 PO 与两个真实原始会话按文档人工执行。它**不判定通过**——判定只依据下方证据规则；编排动作的完成通知、发送方本地输出都不是通过判据。

## 1. 环境前置（每轮运行前逐项确认）

| # | 前置项 | 确认方式 |
|---|---|---|
| 1 | Windows（已验证 Windows 10 Pro 10.0.19045）；Node ≥18.3；codex `0.153.4`、claude `2.1.263`（见 Sprint Backlog 3.6 基线） | `node --version`、`codex --version`、`claude --version` |
| 2 | 已运行 `node bridge/cli.mjs install`，生成的 `.codex/hooks.json` 三条注册指向当前安装位置 | 查看安装输出或 hooks 文件 |
| 3 | Codex 原始会话中 `/hooks` 已审阅并**信任**三条 bridge hook 定义 | 信任界面确认；定义变更会使 trust hash 失效、须重新信任 |
| 4 | 安装后 Codex 原始会话经历过**完全退出并 `codex resume <threadId>` 重载**（运行中的会话不热加载 hook） | resume 后的会话为当前原始会话 |
| 5 | Claude 侧接收策略已知：`crossSessionInbound` 为 `accept`（当前机器配置）时消息直接进入；为默认暂存策略时每条入站消息需 PO 手工批准并**记录批准时间** | `~/.claude/settings.json` 或首条消息行为 |
| 6 | 发送前确认身份环境变量：Claude 会话内不得残留 `CODEX_THREAD_ID`；Codex 会话内有 `CODEX_THREAD_ID`。两者同设会被桥拒绝 | 会话内打印环境变量确认 |
| 7 | 数据目录：首轮用默认 `%LOCALAPPDATA%\ClaudeToCodex\bridge`；重复轮用隔离目录（两个原始会话都从设置了 `CTC_BRIDGE_DIR=<隔离路径>` 的终端启动，hook 子进程才能继承同一根） | `node bridge/cli.mjs status` 显示同一 pair |

## 2. 运行标识与标记约定

- 每轮 runId：`smoke-<yyyymmdd>-<序号>`（如 `smoke-20260908-1`）。
- 每格标记：`SMOKE-<runId>-<格号>` + 一个随机 8 位十六进制串（如 `SMOKE-smoke-20260908-1-T01CX-4f2a9c1b`），保证全轮唯一、可在会话记录中全文检索。
- 证据留存：`bridge/docs/evidence/<runId>/`，含 `MATRIX.md`（十格判定表）与各格证据摘录（会话事件文件路径 + 定位行号/时间戳 + 标记命中片段）。

## 3. 证据规则（判定口径，原文遵循设计冲刺 TestPlan）

**通过**的唯一直接判据：接收方**原始会话**的会话事件记录（Codex 侧 `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`；Claude 侧 `~/.claude/projects/<项目目录>/<sessionId>.jsonl`）按时间序出现该格的唯一标记与消息正文。

以下各项**单独不构成通过证据**：发送方 CLI 输出（`submitted:true`）、queue/pipe 写入成功、本地 JSON 记录（events.jsonl、`*.send.json`）、接收方模型的自述（"我收到了"）。

「继续对话」最小判据：接收方在原始会话内产出一条回到发起方原始会话的可见回复（用 `reply --to < messageId>` 发出）。多轮连续往返由 T05 覆盖。分叉副本、resume 出的替代会话、中继代答收信**不判通过**。

## 4. 判定矩阵（十格）

| 格号 | 场景 | 方向 | 验证方式 | 判据要点 | 证据位置（填写） |
|---|---|---|---|---|---|
| T01CX | 首次联系 | Claude→Codex | 现场 | 空闲 Codex 原会话被唤醒，正文+标记进入其会话事件，并 reply 回到 Claude 原会话 | _待填_ |
| T01XC | 首次联系 | Codex→Claude | 现场 | 空闲 Claude 原会话收到正文+标记（accept 直入或批准后入），并 reply 回到 Codex 原会话 | _待填_ |
| T02CX | 空闲收信 | Claude→Codex | 现场 | queue 唤醒触发 UserPromptSubmit hook 注入，产生新模型调用 | _待填_ |
| T02XC | 空闲收信 | Codex→Claude | 现场 | 管道消息触发空闲 Claude 原会话的新模型调用 | _待填_ |
| T03CX | 生成中收信 | Claude→Codex | 现场 | Codex 当前生成完整结束后（Stop hook 注入），消息进入下一次上下文；原输出无截断 | _待填_ |
| T03XC | 生成中收信 | Codex→Claude | 现场 | Claude 长文本生成期间收到 `priority=next` 消息：当前输出**完整结束**，消息在下一次模型调用前进入；无截断 | _待填_ |
| T04CX | 工具边界收信 | Claude→Codex | 现场 | 工具执行结束后、首次续接前，PostToolUse hook 注入正文（检查点在原任务未结束时出现） | _待填_ |
| T04XC | 工具边界收信 | Codex→Claude | 现场 | Claude 后台任务边界收到管道消息，消息在下一次上下文机会进入 | _待填_ |
| T05 | 连续往返 | 双向 | 现场 | 请求→回复→追问→再答均发生在同一对原始会话之间（messages/ 中 conversationId 一致） | _待填_ |
| REG | 安装与配置实证 | — | 现场 | 干净数据目录下完成 install→信任→resume→register→pair→首次通信全程，无历史路径引用 | _待填_ |

辅助证据（过程记录，不单独构成通过）：`bridge` 数据目录中 `events.jsonl`、`receipts/`、`wire/*.send.json`、`pair.json`。

## 5. 重复运行约定

「可重复执行」＝同一版本基线下**至少两次独立运行通过**：每次使用独立 runId、新会话（或 resume 后的原会话明确记录）、全新唯一标记，并使用隔离数据目录（`CTC_BRIDGE_DIR`，两个会话都从设置了该变量的终端启动）或显式重配对（见 USAGE §配置）。端点失效走显式重配对，不做自动恢复。

## 6. 现场操作步骤（供 PO 协调）

1. 双方就位：一个 Codex 原始会话（threadId 记录在案）+ 一个 Claude 原始会话；按第 1 节完成前置 2–7。
2. Claude 会话内执行 `node bridge/cli.mjs register`，记录端点文件路径；执行 `node bridge/cli.mjs pair --codex <codexThreadId> --claude-endpoint <端点文件>`，记录 pairId。
3. 按矩阵逐格执行：发起方在**自己的原始会话内**运行 `send`（或对收到的消息 `reply --to <messageId>`），正文含该格标记；接收方按第 3 节判据核对会话事件后回应。
4. 每格结束立即把证据摘录落到 `bridge/docs/evidence/<runId>/`。
5. 十格完成后由 PO 签署 MATRIX.md 判定；随后按第 5 节择期执行第二次独立运行。
