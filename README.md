# ClaudeToCodex

运行于本机（Windows）的 Codex ↔ Claude Code 跨会话双向消息桥，以 **Codex CLI 插件**发布：安装插件并完成必要授权后，对 Codex 说一句「连接 Claude 会话 <名字>」即可开始互发工作消息、回复与追问——无需登记端点、复制会话 ID 或配置数据目录，Claude 侧零安装。

## 正式获取（v1.0.0）

- 安装入口（Codex CLI）：

  ```powershell
  codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref v1.0.0
  codex plugin add claudetocodex@claudetocodex-dev
  ```

- 版本归档与校验值：[GitHub Release v1.0.0](https://github.com/seapawn1/ClaudeToCodex/releases/tag/v1.0.0)（插件 ZIP 含 `manifest.json` 逐文件 SHA256 与来源 commit；`.sha256` 为整包校验值）。

## 使用四步（详见 [INSTALL.md](INSTALL.md)）

1. **安装插件**（上方两条命令）。
2. **必要授权**：Codex 会话内 `/hooks` 审核并信任三条 `claudetocodex` hook；重开会话用 `codex resume`（会话选择器，无需手写 ID）。
3. **选择会话**：对 Codex 说「连接 Claude 会话 <名称片段>」。
4. **交流**：自然语言发送、回复、追问——Claude 来信自带可执行回复入口。

## 已验证环境与范围

Windows 10 Pro 19045；Node.js v24.14.0；Codex CLI 0.153.4（更早版本未验证）。范围：本机、单对原始会话、短文本（1..2000 字符）、串行投递；回执恒 `unverified`，送达以接收方原始会话事件与关联核对判定。完整限制见 [RELEASE-NOTES.md](RELEASE-NOTES.md) 与 [bridge/docs/USAGE.md](bridge/docs/USAGE.md) §5。

## 文档

- [INSTALL.md](INSTALL.md)：安装与使用（最短路径）。
- [RELEASE-NOTES.md](RELEASE-NOTES.md)：版本、分发内容、前置条件与限制。
- [bridge/docs/USAGE.md](bridge/docs/USAGE.md)：底层桥的完整使用说明与排查。
- [bridge/docs/SMOKE.md](bridge/docs/SMOKE.md)：端到端 smoke 剧本与证据规则。
- [Sprint 02 Install, Package, Release Review](docs/scrum-sprint/sprint-02-install-package-release-review.md)：1.0.0 插件 Increment 的检视与回顾（含验收证据索引与两 tag 追溯说明）。
- [Sprint 01 Bridge Review & Retro](docs/scrum-sprint/sprint-01-bridge-review-retro.md)：首个 Increment 的检视与回顾。
- [Product Backlog](scrum/ProductBacklog.md)：当前产品、DoD 与后续 PBI。

## 版本与 Sprint 标签

- **版本标签 `v1.0.0`**：固定指向已正式发布的提交（`48edef8`），其插件 ZIP 与被验收候选逐字节一致（来源 commit `b6286c0`，SHA256 见 Release 资产）。
- **Sprint 标签 `sprint-02-install-package-release-review-retro`**：标记本次 Sprint 的结束提交（含本 README 收尾与 Review/Retro/记忆更新），用于追溯整个冲刺过程。

## 开发验证入口（可选）

```powershell
node --test bridge/test/store.test.mjs bridge/test/pipe.test.mjs bridge/test/install.test.mjs bridge/test/connect.test.mjs
powershell -NoProfile -File bridge\release\Test-Acceptance.ps1
```

> 注意：`Test-Acceptance.ps1` 默认（无现场证据参数时）会把需要真实宿主会话与人工 hook 信任的检查报告为 **BLOCKED** 且退出码非零——这是设计行为。它是逐项检查入口，不是完整端到端通过的证明；完整结论需按 Review 文档中的证据规则绑定现场证据后判定。
