# ClaudeToCodex 1.0.0 版本说明

- **版本**：1.0.0
- **来源**：Git tag `v1.0.0`；对应 commit 见包内 `manifest.json`（`sourceCommit`），构建日期取该 commit 的提交时间。
- **分发**：GitHub Release（验收阶段先以草稿 Release 提供同一份资产；正式发布与验收资产为同一文件）。
- **完整性核对**：每个文件的 SHA256 见包内 `manifest.json`；ZIP 整包校验值见 Release 资产中的 `claude-to-codex-1.0.0.zip.sha256`。

## 分发内容

`manifest.json` 为完整清单。概览：

- `bridge\`——产品代码与脚本（`cli.mjs`、`entry.mjs`、`store.mjs`）、投递脚本（`bridge\delivery\`）、文档（`bridge\docs\USAGE.md`、`SMOKE.md`）、离线回归（`bridge\test\`）、打包脚本（`bridge\release\`）。
- `INSTALL.md`——最短安装与使用路径。
- `RELEASE-NOTES.md`——本文件。

包内不含任何会话端点、令牌、配对数据或消息记录（它们只存在于用户本机数据目录）。

## 前置条件

- Windows 10 及以上（已验证：Windows 10 Pro 19045）。
- Node.js（已验证基线 v24.14.0）。

## 支持范围

本机单对原始会话（一个 Codex、一个 Claude Code）之间的短文本双向通信：发送、回复、追问与状态查看。安装路径见 `INSTALL.md`。

## 限制

- Windows-only；单对会话；短文本（trim 后 1..2000 字符）；串行投递。
- 回执恒 `unverified`；发送失败不自动重试；送达以接收方原始会话事件与唯一标记判定。
- 会话重启或端点失效后不自动恢复，需显式重配对（`USAGE.md` §2）。
- 重复安装、卸载、跨版本升级与混合 hook 配置兼容未在本版本验证。
- CLI 版本升级后的契约漂移未验证。

## 使用范围

本发布物经 GitHub Release 分发；仓库可见性与分发许可以发布仓库的设置及其声明为准。

## 验证

发布前离线回归三套（store / pipe / install）已在本发布物解压副本上运行通过；真实会话验收记录见 Sprint Backlog（开发仓库内）。
