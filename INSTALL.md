# ClaudeToCodex 1.0.0 安装与使用（Codex CLI 插件）

首用主路径只需四步：**安装插件 → 必要授权 → 向 Codex 指定 Claude 会话 → 交流**。无需手动登记端点、复制会话 ID、执行桥命令或配置数据目录；Claude 侧无需安装任何东西。

## 前置条件

- Windows 10 及以上（已验证：Windows 10 Pro 19045）。
- Node.js（已验证基线 v24.14.0）。
- Codex CLI ≥ 0.117.0（已验证：0.153.4），终端可用 `codex`。
- 一个正在运行的 Claude Code 会话（知道它的名字即可）。

## 1. 安装插件

```powershell
codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref <候选分支或版本ref>
codex plugin add claudetocodex@claudetocodex-dev
```

> 正式发布后 ref 固定为 `v1.0.0` tag / main；验收阶段使用候选分支 ref。

## 2. 必要授权（人工步骤，产品不代改）

- 在 Codex 会话中运行 `/hooks`，审核并信任三条 `claudetocodex` bridge hook（插件 hook 属非托管，需人工信任）。
- 完全退出该 Codex 会话后 `codex resume <threadId>` 重载（hook 不热加载）。
- Claude 侧接收策略：`crossSessionInbound` 默认将外来消息暂存等待批准；`accept` 为已验证配置，由你自行确认或设置。

## 3. 指定 Claude 会话

在 Codex 会话中直接说，例如：「**连接 Claude 会话**，会话名带 sprint 的那个」或「给我连上叫 XX 的 Claude 会话」。claudetocodex skill 会自行定位安装位置、列出候选会话、完成连接；重名时它会给出候选让你选。你不需要复制任何路径或 ID。

## 4. 交流

对 Codex 说「给 Claude 会话发……」即可；Claude 的来信会出现在 Codex 会话中，回复也由会话之间直接完成——双方都不需要你转述。

## 排查与内部命令参考（非首用必需）

skill 内部使用以下命令（也可手动执行排查；`<PLUGIN_ROOT>` 由插件缓存布局自行求得，`codex plugin list --json` 在 0.153.4 不含安装路径）：

```powershell
$ch = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$PLUGIN_ROOT = Get-ChildItem (Join-Path $ch 'plugins\cache\*\claudetocodex\*') -Directory |
  Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName

node "$PLUGIN_ROOT\bridge\cli.mjs" sessions        # 列出运行中的 Claude 会话
node "$PLUGIN_ROOT\bridge\cli.mjs" connect --name <名称唯一片段>
node "$PLUGIN_ROOT\bridge\cli.mjs" send --body "..."
node "$PLUGIN_ROOT\bridge\cli.mjs" status
```

连接异常时：找不到/重名/会话已退出/端点失效都会明确报错并列出候选，不会误连或静默替换已有配对；Claude 会话重启后重新连接即可。

## 核对与验证（可选）

Release 资产中的 ZIP 即插件包（解压后就是插件根，含 `manifest.json` 每文件 SHA256 与来源 commit）；`bridge\release\Verify-Release.ps1` 可核对完整性，`bridge\release\Test-Acceptance.ps1` 为逐项技术验收入口。

## 能力边界（沿用已声明）

Windows-only；单对会话；短文本（trim 后 1..2000 字符）；串行投递；回执恒 `unverified`；失败不自动重试；Claude 会话重启后旧端点失效，重新连接即可（不静默替换）；CLI 版本升级后的契约漂移未验证。
