# REG — 安装与配置实证（smoke-20260908-1）

| 项 | 值 |
|---|---|
| runId | smoke-20260908-1 |
| 日期 | 2026-09-08 |
| 代码基线 | main @ `fa170bb`（bridge 产品入口 `D:\ClaudeToCodex\bridge\cli.mjs`） |
| 平台/版本 | Windows 10 Pro 10.0.19045；codex-cli 0.153.4；claude 2.1.263；Node v24.14.0；PowerShell 5.1（Sprint Backlog §3.6 基线，无漂移） |
| 数据目录 | 默认 `%LOCALAPPDATA%\ClaudeToCodex\bridge`（本轮未设 `CTC_BRIDGE_DIR`） |
| Codex 原始会话 | threadId `01a07fa2-0695-7b52-8f65-d5782d95ab15`（PO 提供，resume 后核对一致） |
| Claude 原始会话 | sessionId `3aaaafcc-2528-4347-8611-5253d3fcadfc`（Developer 当前会话；端点 socket `\\.\pipe\LOCAL\cc-msg-ea05441b3b3e659493336ef3dc1a31f2`） |
| pairId | `2b55d1ef-3e3a-42f0-ae55-1d3c8f02bb1b`（createdAt 2026-09-08T09:14:28Z） |
| 端点文件 | `C:\Users\DELL\AppData\Local\ClaudeToCodex\bridge\endpoints\claude-3aaaafcc-2528-4347-8611-5253d3fcadfc.json`（DPAPI，无明文 token） |

## 安装与人工步骤记录（PO 确认）

1. `node bridge/cli.mjs install` 已在主检出执行，`.codex/hooks.json` 三条注册指向 `D:\ClaudeToCodex\bridge\cli.mjs hook`（PO 确认）。
2. PO 已在 Codex 会话 `/hooks` 人工审阅并信任三条 bridge 定义。
3. Codex 原始会话已完全退出后 `codex resume`，threadId 核对一致（PO 确认，见上表）。
4. `crossSessionInbound` 保持用户级 `accept`（入站消息直入，无人工批准步骤）。
5. register（本会话内）：输出 `REGISTERED_CLAUDE_SESSION=3aaaafcc-…`，无明文 token。
6. 身份环境检查：`CLAUDE_CODE_SESSION_ID`/`_MESSAGING_SOCKET`/`_MESSAGING_TOKEN` 齐备，`CODEX_THREAD_ID` 为空（无污染）。

## 判定

- 干净数据目录（首次使用默认目录，无历史 pair/pointer）下完成 install→信任→resume→register→pair 全程：**通过**。
- 全程未引用 IDEO 历史路径（安装产物与端点均位于产品位置；CLI 输出无历史路径）。

_过程辅助记录：`%LOCALAPPDATA%\ClaudeToCodex\bridge\events.jsonl`（paired 事件 2026-09-08T09:14:28Z）；不单独构成通过证据，判定以双方会话事件为准（见 MATRIX.md 各格）。_
