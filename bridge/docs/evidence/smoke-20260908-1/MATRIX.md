# 判定矩阵 — smoke-20260908-1

**第一轮结果：10/10 通过（2026-09-08 09:14–09:32Z）。待 PO 检视签署。**

证据规则见 [SMOKE.md](../../SMOKE.md) §3：通过只认接收方原始会话事件记录时序 + 唯一标记；发送方输出/写入成功/本地 JSON/模型自述单独不构成通过。

**过程附注（产品行为的现场实证，非单独通过证据）**：
1. 单待收槽拒绝：T02XC 确认后 1 秒内连发 T05 首问被拒（`Codex already has a pending message`），无自动重试、指向 status 对账——与 USAGE §4 一致；等待消费后重发成功。
2. 防重复唤醒：T04CX 消息旧唤醒于 09:25:20.198Z 重放，被消费记录抑制（events.jsonl `wake-suppressed`）。
3. 本轮全部经由产品入口（`D:\ClaudeToCodex\bridge\cli.mjs`）完成，未引用任何历史原型路径。

会话身份与安装实证见 [REG.md](REG.md)。

| 格 | 标记 | messageId / conversationId | 接收方会话事件证据 | 判定 |
|---|---|---|---|---|
| T01CX 首次联系（Claude→Codex） | `SMOKE-smoke-20260908-1-T01CX-85ecfc07` | send `aa4905b8-5ed5-4b0d-87a4-b9db90381750`；reply `e3ee15cd-5403-4338-af6a-c855cf3bbc6a`；conv `543790ce-a18c-4e47-9629-12692532c5db` | **Codex 侧**：rollout `rollout-2026-09-08T14-08-40-01a07fa2-….jsonl` L891（09:15:26.115Z，正文+标记作为输入进入原会话）→ L894 SM 执行回信命令 → L900（09:15:46.318Z）SM 输出"收到标记：SMOKE-smoke…T01CX 已按剧本回复完成"。**Claude 侧**：本会话 transcript `D--ClaudeToCodex--claude-worktrees-sprint1-dev-plan\3aaaafcc-….jsonl` L1319（09:15:37.140Z，回复全文+标记以跨会话消息进入原始会话上下文，距 SM 创建 1.1s）。往返同 conversationId。 | **通过** |
| T02CX 空闲收信（Claude→Codex） | `SMOKE-smoke-20260908-1-T02CX-a60f4224` | send `48d5723e-3074-4ccd-868a-e43bde7bc171`；reply `6c8d7a63-492b-4552-ba7b-b5446ff643bd`；conv `2ec47f56-fb8d-49fb-814a-a8d2cd52436f` | rollout ord 904（09:17:15.781Z `turn_context`：空闲会话由 queue 唤醒开启新回合）→ ord 907 正文+标记注入 → SM 执行回信；其回复 09:17:27.7Z 进入我的原始会话（现场观察 + 本会话 transcript）。 | **通过** |
| T01XC 首次联系（Codex→Claude） | `SMOKE-smoke-20260908-1-T01XC-6f2c81a0` | SM send `e9be6de7-dd64-4a80-8c74-49110f6d96f9`；我 reply `3e0ded02-214b-429f-bd4a-76356fa0c260`；SM 再确认 `27421fe6-ba0b-4ea1-9ed5-0f5d83036ae4`；conv `10081dfe-b470-4ea6-8989-bce9a19f90a4` | SM 消息 09:17:28.917Z 进入我的原始会话（现场观察，工作期间边界送达）；我的回复进入 SM 原会话（rollout ord 924 唤醒帧 + ord 926 正文注入，09:19:26.2Z）；SM 确认 `27421fe6` 09:19:56.9Z 回到我的会话（现场观察）。三方消息同一 conversationId。 | **通过** |
| T02XC 空闲收信（Codex→Claude） | `SMOKE-smoke-20260908-1-T02XC-9d4c2a77` | SM send `40c5c49a-6906-4072-995e-53704e9d7c46`；我确认 `3d1d7123-3693-4f96-bdbe-2a2de5e00563`；conv `1805733b-6c1a-43a9-ae33-d2c3f856f6c8` | SM 创建 09:29:07.587Z；我方上一回合已于约 09:28 结束（会话空闲），**本回合由该消息唤醒开启**（第一手事实；本会话 transcript 中该消息为回合起点事件）。我的确认回复触发了一次单待收槽拒绝（见附注），SM 消费后正常处理。 | **通过** |
| T03CX 生成中收信（Claude→Codex） | `SMOKE-smoke-20260908-1-T03CX-cff36419` | send `86694817-3d77-4180-aa17-9c1c5e0423aa`；reply `6716491e-3417-47c6-af19-07816d559915`；conv `38d8637e-24e4-4456-8c19-4c7417d406d2` | 我方 published 09:22:46.033/wake 09:22:48.093；rollout ord 963（09:22:46.285）显示 SM 推理流仍在生成中（发送确在生成期间）；长文本 ord 965（09:24:08.556）**完整结束无截断**（约 82 秒）；消息于 ord 975（09:24:54.744）在生成后首个上下文边界注入（events.jsonl：hook=PostToolUse，SM 在长文本后按协调先执行了工具）；SM 回复 09:25:03.2Z 进入我的会话。 | **通过**（注入边界为生成后工具的 PostToolUse 变体，语义符合"当前输出完整结束后于下一次模型调用前进入"） |
| T03XC 生成中收信（Codex→Claude） | `SMOKE-smoke-20260908-1-T03XC-2a9f5b31` | SM send `40639687-f441-4e6d-9b20-1b53ba1e2a89`；我确认 `727793b9-0d0e-488f-96a6-8074c8f5d78c`；conv `a744ac14-6932-46ac-8a50-d3bc832b27c6` | SM 创建 09:30:22.515Z（我方长文本输出尾部、60 秒工具开启前 0.5 秒）；我的长输出与随后 60 秒工具（09:30:23→09:31:23）**均完整结束无截断**，消息于工具结果边界进入下一次上下文（第一手观察；本会话 transcript 记录送达点）。priority=next 语义成立。 | **通过** |
| T04CX 工具边界收信（Claude→Codex） | `SMOKE-smoke-20260908-1-T04CX-49aa7a3e` | send `73a973ea-a57f-4be6-9880-ccef1865df98`；reply `3b78e968-8e18-4ba3-b2bc-7fd1802de2ab`；conv `2e6d6198-552a-4419-834a-ecf46c561b7f` | 我方 published 09:24:55.315、wake 09:24:57.092；SM 的 reply 工具执行 09:25:02.9→09:25:04.2 期间消息全程待收；工具完整结束后、下次模型调用前注入（rollout ord 983 09:25:04.509；events.jsonl：hook=PostToolUse, toolUseId=call_02c6894…）；SM 回复 09:25:10.3Z 进入我的会话。**附注**：我方触发检测误匹配 ack 文本，但 events.jsonl 时间戳证明发送（09:24:55）恰落在工具执行窗口前的待收区间，判定以时间线为准。另：09:25:20 events.jsonl 记录该消息旧唤醒重放被 **wake-suppressed**——防重复唤醒机制的现场实证。 | **通过** |
| T04XC 工具边界收信（Codex→Claude） | `SMOKE-smoke-20260908-1-T04XC-65c1d84e` | SM send `61126df2-1a01-4c2e-a148-ee4223bbe8bc`；我确认 `cf41304b-9287-4819-a376-095f927e048e`；conv `453134db-2e0f-4831-a035-174b98ce153c` | SM 创建 09:31:31.723Z，恰在我一条正在执行的命令（发送+轮询等待）期间；该命令**完整结束、未被中断**，消息附于其结果边界进入下一次上下文（第一手观察；transcript 记录）。 | **通过** |
| T05 连续往返（双向） | `SMOKE-smoke-20260908-1-T05-0551d9c2` | Q1 `7d425282-18a1-4f2d-af58-ac8c7d88e090`（我）→ A1 `b3fda667-49c9-432b-ae9b-231b968d1977`（SM，09:30:21.446Z）→ Q2 `9fc4417c-1483-49b6-9e51-657416db767c`（我）→ A2 `a4056fb2-ada7-4987-92eb-42fb0bdb7d4a`（SM，09:32:16.561Z）；conv `70560ad8-25fb-4f6b-8292-c1dec66977c0` | 请求、回复、追问、再答四步全部发生在同一对原始会话之间，同一 conversationId 贯穿（双方 events.jsonl 与 messages/ 存储可交叉核对）；A1/A2 均在我方工作期间边界送达并触发后续步骤。收官确认 `6945d23e`。 | **通过** |
| REG 安装与配置实证 | — | pair `2b55d1ef-3e3a-42f0-ae55-1d3c8f02bb1b` | 见 [REG.md](REG.md)：干净默认数据目录完成 install→信任→resume→register→pair→首次通信，全程无历史路径 | **通过** |

## PO 检视与签署（第一轮）

- 十格判定与证据摘录：_待 PO 检视_
- 结论：_待签署（日期 / 签署人）_

_更新时间：2026-09-08 09:33Z（Developer 维护）_
