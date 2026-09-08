# REG — 第二轮安装与配置实证（smoke-20260908-2）

| 项 | 值 |
|---|---|
| runId | smoke-20260908-2（第二次独立运行，验证「可重复」） |
| 日期 | 2026-09-08（09:53Z 起） |
| 代码基线 | main @ `b44d595`（含 PO 第一轮签署；产品入口不变 `D:\ClaudeToCodex\bridge\cli.mjs`） |
| 数据目录 | **隔离目录** `%LOCALAPPDATA%\ClaudeToCodex\bridge-smoke-run2`（`CTC_BRIDGE_DIR` 显式设置；与第一轮默认目录完全隔离） |
| Codex 原始会话 | threadId `01a07fa2-0695-7b52-8f65-d5782d95ab15`（SM 从设置了同一 `CTC_BRIDGE_DIR` 的终端 resume，hook 子进程继承同一数据根） |
| Claude 原始会话 | sessionId `3aaaafcc-2528-4347-8611-5253d3fcadfc`（**沿用第一轮同一原始会话**，PO 决策方案 A；身份连续性在此明确记录。隔离由数据目录与全新 pair/标记保证） |
| pairId | `c67635e5-0283-4e4b-acdd-e6dc99768b8f`（createdAt 2026-09-08T09:53:26.846Z，全新，独立于第一轮 `2b55d1ef`） |
| 端点文件 | `…\bridge-smoke-run2\endpoints\claude-3aaaafcc-….json`（重新登记，DPAPI 无明文） |
| 身份环境 | `CLAUDE_CODE_SESSION_ID`/`_MESSAGING_SOCKET`/`_MESSAGING_TOKEN` 齐备；`CODEX_THREAD_ID` 为空（无污染） |

## 与第一轮的独立性

- 独立 runId、全新唯一标记（`SMOKE-smoke-20260908-2-*`）、隔离数据目录（全新 pair/端点/消息存储，不读取第一轮任何状态）。
- 版本基线不变（codex 0.153.4 / claude 2.1.263，见 Sprint Backlog §3.6）。
- Codex 侧经 resume 后的原会话（threadId 一致，防分叉核对随证据记录）；Claude 侧为同会话明确记录（PO 拍板）。

## 过程事件：端点轮换与显式恢复（10:26Z 前后）

两轮之间本 Claude 会话的消息管道发生轮换（socket `\\.\pipe\LOCAL\cc-msg-ea05441b…` → `cc-msg-b438ec71…`），SM 向旧端点发送失败。处置：在本原始会话内重新 `register`（10:26Z，PO 经用户通道指示），端点文件刷新为新管道，sessionId 不变、pair `c67635e5` 未重建，通道一次恢复——即 USAGE §2「显式重登记」流程，无自动恢复介入。确认消息 `[R2-ENDPOINT-REFRESHED]`（`6f8394dd`）经桥送达。

## 判定

- 隔离目录下完成 register→pair→十格全程，与第一轮（默认目录、pair `2b55d1ef`）零状态共享：**通过**。
- 端点轮换按文档化显式流程处置并恢复，验证了边界声明中「端点随进程存活、失效走显式操作」的口径：**通过**（作为 REG 附带实证）。

_更新时间：2026-09-08 10:35Z_
