# PO 手动端到端剧本：一个 Codex 主持两个 Claude 讨论

- 日期：2026-09-13
- 目的：PO 亲自体验 ClaudeToCodex 1.2.0 候选的核心价值：一个 Codex 原始会话同时连接两个 Claude Code 原始会话，围绕一个真实决策主题完成两轮讨论，消息直接回流到 Codex，无需 PO 搬运。
- 候选：`claude-to-codex-plugin-1.2.0.zip`
- SHA256：`8b97803af295926409195703b05d7d10796bce80219fa606327eeb43dd98afa0`
- 隔离 `CODEX_HOME`：`C:\Users\DELL\AppData\Local\ClaudeToCodex\s05-host\codex-home`
- 日常环境：继续使用 ClaudeToCodex 1.1.0；本剧本不改日常插件和日常桥数据。
- 已由 PO 完成的准备：1.2.0 候选已装入隔离 home，三条 hooks 已由 PO 亲自信任。

## 1. 本剧本验证什么

### 主题场景

你作为 Product Owner，让一个隔离 Codex 担任 **1.2.0 发布评审协调人**，同时连接两个 Claude：

- `Buyer`：业务采购方，关注发布价值和用户收益；
- `Reviewer`：质量评审，关注验收证据和剩余风险。

流程：

1. Codex 分别听取两位的第一轮意见；
2. Codex 将双方观点互相转述；
3. 两位 Claude 各自给出第二轮最终建议；
4. Codex 汇总结论、共识、分歧和发布建议。

### 通过核心

- 一个 Codex 同时连接两个 Claude；
- Codex 按名称路由，不误投；
- 两轮 Claude→Codex 回复都作为完整 `Cross-session bridge message` 直接进入 Codex；
- 每轮回复后 pending 清空，下一轮不被阻塞；
- 全程不需要你复制消息；
- 全程不需要 Codex 读取 bridge 数据文件。

## 2. 本剧本不重复验证

以下边界已由 SM 在安装候选和真实验收中覆盖，本剧本不重复执行：

- resume 后自动复用 root；
- 错误 root 的确定性诊断；
- pending 单槽重叠保护；
- 重复 wake 抑制；
- retire 后其他 pair 不受影响；
- 默认 root 不改绑、不迁移。

本剧本专注于 PO 的核心使用体验。

## 3. 准备

### 3.1 关闭旧隔离窗口

关闭所有标题类似以下内容的旧窗口，避免误认会话：

```text
S05 isolated Codex 1.2.0
S05 isolated Codex 1.2.0 resumed
S05 isolated Codex 1.2.0 after overlap
S05 isolated Codex 1.2.0 wrong-root diagnosis
```

不要关闭当前日常 Codex 会话。

### 3.2 使用两个 PowerShell 窗口

- 窗口 A：启动两个 Claude Code；
- 窗口 B：启动隔离 Codex。

两个窗口都从下面目录操作：

```text
D:\ClaudeToCodex
```

## 4. 窗口 A：启动两个 Claude Code

执行：

```powershell
cd D:\ClaudeToCodex

Remove-Item Env:CODEX_THREAD_ID -ErrorAction SilentlyContinue
Remove-Item Env:CLAUDE_CODE_SESSION_ID -ErrorAction SilentlyContinue

claude --bg --name "S05-PO-E2E-BUYER"

claude --bg --name "S05-PO-E2E-REVIEWER"
```

成功标志：

- 两个 Claude 会话显示为 idle；
- 两个会话都运行在 `D:\ClaudeToCodex`；
- 不要在临时目录或无关项目启动。

## 5. 窗口 B：启动隔离 Codex

执行：

```powershell
cd D:\ClaudeToCodex

$env:CODEX_HOME = "C:\Users\DELL\AppData\Local\ClaudeToCodex\s05-host\codex-home"

Remove-Item Env:CTC_BRIDGE_DIR -ErrorAction SilentlyContinue
Remove-Item Env:CODEX_THREAD_ID -ErrorAction SilentlyContinue
Remove-Item Env:CLAUDE_CODE_SESSION_ID -ErrorAction SilentlyContinue

codex --profile glm
```

注意：

- 必须使用 `--profile glm`；
- 必须清除 `CTC_BRIDGE_DIR`；
- 不手写 threadId、pairId 或 bridge root 路径；
- 这是新开隔离 Codex 会话，无需 resume。

## 6. 在隔离 Codex 中粘贴的主提示词

复制下面整段到隔离 Codex 输入框：

```text
PO 手动端到端验收：你是 ClaudeToCodex 1.2.0 发布评审协调人。请使用已安装的 ClaudeToCodex 插件完成下面的真实讨论流程。

硬性要求：
1. 不设置 CTC_BRIDGE_DIR。
2. 不手写 threadId、pairId 或 bridge root 路径。
3. 不读取 bridge 目录里的消息文件。
4. 只有当 Claude 回复作为 Cross-session bridge message 完整进入本会话，才算收到；submitted:true 不算收到。
5. 两位 Claude 的意见必须互相独立收集，不能由你编造。
6. 不要使用 Start-Sleep、轮询、后台监视或反复执行 status 来等待消息；等待时直接结束当前回复，让 queue wake 和 hooks 在模型边界自动注入来信。

第一步：连接双方
1. 查看正在运行的 Claude sessions。
2. 连接唯一名称 S05-PO-E2E-BUYER。
3. 连接唯一名称 S05-PO-E2E-REVIEWER。
4. 运行 status，报告 root.path、root.source、root.codexThread，以及两个 pair 的 target 和 pending 状态。

第二步：第一轮独立意见
向 BUYER 发送：
“PO-MANUAL-BUYER-R1：你扮演业务采购方。基于 ClaudeToCodex 1.2.0 的产品目标，请判断是否建议发布。请给出 3 个价值理由、2 个主要风险、1 个必要条件，并用一句话给出最终倾向。请以 PO-MANUAL-BUYER-R1-END 结束。”

向 REVIEWER 发送：
“PO-MANUAL-REVIEWER-R1：你扮演质量评审。基于 ClaudeToCodex 1.2.0 的验收目标，请判断是否建议发布。请给出 3 项关键证据、2 个剩余风险、1 个必须复核的边界，并用一句话给出最终倾向。请以 PO-MANUAL-REVIEWER-R1-END 结束。”

等待两条第一轮回复直接进入本会话后，先简要记录双方核心观点，再继续第三步。

第三步：第二轮交叉回应
把 BUYER 第一轮的核心价值理由和风险整理成一段忠实摘要，发送给 REVIEWER，并附上：
“PO-MANUAL-REVIEWER-R2：这是业务采购方的第一轮观点摘要。请回应其价值判断和风险观，说明你的质量结论是否变化，并给出最终 release 建议。请以 PO-MANUAL-REVIEWER-R2-END 结束。”

把 REVIEWER 第一轮的关键证据和风险整理成一段忠实摘要，发送给 BUYER，并附上：
“PO-MANUAL-BUYER-R2：这是质量评审的第一轮观点摘要。请回应其证据要求和风险边界，说明你的业务结论是否变化，并给出最终 release 建议。请以 PO-MANUAL-BUYER-R2-END 结束。”

第四步：汇总结论
等待两条第二轮回复直接进入本会话后，输出：
1. BUYER 最终建议；
2. REVIEWER 最终建议；
3. 双方共识；
4. 双方分歧；
5. 你作为协调人的最终 release recommendation；
6. 再次运行 status，确认两个 pendingMessageId 都是 null，并报告当前 root.path 与 root.source。
```

## 7. PO 观察要点

你只需要关注这些现象，不需要执行额外排查命令。

### 7.1 连接阶段

应看到：

- Codex 找到两个唯一 Claude 名称；
- 两个 pair 均连接成功；
- `status.root.codexThread` 是当前隔离 Codex thread；
- `root.path` 是自动选择的 per-thread root，而不是默认 root；
- 没有手写 `CTC_BRIDGE_DIR`。

### 7.2 第一轮

应看到：

- BUYER 的完整回复进入 Codex；
- REVIEWER 的完整回复进入 Codex；
- 两条回复都带有 `Cross-session bridge message`；
- Codex 能引用双方观点；
- pending 不积压。

### 7.3 第二轮

应看到：

- BUYER 收到 REVIEWER 观点摘要后回复；
- REVIEWER 收到 BUYER 观点摘要后回复；
- 两条第二轮回复再次直接进入 Codex；
- 同一 pair 首条回复后仍能继续第二轮通信；
- 最终两个 `pendingMessageId` 均为 `null`。

### 7.4 业务结论

Codex 的汇总必须来自四条直接回复：

```text
BUYER R1
REVIEWER R1
BUYER R2
REVIEWER R2
```

不应来自猜测，也不应要求你代为复制内容。

## 8. 通过判定

满足以下全部条件时，你可以判定本次 PO 手动端到端通过：

| 检查点 | 通过标准 | 实际观察 |
|---|---|---|
| 启动目录 | 两个 Claude 都在 `D:\ClaudeToCodex` 启动 |  |
| Codex profile | 使用 `--profile glm` |  |
| 自动 root | 未手写 `CTC_BRIDGE_DIR` / threadId / root |  |
| 双目标 | 一个 Codex 连接 BUYER 和 REVIEWER 两个 Claude |  |
| 第一轮直收 | 两条完整回复直接进入 Codex |  |
| 第二轮直收 | 两条完整回复再次直接进入 Codex |  |
| 连续通信 | 同一 pair 两轮均可用，pending 清空 |  |
| 讨论质量 | Codex 能汇总结论、共识、分歧和 release 建议 |  |
| 无旁路 | 无消息文件读取，无人工搬运 |  |

## 9. 失败判定

出现以下任一情况，本次验收不通过：

1. 只看到裸 `[CTC-WAKE ...]`，没有完整正文；
2. Codex 只有 `submitted:true`，但没有收到 Claude 正文；
3. pending 长期不是 null；
4. 第二轮被第一轮 pending 阻塞；
5. 消息串目标；
6. Codex 需要读取 bridge JSON 才能获得内容；
7. 你需要手工复制 Claude 回复给 Codex；
8. Codex 无法基于四条直接回复形成可信汇总。

如果失败，请保留：

- 隔离 Codex 屏幕上的原文；
- 时间点；
- Codex 报告的 status 输出；
- 两个 Claude 会话名称。

不要清理隔离 home 或 bridge 数据目录。

## 10. 常见现象：Blocked by hook / already supplied

如果看到：

```text
Blocked by hook
This bridge message was already supplied to the conversation.
```

含义：

- 这个 wake 指向的消息此前已经进入过 Codex 模型上下文；
- 这是重复 wake 的防重注入保护；
- 它不是新回复失败，也不是需要重发的信号；
- Codex 前端可能不渲染原始 bridge payload，所以你看不到第一次注入的全文。

此时不要重发原问题，不要使用 `Start-Sleep`，不要读取 bridge 文件。可在隔离 Codex 中输入：

```text
纠偏：刚才的 “already supplied” 是重复 wake 抑制。不要重发消息，不要 Sleep，不要读取 bridge 文件。请在当前上下文中查找最近一条来自 BUYER / REVIEWER 的 Cross-session bridge message，并原文输出 messageId 与 body。如果找不到，运行一次 status，报告对应 pendingMessageId、pendingClaimed 和 pendingNote；若 pending 为空且确实没有新正文，再用新的唯一标记发送一次追问，然后立即结束回合等待 hook 注入。
```

判定：

- 能原文输出对应 body：该消息已官方入站，继续验收；
- 不能输出 body 且 pending 为空：该重复 wake 可能指向旧消息，用新唯一标记重试一次；
- pending 非空并持续不动：按失败处理，保留 status 输出和时间点。

## 11. 完成后记录

在下面填写你的结论：

```text
PO 手动端到端结论：通过 / 不通过

观察摘要：

主要顾虑：

是否接受 1.2.0 候选进入 Sprint Review：
```