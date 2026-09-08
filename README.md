# ClaudeToCodex

运行于本机（Windows）的 Codex ↔ Claude Code 跨会话双向消息桥：以 **Codex CLI 插件**形态安装后，指定一个正在运行的 Claude Code 会话即可互发工作消息、收到回复、继续对话——无需手动登记端点、复制会话 ID、配置数据目录，Claude 侧无需安装任何东西。

## 快速开始（Codex CLI 插件）

```powershell
codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref <ref>
codex plugin add claudetocodex@claudetocodex-dev
```

随后只需三步：Codex 会话内 `/hooks` 信任三条 bridge hook 并 `codex resume` 重载；对 Codex 说「**连接 Claude 会话**，叫 XX 的那个」；然后直接交流（发送、回复、追问均由插件 skill 完成，无需复制路径或 ID）。详见 [INSTALL.md](INSTALL.md)。

完整安装、授权、连接、回复与边界说明见 [INSTALL.md](INSTALL.md)。

## 文档

- [INSTALL.md](INSTALL.md)：插件安装与使用（最短路径）。
- [RELEASE-NOTES.md](RELEASE-NOTES.md)：版本、分发内容、前置条件与限制。
- [bridge/docs/USAGE.md](bridge/docs/USAGE.md)：底层桥的完整使用说明与排查。
- [bridge/docs/SMOKE.md](bridge/docs/SMOKE.md)：端到端 smoke 剧本与证据规则。
- [Sprint 01 Bridge Review & Retro](docs/scrum-sprint/sprint-01-bridge-review-retro.md)：首个 Increment 的检视与回顾。
- [Product Backlog](scrum/ProductBacklog.md)：当前产品、DoD 与后续 PBI。
- [Sprint 02 Backlog](scrum/sprint-02-install-package-release/SprintBacklog.md)：本冲刺计划与施工记录。
- [Host evidence steps](scrum/sprint-02-install-package-release/HOST-EVIDENCE-STEPS.md)：真实宿主验收证据的取得步骤（Sprint 过程资料）。

自动化回归与逐项技术验收（排查/开发用；安装后的 skill 自行从插件缓存定位，不依赖 `codex plugin list` 的安装路径字段）：

```powershell
node --test bridge/test/store.test.mjs bridge/test/pipe.test.mjs bridge/test/install.test.mjs bridge/test/connect.test.mjs
powershell -NoProfile -File bridge\release\Test-Acceptance.ps1
```

> 当前 Increment 范围：Windows-only、单对原始会话、短文本、串行投递；能力边界详见 RELEASE-NOTES.md 与 USAGE §5。
