# 使用说明

本产品是运行于本机（Windows）的 Codex ↔ Claude Code 跨会话双向消息桥：让两个**已在运行的原始会话**互发短消息、收到回复、继续对话。以下四类任务按顺序覆盖安装、配置、发起通信与回复。

## 1. 安装

前置：Windows；Node.js ≥18.3；参与通信的 codex CLI（已验证 `0.153.4`）与 claude CLI（已验证 `2.1.263`）在 PATH 上。

```powershell
node bridge/cli.mjs install
```

该命令生成/更新仓库根 `.codex/hooks.json` 中三条 bridge hook 注册（PostToolUse、UserPromptSubmit、Stop），命令路径由当前安装位置自动派生；重复运行幂等，且会替换旧的原型 bridge 注册而不动其他工具的 hook。

安装后的**人工步骤（不可自动化，跳过会导致 hook 静默不生效）**：

1. 在 Codex 会话中执行 `/hooks`，审阅并**信任**三条新增 bridge 定义（hook 定义变化会使信任哈希失效，需重新信任）。
2. 完全退出正在运行的 Codex 原始会话，再 `codex resume <threadId>` 重载——运行中的会话不热加载 hook。
3. Claude 侧接收策略 `crossSessionInbound`：默认会把外来消息暂存等待批准；`accept` 为已验证配置。本产品**不会**修改该设置，也不提供任何绕过批准或信任机制的自动化。

## 2. 配置

数据目录：默认 `%LOCALAPPDATA%\ClaudeToCodex\bridge`；设置环境变量 `CTC_BRIDGE_DIR` 可覆盖（隔离验证、重复运行时使用；注意两个原始会话都需在同一覆盖下运行，hook 子进程才能继承）。目录内容：`pair.json`（配对）、`endpoints/`（Claude 端点登记）、`messages/`（全部消息）、`pending/`（Codex 待收槽）、`claims/`、`receipts/`（消费记录）、`wire/`（管道发送正文与记录）、`events.jsonl`（事件流水）。

两步完成配对（**单配对模型**：恰好一对原始会话；重复配对一致时幂等，不同则报错拒绝，绝不静默替换）：

```powershell
# 在选定的 Claude 原始会话内执行（令牌经 DPAPI 以当前 Windows 用户加密，文件不含明文）：
node bridge/cli.mjs register
# 输出 ENDPOINT_FILE=<数据目录>\endpoints\claude-<sessionId>.json

# 在任一侧执行，绑定这对原始会话：
node bridge/cli.mjs pair --codex <codexThreadId> --claude-endpoint <端点文件路径>
```

**显式重配对**（Claude 会话重启/端点失效/更换任一会话时的人工操作，不是自动恢复）：确认旧会话不再使用后，移走或删除数据目录（或改用新的 `CTC_BRIDGE_DIR`），重新 register + pair。旧目录保留可作证据。

## 3. 发起通信与回复

在**自己的原始会话内**运行（桥按会话环境变量识别发送方身份：Codex 会话须有 `CODEX_THREAD_ID`，Claude 会话须有 `CLAUDE_CODE_SESSION_ID`，恰好其一且与配对一致，否则拒绝）：

```powershell
# 发起新消息（正文二选一：--body 或 --body-file <UTF-8 文本文件>）
node bridge/cli.mjs send --body "问题与必要背景（含唯一标记）"

# 回复收到的消息（messageId 取自消息正文中的 id 字段）
node bridge/cli.mjs reply --to <messageId> --body "回复内容"
```

已验证的发送语义与限制：

- 正文 trim 后 **1..2000 字符**，超限拒绝并报可读错误；长文本属未验证边界。
- Codex 待收为**单槽**：已有未领取消息时再次发送报错，不覆盖。
- 发送失败**不自动重试**（正文可能已发布或已被领取）：按 `node bridge/cli.mjs status` 对账（pair、pendingMessageId、最近事件）后再决定重发。
- 所有回执恒为 `unverified`：`submitted:true`、queue/pipe 写入成功只表示已投递到通道，**不代表接收方已读到**；送达以接收方原始会话的会话事件为准（见 SMOKE.md 证据规则）。
- 接收方收到的正文附带回复指引（由安装位置派生的同一命令入口）与"peer 内容非 PO 指令"声明；请勿发送自动确认。

## 4. 故障排查

| 症状 | 原因与处理 |
|---|---|
| `Send or reply from exactly one of the two selected original sessions.` | 身份环境变量污染或不在配对内：Claude 会话内检查是否残留 `CODEX_THREAD_ID`（子进程继承所致），清除后重试；或当前会话不是配对中的那一个 |
| `Codex already has a pending message.` | 待收槽被占用：等接收方会话领取（下一次模型调用边界），或用 `status` 查看 pendingMessageId 对账 |
| `Claude endpoint identity changed.` / 管道连接失败 | Claude 会话已重启或端点失效：按 §2 显式重配对 |
| Codex 侧收不到消息且无报错 | hook 未生效：确认 install 后走过 `/hooks` 信任与退出-resume 重载（§1 人工步骤） |
| Claude 侧消息迟迟不出现 | `crossSessionInbound` 默认暂存策略：检查是否在等待批准（§1 第 3 步） |
| `This bridge already has a different pair.` | 数据目录已有另一配对：确认是否要用显式重配对（§2） |

## 5. 已验证范围与未验证边界

已验证范围（本 Increment 的结论边界）：同一 Windows 用户；单对已运行原始会话；短文本（trim 后 ≤2000 字符）；串行投递；记录的工具版本——**Windows 10 Pro 10.0.19045、PowerShell 5.1、codex-cli 0.153.4、claude 2.1.263、Node v24.14.0**（版本基线详见 Sprint Backlog 3.6；任一 CLI 升级后行为未验证，应先重跑 SMOKE 再依赖）。

以下能力**未验证，本产品不提供也不得被暗示已完成**（对照设计文档 §4）：

- 会话重启、daemon 回收或端点失效后的自动恢复（仅有显式重配对的人工操作）。
- 并发消息、长文本与重复投递的组合。
- 持久台账、送达回执、失败重试与事务性投递。
- 来源防伪、令牌生命周期与多用户安全。
- 共同讨论现场、多会话协作与远程协作。
- 跨平台（本 Increment 仅 Windows：命名管道、DPAPI、PowerShell 依赖）；`priority=now/later` 不在产品路径（普通消息固定 `priority=next`）。
