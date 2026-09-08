# ClaudeToCodex 1.0.0 安装与使用（Codex CLI 插件）

最短路径：**安装插件 → 必要授权 → 选择会话 → 交流**。无需手动登记端点、复制会话 ID 或配置数据目录；Claude 侧无需安装任何东西。

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

## 3. 选择会话并连接（在目标 Codex 会话内）

```powershell
codex plugin list --json                 # 取 claudetocodex 的 installedPath，下称 <PLUGIN_ROOT>
node "<PLUGIN_ROOT>\bridge\cli.mjs" sessions      # 列出运行中的 Claude 会话（名称/状态/存活）
node "<PLUGIN_ROOT>\bridge\cli.mjs" connect --name <名称的唯一片段>
```

- 重名会列出候选，换更长的片段重试；找不到、会话已退出、端点异常都会明确报错，不会误连或静默替换已有配对。
- 也可以直接对 Codex 说「连接 Claude 会话」，由 claudetocodex skill 引导完成。

## 4. 交流

```powershell
node "<PLUGIN_ROOT>\bridge\cli.mjs" send --body "..."        # 发送（1..2000 字符）
node "<PLUGIN_ROOT>\bridge\cli.mjs" status                    # 配对/待收/事件
```

Claude 的来信自带**回复入口**——一条现成命令，已携带数据目录与安装路径；Claude 会话直接按入口 `reply` 即可，无需任何配置。

## 核对与验证（可选）

Release 资产中的 ZIP 即插件包（解压后就是插件根，含 `manifest.json` 每文件 SHA256 与来源 commit）；`bridge\release\Verify-Release.ps1` 可核对完整性，`bridge\release\Test-Acceptance.ps1` 为逐项技术验收入口。

## 能力边界（沿用已声明）

Windows-only；单对会话；短文本（trim 后 1..2000 字符）；串行投递；回执恒 `unverified`；失败不自动重试；Claude 会话重启后旧端点失效，重新 `connect` 即可（不静默替换）；CLI 版本升级后的契约漂移未验证。
