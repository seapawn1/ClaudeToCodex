# ClaudeToCodex 1.1.0 版本说明

## 版本

- **版本**：1.1.0（Codex CLI 插件）
- **来源**：GitHub 仓库 [seapawn1/ClaudeToCodex](https://github.com/seapawn1/ClaudeToCodex)，固定 `v1.1.0` tag。
- **安装入口**：

```powershell
codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref v1.1.0
codex plugin add claudetocodex@claudetocodex-dev
```

- **完整性**：包内 `manifest.json` 记录来源提交与逐文件 SHA256；Release 资产附整包 `.sha256`；`bridge\release\Verify-Release.ps1` 可复核。

## 新增能力

- 一个 Codex 原始会话可同时保持多个 Claude Code 原始会话配对。
- 新发送按名称确定目标；名称不存在、歧义、身份失效或已断开时明确报错并给出下一步，不猜测、不静默切换。
- 回复与追问绑定被回复消息的原目标，不随最近一次发送或当前候选排序改变。
- 每个配对有独立待收槽；相近来信逐事件注入，不覆盖、不串目标、不重复注入；重复唤醒被抑制。
- 单个目标可显式 `retire --pairId`；证据归档，在途信件保留原归属，其他目标继续可用。
- 状态入口列出各目标名称、双侧原始会话、项目上下文与待收信息；`endpointOnDisk` 只表示文件存在，不声明存活。
- 1.0.0 单目标入口与 legacy `pair.json` 数据继续可用；同身份重连刷新端点。

## 已验证环境

Windows 10 Pro 19045、PowerShell 5.1、Node.js v24.14.0、Codex CLI 0.153.4 / 0.154.0、Claude Code 2.1.263 / 2.1.268。

## 验证摘要

- 产品回归：50/50 通过，覆盖多配对、legacy、生命周期、并发锁、唤醒、队列与 1.0.0 回归。
- 双树一致：`bridge/` 与 `plugins/claudetocodex/bridge/` 的 16 个 tracked 文件一致。
- 隔离安装候选：19 个文件全部匹配固定源提交，无源外夹带；实际插件 hooks、CLI 与 reply 入口均指向同一安装。
- 原始会话验证：A/B 业务问答、交错追问、切回旧消息、相近来信、工作中三类收信边界、重复唤醒抑制和生命周期分支均以原始事件核对。
- PO 体验：对象容易区分、切换无需拆除连接、追问归属正确，PO 确认支持其多方协作并满意。
- 完整技术判定与证据索引见仓库 `docs/scrum-sprint/sprint-04-multi-claude-sessions-review-retro.md`。

## 边界与限制

- 最低验证规模为一个 Codex + 两个 Claude；不承诺任意规模、广播、并发吞吐或全局顺序。
- Windows-only；短文本 trim 后 1..2000 字符；串行逐事件注入。
- 回执恒 `unverified`；不自动重试、不自动恢复、不代改宿主权限。
- Claude 重启后旧端点失效；显式重连。新身份创建新配对；同名陈旧配对需按完整 pairId 显式退役。
- 未验证所有宿主异常注入形态、任意跨版本升级路径或 CLI 未来版本兼容性。

## 分发与权利

本发布物经 GitHub Release 分发。仓库尚未附开源许可证；作者保留所有权利，未随包授予再分发许可。

## 包内容

ZIP 根即插件根：`.codex-plugin/plugin.json`、`skills/claudetocodex/SKILL.md`、`hooks/hooks.json`、`bridge/` 与本说明。包内不含端点、令牌、配对数据或消息记录。