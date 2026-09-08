# ClaudeToCodex 1.0.0 版本说明

- **版本**：1.0.0（Codex CLI 插件形态）
- **来源**：Git 仓库 [seapawn1/ClaudeToCodex](https://github.com/seapawn1/ClaudeToCodex)；本包对应 commit 见包内 `manifest.json`（`sourceCommit`），构建时间取该 commit 的提交时间。
- **安装入口**：`codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref v1.0.0` 后 `codex plugin add claudetocodex@claudetocodex-dev`；安装说明见仓库 `INSTALL.md`。
- **完整性核对**：每个文件的 SHA256 见包内 `manifest.json`；ZIP 整包校验值见 Release 资产中的 `.sha256` 文件；`bridge\release\Verify-Release.ps1` 可自动核对。

## 分发内容

ZIP 根即插件根，`manifest.json` 为完整清单。概览：

- `.codex-plugin\plugin.json`——插件清单。
- `skills\claudetocodex\SKILL.md`——连接与通信 skill。
- `hooks\hooks.json`——三条 bridge hook（`${PLUGIN_ROOT}` 锚定安装位置）。
- `bridge\`——产品代码、投递脚本、文档、离线回归、校验与验收脚本。
- `RELEASE-NOTES.md`——本文件。

包内不含任何会话端点、令牌、配对数据或消息记录。

## 前置条件

- Windows 10 及以上（已验证：Windows 10 Pro 19045）。
- Node.js（已验证基线 v24.14.0）。
- Codex CLI ≥ 0.117.0（已验证：0.153.4）。

## 支持范围

本机单对原始会话（一个 Codex、一个 Claude Code）之间的短文本双向通信：安装插件、选择运行中的 Claude 会话自动连接、发送、回复、追问与状态查看。Claude 侧无需安装或配置。

## 限制

- Windows-only；单对会话；短文本（trim 后 1..2000 字符）；串行投递。
- 插件 hook 需用户人工信任；`crossSessionInbound` 等接收策略由用户自管，本产品不代改。
- 回执恒 `unverified`；发送失败不自动重试；送达以接收方原始会话事件与唯一标记判定。
- Claude 会话重启后旧端点失效，需重新 `connect`（不静默替换配对）。
- 多会话并发、卸载、升级、自动恢复与 CLI 版本升级后的契约漂移未在本版本验证。

## 使用范围

本发布物经公开仓库 [seapawn1/ClaudeToCodex](https://github.com/seapawn1/ClaudeToCodex) 的 GitHub Release 分发。截至本版本发布，该仓库尚未附加开源许可证；作者保留所有权利，未随包授予再分发许可。

## 验证

发布前离线回归（store / pipe / install / connect 四套）与逐项技术验收入口 `bridge\release\Test-Acceptance.ps1` 已在本发布物解压副本上运行；真实宿主加载与执行、以及 PO 亲身验收的记录见 [Sprint 02 Review](docs/scrum-sprint/sprint-02-install-package-release-review.md)（验收对象即本包字节：SHA256 `185da0bf…6cb5e6b`，manifest `sourceCommit` 为 `b6286c0`）。
