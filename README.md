# ClaudeToCodex

运行于本机（Windows）的 Codex ↔ Claude Code 跨会话双向消息桥：让两个已运行的原始会话互发工作消息、收到回复、继续对话，无需人工搬运上下文。

## 快速开始

```powershell
node bridge/cli.mjs install     # 安装；随后完成 /hooks 信任与 codex resume 重载
node bridge/cli.mjs register    # 在选定的 Claude 原始会话内登记端点
node bridge/cli.mjs pair --codex <codexThreadId> --claude-endpoint <端点文件>
node bridge/cli.mjs send --body "..."
```

完整安装、配置、发起通信、回复、排查与边界说明见 [bridge/docs/USAGE.md](bridge/docs/USAGE.md)。

## 文档

- [USAGE.md](bridge/docs/USAGE.md)：产品使用说明与已验证边界。
- [SMOKE.md](bridge/docs/SMOKE.md)：通用端到端 smoke 剧本与证据规则。
- [Sprint 01 Bridge Review & Retro](docs/scrum-sprint/sprint-01-bridge-review-retro.md)：Increment 检视、价值观察、Backlog 适配与 Retro。
- [Product Backlog](scrum/ProductBacklog.md)：当前产品、DoD 与后续 PBI。
- [Design target](docs/ideo-design/cross-session-agent-messaging.md) / [Research synthesis](docs/DeepResearchSynthesis.md)：设计证据与研究边界。

自动化回归：

```powershell
node --test bridge/test/store.test.mjs bridge/test/pipe.test.mjs bridge/test/install.test.mjs
```

> 当前 Increment 范围：Windows-only、单对原始会话、短文本、串行投递；未验证边界见 USAGE §5。