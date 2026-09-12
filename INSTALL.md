# ClaudeToCodex 1.1.0 安装与使用（Codex CLI 插件）

首用路径：**安装插件 → 必要授权 → 按名称连接 Claude 会话 → 交流**。Claude 侧无需安装任何东西；你不需要复制会话 ID、登记端点或管理桥数据目录。

## 前置条件

- Windows 10 及以上（已验证 Windows 10 Pro 19045）。
- Node.js v24.14.0（已验证基线）。
- Codex CLI 0.153.4 / 0.154.0（已验证；更早版本未验证）。
- 至少一个正在运行的 Claude Code 会话，知道其名称即可。

## 1. 安装插件

```powershell
codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref v1.1.0
codex plugin add claudetocodex@claudetocodex-dev
```

## 2. 必要授权

- 在 Codex 会话运行 `/hooks`，审核并信任三条 `claudetocodex` hook。插件 hook 属非托管，需人工信任，产品不代改权限。
- hook 变更后需重启会话加载；用 `codex resume` 继续原会话。
- Claude 侧接收策略由你自管；`crossSessionInbound=accept` 是已验证配置。

## 3. 连接一个或多个 Claude 会话

对 Codex 说：「连接 Claude 会话 <名称片段>」。连接第二个目标时继续按名称连接；已有配对不会被拆除。多目标发送时指定名称，例如「发给 s04 的 B」；只有一个目标时无需指定名称。

同名陈旧配对会造成歧义。错误会列出完整 pairId 和可执行 `retire --pairId` 命令；只退役你确认不再使用的目标。会话重启后旧端点失效，重新按名称连接新会话，不静默替换旧配对。

## 4. 交流

对 Codex 自然语言下达任务、回复或追问。Claude 来信自带可执行回复入口；回复沿被回复消息回到原目标，不随最近一次发送切换。另一目标不会收到误投事件。

## 从 1.0.0 更新

v1.1.0 继续读取旧版 `pair.json`，同身份连接会刷新端点，单目标入口保持免 `--name` 形态。已验证的数据兼容路径见 Sprint 04 Review。Codex 0.154 没有通用 `plugin update` 子命令；可采用 marketplace 升级后移除再安装，或按你的包管理习惯重新安装。保留 `%LOCALAPPDATA%\ClaudeToCodex` 下的桥数据，除非明确要抛弃历史证据。hook 信任变化后需再次人工确认。

## 排查与内部命令

```powershell
$ch = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$PLUGIN_ROOT = Get-ChildItem (Join-Path $ch 'plugins\cache\*\claudetocodex\*') -Directory |
  Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName

node "$PLUGIN_ROOT\bridge\cli.mjs" sessions
node "$PLUGIN_ROOT\bridge\cli.mjs" connect --name <unique-name>
node "$PLUGIN_ROOT\bridge\cli.mjs" status
node "$PLUGIN_ROOT\bridge\cli.mjs" send --body "..."
node "$PLUGIN_ROOT\bridge\cli.mjs" retire --pairId <full-pair-id>
```

`submitted:true` 和单条 `context-prepared` 只是过程线索；收信以接收方原始会话完整入站帧与自动关联字段为准。