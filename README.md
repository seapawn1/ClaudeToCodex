# ClaudeToCodex

运行于本机（Windows）的 Codex ↔ Claude Code 跨会话双向消息桥：让两个已在运行的原始会话互发工作消息、收到回复、继续对话，无需人工搬运上下文。产品源自 Design Sprint 已验证的最小原生双向桥（设计证据见 [docs/ideo-design/cross-session-agent-messaging.md](docs/ideo-design/cross-session-agent-messaging.md)）。

## 快速开始

```powershell
node bridge/cli.mjs install     # 安装（随后完成 /hooks 信任与 codex resume 重载，见使用说明）
node bridge/cli.mjs register    # 在选定的 Claude 原始会话内登记端点
node bridge/cli.mjs pair --codex <codexThreadId> --claude-endpoint <端点文件>
node bridge/cli.mjs send --body "..."          # 发起；回复用 reply --to <messageId>
```

完整步骤（安装人工步骤、配置、发起与回复、故障排查、已验证范围与未验证边界）：[bridge/docs/USAGE.md](bridge/docs/USAGE.md)。

## 文档

- [bridge/docs/USAGE.md](bridge/docs/USAGE.md) — 使用说明（安装、配置、发起通信与回复、故障排查、边界声明）。
- [bridge/docs/SMOKE.md](bridge/docs/SMOKE.md) — 端到端 smoke scenario（T01–T05 × 双方向判定矩阵、证据规则、重复运行约定）。
- [docs/](docs/) — 设计定稿与研究综合等持久知识。
- [scrum/](scrum/) — Product Backlog 与 Sprint Backlog（含 Developer Plan 与 Increment 收口核对记录）。

自动化回归：`node --test bridge/test/store.test.mjs bridge/test/pipe.test.mjs bridge/test/install.test.mjs`（仅用 Node 内置模块，无需安装依赖）。

> 当前为首个 Increment：Windows-only、单对原始会话、短文本、串行投递；未验证边界见使用说明 §5。
