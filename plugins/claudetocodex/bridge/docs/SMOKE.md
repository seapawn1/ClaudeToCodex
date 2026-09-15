# 端到端 Smoke Scenario（T01–T05 × 双方向）

本剧本是本 Increment 的现场验证流程：由 PO 与两个真实原始会话按文档人工执行。它**不判定通过**——判定只依据下方证据规则；编排动作的完成通知、发送方本地输出都不是通过判据。

## 1. 环境前置（每轮运行前逐项确认）

| # | 前置项 | 确认方式 |
|---|---|---|
| 1 | Windows（已验证 Windows 10 Pro 10.0.19045）；Node ≥18.3；codex `0.153.4`/`0.154.0`、claude `2.1.263`/`2.1.268`（见 USAGE §5 基线） | `node --version`、`codex --version`、`claude --version` |
| 2 | 已运行 `node bridge/cli.mjs install`，生成的 `.codex/hooks.json` 三条注册指向当前安装位置 | 查看安装输出或 hooks 文件 |
| 3 | Codex 原始会话中 `/hooks` 已审阅并**信任**三条 bridge hook 定义 | 信任界面确认；定义变更会使 trust hash 失效、须重新信任 |
| 4 | 安装后 Codex 原始会话经历过**完全退出并 `codex resume <threadId>` 重载**（运行中的会话不热加载 hook） | resume 后的会话为当前原始会话 |
| 5 | Claude 侧接收策略已知：`crossSessionInbound` 为 `accept`（当前机器配置）时消息直接进入；为默认暂存策略时每条入站消息需 PO 手工批准并**记录批准时间** | `~/.claude/settings.json` 或首条消息行为 |
| 6 | 发送前确认身份环境变量：Claude 会话内不得残留 `CODEX_THREAD_ID`；Codex 会话内有 `CODEX_THREAD_ID`。两者同设会被桥拒绝 | 会话内打印环境变量确认 |
| 7 | 数据目录：默认流程**无需设置任何环境变量**——connect/send/reply/status 与 hook 按 Codex 会话自动选择并复用数据根；显式隔离轮仍可用 `CTC_BRIDGE_DIR`（两个原始会话都从设置了该变量的终端启动，hook 子进程才能继承同一根；该模式下索引不读不写） | `node bridge/cli.mjs status` 的 `root.path` 与预期一致 |
| 8 | 测试会话启动环境（PO 约束，2026-09-13）：新建/恢复**测试用 Codex 会话**时命令末尾必须追加 `--profile glm`（否则无可用模型）；**测试用 Claude 会话**必须在项目身份正确的目录启动（`D:\ClaudeToCodex` 或 `D:\ClaudeToCodex\.claude\worktrees\<sprint worktree>`），不得在临时目录或无关项目启动 | 启动命令与启动目录核对入证据记录 |

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

## 4b. 多目标附加格（MT 系，Sprint 04 起；判据同第 3 节）

| 格号 | 场景 | 验证方式 | 判据要点 | 证据位置（填写） |
|---|---|---|---|---|
| MT1 | 双配对共存 | 现场 | 同一 Codex 原会话连接两个 Claude 原会话（connect 两次），status 列两对；连接 B 后 A 仍可通信 | _待填_ |
| MT2 | 名称路由 | 现场 | `send --name <A名>` 仅 A 原会话入站；B 同时间窗无该消息入站事件；恰一目标时免 `--name` 与 1.0.0 形态一致 | _待填_ |
| MT3 | 回复归属 | 现场 | 与 B 往来后 `reply --to <A 的旧消息>`：投给 A（conversationId 与 A 首轮一致） | _待填_ |
| MT4 | 重叠来信 | 现场 | 两目标相近时间回复：各落各槽、逐事件注入（实际记录两条发布与各自上下文准备时间，不声称并存时长）；重复唤醒被抑制；另一目标无误投 | _待填_ |
| MT5 | 退役隔离 | 现场 | 停 A 后 B 全链路可用；旧端点发送/旧消息回复如实 send-error 无误投；`retire --pairId` 后同身份重建得新 pairId；旧消息回复被拒 | _待填_ |

多目标轮的数据根建议用隔离 `CTC_BRIDGE_DIR`；`send --name` 歧义时报错列完整 pairId 与 retire 入口，按提示操作即可，不手写记忆 ID。

## 4c. 数据根与连续投递附加格（S05 系，Sprint 05 起；判据同第 3 节）

| 格号 | 场景 | 验证方式 | 判据要点 | 证据位置（填写） |
|---|---|---|---|---|
| R1 | 新会话自动根 | 现场 | 默认根被 incumbent Codex 占用时新开 Codex 会话 connect ≥1 个 Claude 并双向通信：全程无手写 `CTC_BRIDGE_DIR`/threadId/路径；`bridge-roots\<threadId>.json` 登记可查（root-bound 事件留痕）；旧根数据零改动 | _待填_ |
| R2 | resume 复用 | 现场 | 同一 thread 完全退出后 resume：自动复用原根原 pair，既有 pending/消息/证据不丢、不产生重复身份 | _待填_ |
| R3 | 多目标同根 | 现场 | 一个 Codex＋≥2 Claude：connect、按名发送、Claude reply、queue wake、hook 消费全部落在同一 per-Codex 根（可与 MT 系叠加） | _待填_ |
| R4 | 跨根/不一致诊断 | 现场 | 人为构造不一致（如宿主以错误根 resume）：原始会话收到确定性诊断（消息所在根、该根服务的会话、下一步）；status `pendingNote` 为未知/可能措辞；均不声称收信 | _待填_ |
| R5 | 连续官方投递（PBI-14 回归） | 现场 | ≥2 pair 各自连续 ≥2 条 Claude→Codex 回复：每条完整正文经 hook 入原始会话（第 3 节判据），pending 随领取清空，下一条不被首条阻塞 | _待填_ |
| R6 | 冲突与边界 | 现场 | 默认根属他时不改绑不合并；`retire`/重叠保护/重复 wake 行为与说明一致 | _待填_ |

S05 系数据根为自动选择（不设环境变量即真实路径）；`status` 的 `root` 字段记录当前服务根与来源。S05 系测试会话一律遵守前置 8（Codex `--profile glm`、Claude 在项目目录启动）。

## 4d. 可读到达与自动继续附加格（S03 系，Sprint 03 起；判据同第 3 节）

| 格号 | 场景 | 验证方式 | 判据要点 | 证据位置（填写） |
|---|---|---|---|---|
| S03-1 | 可读排队到达 | 现场 | 空闲 Codex 收到 Claude 消息：排队文本为 头行 `[Source: bridge message \| <时间>]` + 完整正文 + 独立 `[CTC-WAKE ...]` 标记行，线程历史可见、无截断无报错；hook 注入层含可执行回复入口且不重复注入正文 | PASS — I7 `b022e48b` / `02074f66`：Source 头行 + 完整正文 + 尾部 marker；reply 入口在注入层，正文不重复。见 Sprint 03 Review。 |
| S03-2 | 同轮双 hook 放行 | 现场 | 项目级+插件级双注册形态下同一条消息同轮被两个 handler 处理：第二个 handler 放行（`wake-same-turn-noop` 事件），模型正常运行不空结束（2026-09-14 事故为回归锚点） | PASS — I7 真实双 hook 形态：第二个 handler 同轮 `wake-same-turn-noop`，模型正常续跑。见 Sprint 03 Review。 |
| S03-3 | 跨轮重复抑制 | 现场 | 已消费消息在**新一轮**的重复唤醒仍被抑制（`wake-suppressed` 事件），正文不重复注入 | PASS — I7 `0f3bec2c` / `489c3905` / `02074f66` 在新 turn `wake-suppressed`，正文不重复注入。见 Sprint 03 Review。 |
| S03-4 | 忙碌多条堆叠 | 现场 | Codex 工作中两条 Claude 消息先后排队：当前调用完整不破坏，随后调用前逐条进入，排队行堆叠仍可读 | PASS — I7 `0f3bec2c` / `489c3905` 在 busy turn 排队，当前调用完整，随后逐条经 PostToolUse 进入。见 Sprint 03 Review。 |
| S03-5 | 在途旧格式兼容 | 现场 | 升级前遗留的单行 `[CTC-WAKE ...]` 唤醒仍可解析投递（fallback 全文匹配） | PASS with note — `053c2528` 旧单行 marker 兼容投递完整 frame；send-error / 手工恢复为测试偏差，非候选缺陷。见 Sprint 03 Review。 |

S03 系在安装候选上执行；S03-2 的双注册形态以宿主实际注册为准记录，不人为构造未声明的 hook。

## 5. 重复运行约定

「可重复执行」＝同一版本基线下**至少两次独立运行通过**：每次使用独立 runId、新会话（或 resume 后的原会话明确记录）、全新唯一标记，并记录自动选择的 root / source 或显式隔离覆盖。S05 系默认不设置 `CTC_BRIDGE_DIR`，用于验证 per-Codex 自动根；旧 T01–T05 / MT 系若需强制隔离，可显式设置 `CTC_BRIDGE_DIR`，但须记录该覆盖只用于隔离轮。端点失效走显式重配对，不做自动恢复。

## 6. 现场操作步骤（供 PO 协调）

1. 双方就位：一个 Codex 原始会话（threadId 记录在案）+ 至少一个 Claude 原始会话；按第 1 节完成前置检查。
2. 推荐路径：Codex 会话内执行 `sessions` 后用 `connect --name <唯一名称片段>` 建立配对；多目标重复连接不同 Claude。低层 `register` + `pair` 仅用于兼容 / 诊断场景，并必须记录手动路径。
3. 按矩阵逐格执行：发起方在**自己的原始会话内**运行 `send`（或对收到的消息 `reply --to <messageId>`），正文含该格标记；接收方按第 3 节判据核对会话事件后回应。
4. 每格结束立即把证据摘录落到约定 evidence 目录或 Sprint 协调记录；不得读取消息文件替代原始会话入站证据。
5. 矩阵完成后由 PO 签署判定；随后按第 5 节择期执行第二次独立运行。