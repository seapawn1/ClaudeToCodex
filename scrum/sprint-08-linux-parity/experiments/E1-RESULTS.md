# E1 实验结论：Claude UDS 帧接受探测（Sprint 08 预研）

- 日期：2026-09-18。执行：Developer（探针进程为 Developer 会话的子进程，与目标会话无父子关系——跨会话调用者关系成立）。
- 环境：WSL2 Ubuntu（同机同 Linux 用户 dell）；Claude Code **2.1.275**（超出 Windows 历史验证基线 2.1.263/2.1.268——本实验同时关闭版本漂移风险）；Node v24.14.0（`~/.local/bin/node`）。
- 目标会话：scratch 会话 `e1target`（sessionId `809279b2-2a94-4a33-800c-6585fa45d44e`），tmux 宿主、项目根启动、身份环境清洗、内联 `--settings {"crossSessionInbound":"accept"}`；UDS `/run/user/1000/cc-socks/127380.sock`（0600）。
- 探针：`e1-probe.mjs`（本目录），读注册表记录 + `.key` peerToken，`net.connect` UDS，按 Windows 产品行为先发可选 auth 行、500ms 后发 `msgV=1 / type=user / priority=next / session_id` 消息帧。
- 证据：目标会话自身 jsonl（`~/.claude/projects/-home-dell-projects-ClaudeToCodex/809279b2-*.jsonl`）；节选副本 `e1-evidence-excerpt.jsonl`（18 行）。发送端输出不作为收信证据。

## 结果：四变体全部 PASS

| 变体 | 到达时目标状态 | auth 行 | 结果 | 关键证据 |
|---|---|---|---|---|
| A `E1A2` | 空闲 | 带（peerToken） | **PASS** | 05:51:03.533 入站 user 帧（官方跨会话包装"Another Claude session sent a message"）+ 目标回复确认正文一字未损 |
| B `E1B2` | 生成中（正在回复 A） | 不带 | **PASS** | 连接接受、无 auth 行也投递；当前生成完整结束后 05:51:40.004 进入（priority=next 语义） |
| C `E1C2` | 生成中（主动整理汇总） | 带 | **PASS** | 当前输出完成后进入并被目标计入汇总表 |
| D `E1D2` | 工具执行中（36s bash 长任务第 8 秒） | 带 | **PASS** | 工具未中断（日志 3s 节奏连续 2→7 行无缺口）；05:54:27.785 enqueue → 工具结束后 05:55:02.309 remove（`reason:"absorbed_mid_turn"`）→ 工具结果边界进入**同一回合**，目标同轮回应 |

## 对 HOW 的直接输入

1. **A 簇未知全部关闭**：Windows 帧集合（auth 行 + `msgV`/`priority=next`/`session_id`）在 Linux UDS 上原样可用；auth 行可选（与官方文档一致）；`priority=next` 三种到达状态（空闲/生成中/工具中）语义与 Windows 验证边界一致——工具中到达在**回合内**工具结果边界吸收（`absorbed_mid_turn`），模型可在同轮回应，符合 USAGE "正文在随后首次模型调用前进入上下文，原任务可以尚未完成"。
2. **投递路径是官方跨会话入站通道**：入站帧带标准包装与 peer 溯源；attachment 的 `origin` 记录 `verifiedPeerPid`（宿主以进程证据验证发送方，即使 `from:"unknown"`）——Linux 进程证据验证实测在工作。
3. **Codex→Claude 方向的 HOW 估时可收敛**：换传输（Node `net.connect({path})`）、保帧格式即可，实施级可估。
4. 剩余未知移交 E2/验收：安装候选内的完整 send 记录/错误路径对等、与 bridge pending/claim 生命周期集成后的行为。

## 附带发现（如实记录）

1. **会话自动改名导致名称撞车**：`-n ctc-e1-peer` 初名 1 秒后被自动展示名覆盖；且 Developer 自身会话因转录内容含探针字样被自动改名为 `e1target-cuddly-shannon`，使名称子串匹配出现双目标。已改用 sessionId 精确定位。**这是 PBI-12（目标辨识）风险场景的实测实例**：内容衍生的自动重命名可致名称歧义，Sprint 07 精化时应引用。
2. 本实验对"隔离"的实现为**会话级隔离**（具名 scratch 会话 + 默认 home + 独立 sessionId），未用 `CLAUDE_CONFIG_DIR`（其认证初始化未实测、需交互首启）。接收策略用内联 `--settings` 限定本会话，未改动用户级设置。此偏差已记录，供 SM 判定是否符合 E1 安排的隔离意图。
3. 目标会话对 typed 与 peer 消息可区分（其 thinking 明言 "no peer-message wrapper"），包装文本不影响辨识。

## 边界声明

- 本实验为原型层真实执行证据：证明传输与帧格式可行，**不构成安装候选验收**，不替代 PBI-16 的现场证据矩阵。
- 未测：`priority=now/later`（不在产品路径）、超长正文、并发多发送方、token 错误时的行为（auth 行可选，错误 token 未测——HOW 中 send 错误路径按既有对等原则处理）。
- 会话已 teardown（tmux 会话已结束）；jsonl 原件保留在 home 目录，节选副本入本目录。
