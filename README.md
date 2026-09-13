# ClaudeToCodex

运行于本机（Windows）的 Codex ↔ Claude Code 跨会话双向消息桥，以 **Codex CLI 插件**分发。安装并完成必要授权后，对 Codex 说「连接 Claude 会话 <名字>」即可开始互发工作消息、回复与追问；一个 Codex 会话可同时保持多个 Claude 会话，按名称选择目标，无需为换对象拆除另一条连接。

## 当前已验证版本（1.2.0，Sprint 05 收口）

```powershell
codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref sprint-05-bridge-root-review-retro
codex plugin add claudetocodex@claudetocodex-dev
```

> 该 ref 指向 Sprint 05 Review/Retro 收口提交，插件版本为 `1.2.0`。它已通过隔离安装候选、SMOKE 4c R1–R6 与 PO 手动端到端验收；公开 GitHub Release / release 资产是否发布由 PO 另行决定。

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
- Sprint 05 起，per-Codex 数据根自动选择与 resume 复用；默认 root 属于其他 Codex 时自动让位新 root；Claude→Codex 连续官方投递、pending 清空、跨 root wake 诊断和并发首连索引安全已验证。
- 短文本 trim 后 1..2000 字符；串行逐事件注入；回执恒 `unverified`；不承诺任意规模、广播、并发吞吐、自动重试或自动恢复。
- 已知非阻塞体验问题：Codex 前端不总是展开 bridge 原文，且模型可能需要 PO 催问后才主动转述；由 PBI-09 跟踪。

## 文档

- [INSTALL.md](INSTALL.md)：安装、升级注意与使用。
- [RELEASE-NOTES.md](RELEASE-NOTES.md)：1.2.0 Sprint 05 验证与历史版本。
- [bridge/docs/USAGE.md](bridge/docs/USAGE.md)：完整使用与排查。
- [bridge/docs/SMOKE.md](bridge/docs/SMOKE.md)：端到端冒烟与证据规则。
- [Sprint 05 Review](docs/scrum-sprint/sprint-05-bridge-root-consistency-review-retro.md)：自动数据根与连续投递 Increment 验收、回顾与追溯。
- [Sprint 04 Review](docs/scrum-sprint/sprint-04-multi-claude-sessions-review-retro.md)：多配对 Increment 验收、价值检视与回顾。
- [Sprint 02 Review](docs/scrum-sprint/sprint-02-install-package-release-review.md)：1.0.0 插件发布回顾。
- [Product Backlog](scrum/ProductBacklog.md)：产品目标、DoD 与后续待办。

## 版本与 Sprint 标签

- **`sprint-05-bridge-root-review-retro`**：Sprint 05 收口 tag，对应 1.2.0 已验证插件版本和本 Review/Retro 文档。
- **`v1.1.0`**：多配对正式发布版本，发布物由 v1.1.0 提交构建并经 manifest / SHA256 追溯。
- **`sprint-04-multi-claude-review-retro`**：Sprint 04 Review/Retro 收口 tag。
- **`v1.0.0`** 与 **`sprint-02-install-package-release-review-retro`**：1.0.0 历史发布与 Sprint 02 收口。

## 开发验证入口

```powershell
node --test bridge/test/*.test.mjs
node --test plugins/claudetocodex/bridge/test/*.test.mjs
powershell -NoProfile -File bridge\release\Test-Acceptance.ps1
```

`Test-Acceptance.ps1` 在缺少真实宿主证据时会按设计报 BLOCKED；完整结论以 Release 说明与 Sprint Review 证据为准。