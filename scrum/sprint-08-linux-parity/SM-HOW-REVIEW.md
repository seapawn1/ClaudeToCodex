# SM 审阅：Developer HOW v2 与 E1/E2 预研

- 日期：2026-09-18。
- 审阅对象：`7c01edb`（HOW v2、E1/E2 结果与证据）。
- 结论：**技术方案与执行计划有条件通过**。E1/E2 足以关闭前置架构未知，HOW 的统一 Node 传输、平台分支、候选优先执行序、双平台回归和 12 项 AC 认领可进入 PO 决策。Planning 关闭前需修正 R-1 容量口径，并由 PO 决定 D-B、D-E 与 Sprint 时长。

## 1. 证据复核

| 对象 | SM 结论 |
|---|---|
| E1 UDS | PASS 接受。四个变体均有目标原始会话记录；空闲、生成中、工具中三种到达时机分别留证。发送端自述未被用作收信证明。 |
| E1 隔离偏差 | 接受为会话级隔离：目标为 scratch 会话，内联 per-session 设置未修改用户配置；但默认 home 与 `.key` 被读取，因此该结果只支持跨会话传输可行性，不支持安装隔离或用户配置不变更的验收结论。 |
| E2 hooks / queue | PASS 接受。三类 hook、事件字段、queue 投递、pending 领取、模型上下文注入、跨轮抑制与 PO 信任流程均有原始记录；仍按结果文件边界保留产品 send/reply、同轮双 hook、Stop-block 未消费链路与多 pair 等候选验证。 |
| 证据安全 | 抽查提交的实验材料，未见 API key、bearer token、peerToken 明文等秘密模式；E2 live token 记录为脱敏占位。探针代码仅包含读取 token 的逻辑，不包含 token 值。 |
| HOW 覆盖 | 12 项 AC 均有切片、现场或自动化证据认领；候选构建先于 W8–W11 现场验证，符合最终安装候选验收规则。 |
| 分支 / 环境 | `7c01edb` 基于 `0d5d36f`，工作树干净；Linux Node v24.14.0 位于 `~/.local` 且优先于 Windows PATH；仓库 Git 身份与历史提交一致。 |

## 2. 必须修正项

### R-1：容量与机动口径不一致

HOW 列表合计：不含 W7b 为 12d，含 W7b 为 13d；2.5 周按 5 个工作日/周折算约 12.5–13d。若包含 W7b，实际没有额外 1d 机动；若后置 W7b，才有约 1d 缓冲。

处理要求：Planning 关闭前按 PO 选择改成二选一：

1. **2.5 周 + W7b 明确后置**：计划 12d，保留约 1d 缓冲；
2. **3 周 + W7b 纳入本 Sprint**：计划 13d，保留约 2d 缓冲。

不得表述为“2.5 周含 W7b 且另有 1d 机动”。

## 3. PO 决策建议

| 决策 | SM 建议 | 理由与边界 |
|---|---|---|
| D-B token | **采用推荐方案**：Linux 发送时按 sessionId 精确反查并现读 `.key`，桥数据根零秘密落盘；Windows 保留 DPAPI。 | 避免 Linux 下复制出无等价保护的持久 token；Windows 安全姿态不变。W2 四类竞态 fixture 必须作为退出判据。 |
| D-E 发布工具 | **采用 Node Build/Verify 并移除包内 delivery `.ps1`**；**同时明确 W7b 本轮后置**。 | 让构建与校验可在 Linux 验收环境复跑，并控制本轮容量。W7b 后置期间，W5 自动化、W7a 构建/结构校验与 W8/W9 SMOKE 证据必须逐项映射 AC；SM 独立复核不得降级。 |
| D-E 回退 | W7a zip writer 或结构校验失败时视为 **pause-and-decide** 决策点：Developer 停下并携带证据向 PO 呈报，不得自动回退后继续验收。 | 包内容与发布策略是 PO 可见承诺；回退方案可作为预案，但执行需 PO 批准。 |
| Sprint 时长 | 若选 2.5 周，必须同时批准 W7b 后置；若要求 W7b 纳入，建议 3 周。 | 对应 R-1 的容量修正。压缩 W10 会削弱 Windows 回归与 S08-18-4 证据，SM 不建议。 |

## 4. 审阅后的执行条件

1. Developer 按 PO 决策修订 HOW 的容量、W7b 状态和 D-E 回退授权，不需要重新提交技术方案。
2. W1 的 Windows 命名管道客户端探针仍是硬退出判据；失败时按 HOW 定义进入回滚决断，并知会 PO。
3. W10-pre 的 Windows 隔离 home、模型、启动与信任安排必须由 Operator 留证并经 SM 复核；Linux E2 配方不得机械套用到 Windows。
4. E1/E2 结果支持方案可行性，不改变 Sprint Backlog 的安装候选验收要求；W8–W11 仍须取得原始会话与 PO 体验证据。
5. 主树 `.claude/settings.json` 的 `worktree.baseRef` 属工具配置，是否随仓库提交由 PO 在关闭 Planning 时一并决定；仓库级 Git 身份仅保存在本机 `.git/config`，无需提交。
