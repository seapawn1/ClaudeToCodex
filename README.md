# ClaudeToCodex

运行于本机（Windows）的 Codex ↔ Claude Code 跨会话双向消息桥，以 **Codex CLI 插件**发布。安装并完成必要授权后，对 Codex 说「连接 Claude 会话 <名字>」即可开始互发工作消息、回复与追问；一个 Codex 会话可同时保持多个 Claude 会话，按名称选择目标，无需为换对象拆除另一条连接。

## 正式获取（v1.1.0）

```powershell
codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref v1.1.0
codex plugin add claudetocodex@claudetocodex-dev
```

版本归档、插件 ZIP、逐文件 manifest 与整包 SHA256 见 [GitHub Release v1.1.0](https://github.com/seapawn1/ClaudeToCodex/releases/tag/v1.1.0)。

## 使用四步

1. **安装插件**（上方两条命令）。
2. **必要授权**：Codex 会话内 `/hooks` 审核并信任三条 `claudetocodex` hook；重开会话后用 `codex resume` 继续原会话。
3. **选择会话**：连接一个 Claude 会话；如需多方协作，继续按名称连接第二个会话。
4. **交流**：自然语言发送、回复、追问；多目标时按名称选择，回复始终归属被回复消息。

详细路径见 [INSTALL.md](INSTALL.md)，完整操作与排查见 [bridge/docs/USAGE.md](bridge/docs/USAGE.md)。

## 已验证环境与范围

- Windows 10 Pro 19045；PowerShell 5.1；Node.js v24.14.0。
- Codex CLI 0.153.4 与 0.154.0；Claude Code 2.1.263 与 2.1.268。
- 一个 Codex 原始会话对至少两个 Claude 原始会话：配对共存、按名路由、回复归属、每配对待收槽、相近来信、显式退役/重建、单目标与 legacy `pair.json` 兼容。
- 短文本 trim 后 1..2000 字符；串行逐事件注入；回执恒 `unverified`；不承诺任意规模、广播、并发吞吐、自动重试或自动恢复。

## 文档

- [INSTALL.md](INSTALL.md)：安装、升级注意与使用。
- [RELEASE-NOTES.md](RELEASE-NOTES.md)：v1.1.0 版本、验证与边界。
- [bridge/docs/USAGE.md](bridge/docs/USAGE.md)：完整使用与排查。
- [bridge/docs/SMOKE.md](bridge/docs/SMOKE.md)：端到端冒烟与证据规则。
- [Sprint 04 Review](docs/scrum-sprint/sprint-04-multi-claude-sessions-review-retro.md)：多配对 Increment 验收、价值检视与回顾。
- [Sprint 02 Review](docs/scrum-sprint/sprint-02-install-package-release-review.md)：1.0.0 插件发布回顾。
- [Product Backlog](scrum/ProductBacklog.md)：产品目标、DoD 与后续待办。

## 版本与 Sprint 标签

- **`v1.1.0`**：多配对正式版本，发布物由 v1.1.0 提交构建并经 manifest / SHA256 追溯。
- **`sprint-04-multi-claude-review-retro`**：Sprint 04 Review/Retro 收口 tag，保留完整过程与证据追溯。
- **`v1.0.0`** 与 **`sprint-02-install-package-release-review-retro`**：1.0.0 历史发布与 Sprint 02 收口。

## 开发验证入口

```powershell
node --test bridge/test/*.test.mjs
powershell -NoProfile -File bridge\release\Test-Acceptance.ps1
```

`Test-Acceptance.ps1` 在缺少真实宿主证据时会按设计报 BLOCKED；完整结论以 Release 说明与 Sprint Review 证据为准。