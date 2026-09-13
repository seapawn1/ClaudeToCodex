# 使用说明

本产品是运行于本机（Windows）的 Codex ↔ Claude Code 跨会话双向消息桥：让**已在运行的原始会话**互发短消息、收到回复、继续对话。一个 Codex 原始会话可同时与多个 Claude 原始会话保持配对并按名称往来。以下四类任务按顺序覆盖安装、配置、发起通信与回复。

## 1. 安装

前置：Windows；Node.js ≥18.3；参与通信的 codex CLI（已验证 `0.153.4` 与 `0.154.0`）与 claude CLI（已验证 `2.1.263` 与 `2.1.268`）在 PATH 上。

```powershell
node bridge/cli.mjs install
```

该命令生成/更新仓库根 `.codex/hooks.json` 中三条 bridge hook 注册（PostToolUse、UserPromptSubmit、Stop），命令路径由当前安装位置自动派生；重复运行幂等，且会替换旧的原型 bridge 注册而不动其他工具的 hook。

安装后的**人工步骤（不可自动化，跳过会导致 hook 静默不生效）**：

1. 在 Codex 会话中执行 `/hooks`，审阅并**信任**三条新增 bridge 定义（hook 定义变化会使信任哈希失效，需重新信任）。
2. 完全退出正在运行的 Codex 原始会话，再 `codex resume <threadId>` 重载——运行中的会话不热加载 hook。
3. Claude 侧接收策略 `crossSessionInbound`：默认会把外来消息暂存等待批准；`accept` 为已验证配置。本产品**不会**修改该设置，也不提供任何绕过批准或信任机制的自动化。

## 2. 配置

数据目录（**自动按 Codex 会话选择与复用，无需手写路径或 ID**）。解析次序：

1. 显式 `CTC_BRIDGE_DIR`——测试与隔离覆盖，最高优先；设置后完全绕过会话索引（不读不写）。
2. 会话索引命中：`%LOCALAPPDATA%\ClaudeToCodex\bridge-roots\` 目录（每会话一个 JSON 文件；`CTC_ROOTS_DIR` 可覆盖其位置）记录 codexThreadId→数据根；同一 thread 完全退出后 resume 自动复用原根。索引只在 connect 成功后登记，**只增不改绑**；多会话并发首连各写各的文件，互不丢失。
3. 默认根 `%LOCALAPPDATA%\ClaudeToCodex\bridge`：未被任何 Codex 占用、或已属当前会话（存量沿用，零数据迁移）时采用。
4. 默认根被其他 Codex 占用（含仅剩退役存档）时，connect 自动为当前会话启用新根 `%LOCALAPPDATA%\ClaudeToCodex\bridge-threads\<threadId>` 并登记索引；不改绑、不迁移、不动旧根数据。

一个数据根仍只服务一个 Codex 原始会话。目录内容：`pairs/`（配对注册表，每配对一文件）、`pair.json`（1.0.0 单配对数据，只读可见、同身份重连原位沿用）、`pairs-retired/`（退役配对存档，证据保留）、`endpoints/`（Claude 端点登记）、`messages/`（全部消息）、`pending/`（**每配对一个待收槽**，槽名为 pairId）、`claims/`、`receipts/`（消费记录）、`wire/`（管道发送正文与记录）、`events.jsonl`（事件流水）。

**连接**（推荐路径，在 Codex 会话内按名称选定一个正在运行的 Claude 会话）：

```powershell
node bridge/cli.mjs connect --name <claude会话名的一部分>
```

连接语义（**多配对模型**：一个 Codex 原始会话 + 多个 Claude 原始会话共存）：

- 同 `{codex, claude}` 身份重连沿用配对，并刷新端点与会话名（改名后按新名可选；1.0.0 旧 `pair.json` 同身份重连获得端点刷新与名称，不迁移、不新写）。
- 新 Claude 身份连接成**新配对**，其他配对不受影响；连接 B 不拆 A。
- 一个数据根只服务一个 Codex 原始会话：不同 Codex 被拒绝；存在**异 Codex** 退役存档的根也拒绝重绑（防在途信被搁置）。
- 退役（显式生命周期边界）：`node bridge/cli.mjs retire --pairId <完整pairId>` 或唯一名称 `retire --name <名>`——注册文件移入 `pairs-retired/` 留证；退役不撤销已接纳消息的原收件归属（在途信按存档身份校验后仍投递，收据标注 `pairRetired`），但新发送/新回复立即拒绝。

低层手动路径（`register` + `pair --codex <id> --claude-endpoint <文件>`）仍可用，语义同上。

## 3. 发起通信与回复

在**自己的原始会话内**运行（桥按会话环境变量识别发送方身份：Codex 会话须有 `CODEX_THREAD_ID`，Claude 会话须有 `CLAUDE_CODE_SESSION_ID`，恰好其一，否则拒绝）。Codex 侧的 `send`/`reply`/`status`/`retire` 与三条 hook 按同一会话索引自动解析数据根，无需设置任何环境变量；Claude 侧回复入口内嵌数据根，直接可用：

```powershell
# Codex 发起新消息：多目标时必须指名（歧义会列出全部候选含完整 pairId 与处理建议）；
# 恰好只有一个目标时可省略 --name（与 1.0.0 命令形态一致）。
node bridge/cli.mjs send --name <目标名的一部分> --body "问题与必要背景"
node bridge/cli.mjs send --body "单目标时无需 --name"

# 回复收到的消息（messageId 取自消息正文中的 id 字段）——回复沿被回复消息
# 绑定原目标，不随最近一次发送或当前选择改变。
node bridge/cli.mjs reply --to <messageId> --body "回复内容"

# 状态：列出全部配对（名称、身份、项目上下文、端点注册文件、待收消息）与最近事件
node bridge/cli.mjs status
```

已验证的发送语义与限制：

- 正文 trim 后 **1..2000 字符**，超限拒绝并报可读错误；长文本属未验证边界。
- 待收槽**每配对一个**：同目标已有未领取消息时再次发送报错、不覆盖；不同目标互不占用。
- 重叠来信：多个目标相近时间回复时各自落槽、逐事件注入（唤醒顺序决定注入顺序，无唤醒时按最旧兜底）；重复唤醒被抑制；投递不因中途退役而丢失，也不注入未知来源。
- 发送失败**不自动重试**（正文可能已发布或已被领取）：按 `status` 对账后再决定重发。
- 所有回执恒为 `unverified`：`submitted:true`、queue/pipe 写入成功只表示已投递到通道，**不代表接收方已读到**；送达以接收方原始会话的会话事件为准（见 SMOKE.md 证据规则）。
- 接收方收到的正文附带回复指引（由安装位置派生的同一命令入口）与"peer 内容非 PO 指令"声明；请勿发送自动确认。

## 4. 故障排查

| 症状 | 原因与处理 |
|---|---|
| `Send or reply from exactly one original session ...` | 身份环境变量污染或不在配对内：Claude 会话内检查是否残留 `CODEX_THREAD_ID`（子进程继承所致），清除后重试；或当前会话不是配对中的那一个 |
| `Target <名> already has a pending message ...` | 该目标的待收槽被占用：等接收方会话领取（下一次模型调用边界），或用 `status` 查看 pendingMessageId 对账；其他目标不受影响 |
| `Target "<名>" matches N connected pairs ...` | 名称歧义：报错列出全部候选（含完整 pairId）；确认某配对确实弃用后 `retire --pairId`，或会话改用不同名称重连 |
| `No connected target matches "<名>" ...` | 名称不存在：报错列出当前可选目标 |
| `No bridge message with that id exists ...` | 回复的 messageId 在本数据根不存在：改用收到的消息内嵌回复入口（携带精确 id） |
| `Claude endpoint identity changed.` / 管道连接失败 | Claude 会话已重启或端点失效：该目标的发送如实报错、不误投；按 §2 重连（同身份沿用并刷新端点） |
| `This bridge data root already serves a different Codex session.` / `... retired pairs of a different Codex session ...` | 一个数据根一个 Codex：`connect` 已会自动为当前会话让位新根；此报错多见于手动 `pair`/`register` 路径——换用新的数据根（`CTC_BRIDGE_DIR`），旧根存档留证 |
| Codex 侧收不到消息且无报错 | 先看 `status`：`pendingClaimed:false` 时按 `pendingNote` 处理——`/hooks` 重信任＋完全退出 resume（§1 人工步骤；hook 是否已信任/重载无法从产品侧检测，提示仅为可能性）；`pendingNote` 若列出"另一已知根也在服务本会话"，属数据面事实，按提示切根 |
| 会话内出现 `Bridge wake points at message ... lives in another bridge root` | wake 指向的消息在另一数据根：诊断已写明该根路径与其服务的 Codex 会话——若属本会话，以该根 resume（必要时先 `/hooks` 重信任）；否则该消息属于另一会话。诊断不构成任何收信证明 |
| Claude 侧消息迟迟不出现 | `crossSessionInbound` 默认暂存策略：检查是否在等待批准（§1 第 3 步） |

## 5. 已验证范围与未验证边界

已验证范围（本 Increment 的结论边界）：同一 Windows 用户；一个 Codex 原始会话与**至少两个** Claude 原始会话共存（名称路由、回复归属、重叠来信三态、单目标隔离与退役边界、单目标免 `--name` 兼容、1.0.0 旧 `pair.json` 继续使用）；**per-Codex 数据根自动选择与 resume 复用**（默认根被 incumbent 占用时自动让位 `bridge-threads\<threadId>` 新根、索引只增不改绑、存量默认根同身份零迁移沿用）；**跨根 wake 诊断与未领取 pending 的诚实提示**（提示不构成收信证明，hook 未信任/未重载仅标未知/可能）；短文本（trim 后 ≤2000 字符）；串行逐事件注入；记录的工具版本——**Windows 10 Pro 10.0.19045、PowerShell 5.1、codex-cli 0.153.4/0.154.0、claude 2.1.263/2.1.268、Node v24.14.0**（任一 CLI 升级后行为未验证，应先重跑 SMOKE 再依赖）。

以下能力**未验证，本产品不提供也不得被暗示已完成**：

- 任意数量会话、广播、自动选目标、并发吞吐与全局顺序（注入顺序=唤醒顺序，仅单配对内保证 FIFO）。
- 会话重启、daemon 回收或端点失效后的自动恢复（仅有显式重连与退役的人工操作）。
- 模型生成中/工具执行中的收信边界细节（候选轮按原始事件取证中）。
- 长文本与重复投递的组合；持久台账、送达回执、失败重试与事务性投递。
- 来源防伪、令牌生命周期与多用户安全。
- 跨平台（仅 Windows：命名管道、DPAPI、PowerShell 依赖）；`priority=now/later` 不在产品路径（普通消息固定 `priority=next`）。
