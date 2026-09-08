# Sprint Backlog

## 1. Commitments

### Sprint Goal

将设计冲刺已验证的跨会话双向消息目标产品化，交付可安装、可配置、可重复验证的最小 Increment。

### Definition of Output Done

Increment 已集成到产品中，可通过标准产品入口使用，并通过与其声明范围相适应的质量验证。

## 2. Selected Product Backlog

### 2.1 Selected PBI

| 编号 | 标题 | 用户故事 | 架构定位 | 当前状态 | 备注 |
|---|---|---|---|---|---|
| PBI-01 | 产品化已验证的跨会话双向消息桥 | 作为 PO，我要在 Codex 与 Claude Code 的现有会话之间直接发送和接收工作消息，以便无需搬运上下文即可推进协作。 | 将 Design Sprint 已验证的最小原生双向桥产品化；不扩展到重启恢复、并发、多会话、远程协作等未验证范围。 | 已选择，已精化 | 首个 Increment 聚焦已验证的短消息双向通信路径。 |

### 2.2 Refinement

#### PBI-01.1 可安装与可配置的产品入口

**Acceptance Criteria**

- 提供产品结构内的标准安装/配置入口。
- 配置能标识参与通信的现有 Codex 与 Claude Code 会话。
- 验证过程不依赖 Design Sprint 历史原型目录。

#### PBI-01.2 双向短消息往返

**Acceptance Criteria**

- Claude Code 可向指定 Codex 原始会话发送消息。
- Codex 可向指定 Claude Code 原始会话发送普通消息。
- 双方均能在原始会话中收到并继续对话。
- 普通消息默认不抢占当前生成过程。

#### PBI-01.3 已验证行为回归

**Acceptance Criteria**

- 覆盖设计冲刺已验证的 T01–T05 场景。
- 保护身份核对、消息消费记录、防重复唤醒行为。
- 保护 Codex→Claude 普通消息默认使用 `priority=next` 的行为。

#### PBI-01.4 端到端验证与使用边界

**Acceptance Criteria**

- 提供可重复执行的端到端 smoke scenario。
- 使用说明覆盖安装、配置、发起通信和回复。
- 明确当前已验证范围与未验证边界。

## 3. Developer Plan

本节由 Product Developers 创建、维护和更新，用于记录为实现 Sprint Goal 而制定的行动计划、当前进展、涌现工作和障碍。Product Owner 与 Scrum Master 不替代 Developers 制定实现方案。

_待 Developers 填写。_