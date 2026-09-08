# Sprint 01 — Bridge Review & Retro

- 日期：2026-09-08
- Participants：Product Owner、Scrum Master / Codex、Product Developer / Claude Code
- Sprint Goal：将设计冲刺已验证的跨会话双向消息目标产品化，交付可安装、可配置、可重复验证的最小 Increment。
- 结论：**Sprint Goal 达成；PBI-01 Increment 验收通过；PO 最终真实场景检查通过，含偏差记录。**

## 1. Increment inspection

首个 Increment 交付 Windows 本机、单对原始会话、短文本串行通信桥：

- 标准入口：`node bridge/cli.mjs <install|register|pair|send|reply|status|hook>`。
- Claude→Codex：本地待收消息、queue 唤醒、`UserPromptSubmit` / `PostToolUse` / `Stop` hook 交付。
- Codex→Claude：原生命名管道，普通消息固定 `priority=next`。
- 稳定用户级数据目录、单配对模型、DPAPI 保护 Claude endpoint token。
- 自动化回归：16/16 通过。
- 两轮独立现场 Smoke：各 10/10 通过，并获 PO acceptance。
- PO 最终真实场景检查：一对新 Codex / Claude 会话完成 `USAGE.md` 受控互审，判定通过，含数据目录与端点轮换偏差记录。

全局 Definition of Output Done 未修改：

> Increment 已集成到产品中，可通过标准产品入口使用，并通过与其声明范围相适应的质量验证。

## 2. Value inspection

已观察到的价值：

- PO 在最终检查中没有人工转述两个 Agent 的业务内容。
- 一对新原始会话完成请求、回复、追问、再回复，并产出可用的 USAGE 审查结论。
- Sprint Review / Retro 讨论本身通过 bridge 完成，成为产品常态化使用的第一手证据。
- 现场故障证实边界声明诚实：`submitted:true` 只表示尝试投递，接收方原始会话事件才是送达判定依据。

尚未正式定义 Definition of Outcome Done。下一 Sprint 应与 PO 定义可观察价值指标，建议起点：

> 在真实协作事件中，PO 无需代为搬运跨会话消息，并能基于双方原始会话中的回复继续推进决策。

## 3. PO final inspection summary

runId：`po-final-e2e-20260908-1`

初始 pair：

- pairId：`d8cd8186-abbc-45ac-9602-15fabfda1ca8`
- Codex：`01a080d4-7597-7711-8ec8-e381761bb6e9`
- Claude：`f8950132-31de-4445-a600-a1d3be01b574`
- conversation：`916aeddb-4921-4d71-a4e9-bfd4d6257a3d`

核心四步：

| # | 方向 | 标记 | messageId | 结果 |
|---|---|---|---|---|
| 1 | Codex→Claude | `PO-FINAL-E2E-20260908-1-REQ-d82508dd` | `6e577651-82c1-48b7-96ad-ac821cfabcd8` | 请求审查 USAGE |
| 2 | Claude→Codex | `PO-FINAL-E2E-20260908-1-FINDINGS-8b787844` | `eead6bf2-3c27-4a05-87ff-d608b87aa3fd` | 回复 3 个误导点 |
| 3 | Codex→Claude | `PO-FINAL-E2E-20260908-1-FOLLOWUP-e5f1c0d8` | `538fe483-99a8-417c-8de9-bbe6556ab982` | 追问最重要问题 |
| 4 | Claude→Codex | `PO-FINAL-E2E-20260908-1-ANSWER-a7c34d19` | `a7bf71dd-6923-44ef-8903-094a47c4fb80` | 给出具体建议句 |

过程偏差与恢复：

1. 双侧 `CTC_BRIDGE_DIR` 不一致导致“恰好其一”身份错误；排查后进入显式重配对。
2. Claude 会话重启后旧 endpoint 管道失效，三次补充投递均超时：
   - `45610ddd-25d8-475f-ac28-71e43904d5d2`
   - `23d7f014-7367-4e93-868b-d9b82620be5f`
   - `a60325ad-5320-4cec-b327-34b4ebbc4111`
3. 保留旧数据目录，重新 register / pair；新 pair 恢复通信：
   - pairId：`3d81837d-826e-4dff-84b3-a971dd484400`
   - Claude：`2636ac33-8077-4d48-8c44-081de3b2596c`
4. 重配对后完成 EXTRA、CLOSE REQ、CLOSE ACK 三条收尾消息。

判定：**通过，含偏差记录。** 偏差属于文档排查缺口或已声明边界，未否定当前承诺能力；显式重配对流程实测可用。

## 4. Trade-offs and boundaries

当前 Increment 用极简语义换取可验证性：

- Windows-only；
- 单 Codex / 单 Claude 原始会话；
- 短文本 trim 后 1..2000 字符；
- 串行投递与单待收槽；
- 回执恒 `unverified`；
- 发送失败不自动重试；
- 会话重启 / 端点失效后不自动恢复，需人工显式重配对；
- CLI 版本升级后的契约漂移未验证。

这些边界已在 `bridge/docs/USAGE.md` §5 声明，不应暗示未验证能力已完成。

## 5. Product Backlog adaptation

Sprint 02 候选已写回 `scrum/ProductBacklog.md`：

1. **PBI-02 使用说明与排查修正**：补充两个实测故障排查行，澄清身份环境变量不是防伪，并说明 Node 最低前置与已验证基线差异。
2. **PBI-03 投递失败状态透明化**：让 `send-error` / status / messages 记录能区分失败投递与待送达，避免误导排查。
3. **PBI-04 产品成效度量定义**：与 PO 定义 Definition of Outcome Done 和真实协作事件中的价值检视方式。

最终排序归 PO；上述排序是 Review 的建议输入。

## 6. Retrospective

### Worked well

- “离线逻辑回归 + 真实现场 Smoke”的两层验证口径有效。
- skeleton-first 让 Codex hook 链风险最早暴露。
- 唯一标记 + 接收方原始会话事件的事后对账规则可靠。
- PO 坚持“跨会话内容不经人转述”，使产品价值被真实使用。
- 端点失效被立即摊开为 impediment，而非被静默消化。

### Corrected assumptions

- `submitted:true` 不等于送达。
- 只检查发送侧环境变量不足以保证双侧数据目录一致。
- 排查文档没有覆盖两个真实故障路径。
- Claude endpoint 生命周期与会话 UI 生命周期不完全等同，管道可能先消失。

### Process improvements for Sprint 02

1. 现场验证前增加双侧 `CTC_BRIDGE_DIR`、身份环境变量、pair 状态的一致性检查。
2. 将真实 Scrum 事件作为常态化 smoke 场景，使产品使用与验证合一。
3. 失败投递记录必须能被 `status` 和文件布局清楚解释。

本次不修改全局 DoD，也不把新的长期流程规则直接制度化；上述改进先进入 Product Backlog / memory，由 PO 在 Sprint 02 Planning 决定。

## 7. Retention and history

活跃树保留：

- 产品实现与通用测试：`bridge/`
- 通用使用说明与 Smoke 剧本：`bridge/docs/USAGE.md`、`bridge/docs/SMOKE.md`
- 产品与设计研究知识：`docs/`
- Product Backlog：`scrum/ProductBacklog.md`
- Sprint Review/Retro 蒸馏记录：本文件
- 长期项目记忆：`.claude/memory/`

一次性过程文件已从活跃树删除：`bridge/docs/evidence/` 与 `scrum/SprintBacklog.md`。其关键结论已蒸馏到本文件；两轮 Smoke 的原始 evidence 可通过 Git 历史恢复，关键提交包括：

- `f17d4ea`：产品实现与离线回归；
- `f253dc0` / `b44d595`：第一轮 Smoke 与 PO acceptance；
- `840e91f` / `65ade56`：第二轮隔离 Smoke 与 PO acceptance；
- `5ce9128`：Increment 收口核对。

收口 tag：`sprint-01-bridge-review-retro`。