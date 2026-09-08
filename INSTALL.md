# ClaudeToCodex 1.0.0 安装与使用（最短路径）

本文只覆盖从本发布物出发的最短可用路径。完整说明、排查与边界见包内 `bridge\docs\USAGE.md`。

## 前置条件

- Windows 10 及以上（已验证：Windows 10 Pro 19045）。
- 已安装 Node.js（已验证基线 v24.14.0；命令行可用 `node`）。
- 两个正在运行的原始会话：一个 Codex、一个 Claude Code。
- 一个**无现成 bridge 配置的目标项目**（项目内没有本产品的 hook）。

## 名词

- **产品目录**：本 ZIP 的解压位置，例如 `%LOCALAPPDATA%\ClaudeToCodex\app\claude-to-codex-1.0.0`（内含 `bridge\` 子目录，请保留该层级）。
- **数据目录**（`CTC_BRIDGE_DIR`）：消息与配对数据的存放位置，**两个会话必须使用同一个**。
- **目标项目**：你要在其中启用跨会话协作的项目。

## 步骤

1. **解压**：把 ZIP 解压到固定的产品目录（示例同上）。
2. **选定数据目录**：本例用 `%LOCALAPPDATA%\ClaudeToCodex\bridge-1.0.0`。它必须与其他正在使用的 bridge 数据目录（如默认目录）区分开。
3. **只在启动两个工作会话的终端里设置环境变量**（不要用 `setx` 全局设置，以免影响其他 bridge 会话）：

   ```powershell
   $env:CTC_BRIDGE_DIR = "$env:LOCALAPPDATA\ClaudeToCodex\bridge-1.0.0"
   ```

   然后从该终端分别启动（或重启）Codex 与 Claude Code 会话，使两侧会话及其 hook 继承同一数据目录。
4. **安装 hook**（在任一终端，指向目标项目）：

   ```powershell
   node "<产品目录>\bridge\cli.mjs" install --hooks-file "<目标项目>\.codex\hooks.json"
   ```

5. **信任与重载**（Codex 会话内，人工步骤）：运行 `/hooks`，审核并信任三条 bridge hook 定义；随后完全退出该 Codex 会话，用 `codex resume <threadId>` 重新加载。hook 定义变更会使旧信任失效，需要重新信任。
6. **确认 Claude 侧接收策略**：Claude Code 的 `crossSessionInbound` 默认把外来消息暂存等待批准；`accept` 为已验证配置。请由你自行确认或设置该策略——本产品不会代改，也不绕过批准机制。
7. **登记 Claude 端点**（在 Claude Code 会话内运行）：

   ```powershell
   node "<产品目录>\bridge\cli.mjs" register
   ```

   输出中的 `ENDPOINT_FILE` 即端点文件路径。
8. **配对**（任一侧，需 Codex 会话 ID 与端点文件路径）：

   ```powershell
   node "<产品目录>\bridge\cli.mjs" pair --codex <codexThreadId> --claude-endpoint <端点文件>
   ```

9. **发送与回复**：

   ```powershell
   node "<产品目录>\bridge\cli.mjs" send --body "..."
   node "<产品目录>\bridge\cli.mjs" reply --to <messageId> --body-file <UTF-8 文本文件>
   ```

   `status` 可查看当前配对、待收消息与事件记录。
10. **验收/核对接收**：以唯一标记（消息体内唯一字符串）+ 接收方原始会话中的事件记录判定送达；本地 `submitted:true` 只表示已尝试投递。

## 能力边界（沿用当前已声明）

Windows-only；单 Codex 与单 Claude 原始会话；短文本（trim 后 1..2000 字符）；串行投递；回执恒 `unverified`；发送失败不自动重试；会话重启或端点失效后不自动恢复，需按 `USAGE.md` §2 显式重配对（保留旧数据目录并时间戳归档，再 register + pair）；CLI 版本升级后的契约漂移未验证。
