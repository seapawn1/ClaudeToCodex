# W8 R1 矩阵最终判定（runId: s08r1-20260918/19）

全部判定依据 SMOKE §3：接收方原始会话事件记录（Codex rollout＝R1-2 `sessions/2026/09/18/rollout-…01a0b4b8….jsonl`；Claude＝`~/.claude/projects/-home-dell-projects-ClaudeToCodex/<sessionId>.jsonl`）＋桥 events.jsonl 时间线。会话：Codex-1 thread `01a0b4b8`（主轮）、Codex-2 thread `01a0b8c1`（R1 格）、Claude-51 `a7954f30`、Claude-9e `499908b1`（MT 后退役）。

| 格 | 判定 | 证据摘要 |
|---|---|---|
| REG | **PASS** | 见 MATRIX.md；另：主树遗留 Windows 路径项目 hooks 的噪声根因与候选 hook 健康实证（diagnostics/） |
| T01XC | **PASS** | POSIX 回复入口真实渲染（CODEX_HOME 内嵌）；标记 7b2e94d1 双侧记录 |
| T01CX | **PASS** | 裸 send 跨 home 如实 no-rollout；pending 最旧兜底领取＋答复（标记 a3f81c27） |
| T02CX | **PASS** | 5306ce80 空闲自动开新轮（task_complete 原话） |
| T02XC | **PASS** | 9e5a71c4 Claude 空闲自动续轮＋入口确认 |
| T03CX | **PASS** | 等价链：turn 中到达→边界领取→输出完整→答复（ece96d74/07:22 时间线） |
| T03XC | **PASS** | b52c19e7 掐窗 2s 命中、长文无截断、完整结束后确认 |
| T04XC | **PASS** | 分层：wire 07:43:05 于 sleep 60 中途＋边界注入＋范围限定确认 ad34e086 |
| T04CX | **PASS** | 复合：T01CX 的 PostToolUse 边界领取链＋后台工具变体（731067a1 于工具运行中到达、下轮处理、回复 d672fdce）；Codex 代理坚持后台终端，前台阻塞窗口不可得——如实记录 |
| T05 | **PASS** | 4 消息同 conversationId 11b6a888、reply 链闭合（6c3dbfdb→1066f35e→b2db4da4→4470eb4f） |
| MT1 | **PASS** | 双 pair 并存（48c2529f/d558d398），原对未扰 |
| MT2 | **PASS** | 按名路由零误投（9e 记录 ×5、51 记录 ×0） |
| MT3 | **PASS** | 与 9e 往来后回复 51 旧消息：746e7330→a7954f30、conv 11b6a888 一致 |
| MT4 | **PASS** | 双目标回复按序按归属（99356b09/69071daf）；严格同窗双槽由 S03-4 补齐 |
| MT5 | **PASS** | 死端点如实 send-error（"No Claude session record…"）；retire 归档；51 不受影响（标记 ×3）；退役 pair 旧消息回复被拒（exit 1 "does not belong to any registered pair"） |
| R1 | **PASS** | Codex-2 connect 51→自动让位 `bridge-threads/01a0b8c1…` 专属根（pair b779f64a），零手写路径 |
| R2 | **PASS** | 重启后 resume 复用同根同 pair（S05-15-2 语义） |
| R3 | **PASS** | Codex-1 的双目标（51＋9e）全落同一默认根 |
| R4 | **PASS** | 构造跨根 wake→`wake-foreign-root` 事件三要素（messageId/livesIn=默认根/servesCodex=01a0b4b8）＋会话内自查 |
| R5 | **PASS** | 连续投递计数：pair-51 ≥5 连续领取回复（T01CX/T05/MT3/MT4/S03-4 链）、pair-9e 3 连续（MT1/MT4-B/S03-4-二）；pending 随领取清空、无阻塞 |
| R6 | **PASS** | 边界抽验：retire 语义（MT5）、重复唤醒抑制（S03-3）、重叠保护（S03-4）、误投为零（全程）、死端点不误投（MT5） |
| S03-1 | **PASS** | 可读排队到达：rollout 行 107/131 等＝`[Source: bridge message \| …]` 头行＋完整正文＋尾部 marker（CTC-WAKE 出现 28 次） |
| S03-2 | **记录** | 本宿主实际注册形态＝仅插件级单注册（项目级遗留已按 PO 决策改名保留）——同轮双 hook noop 不构造未声明 hook（SMOKE 约束）；该语义由既有单测＋W10 Windows 回归覆盖 |
| S03-3 | **PASS** | 现场实证：`wake-suppressed` 731067a1（08:01:17）＋TUI "Blocked by hook — already supplied" |
| S03-4 | **PASS** | 同窗双槽（两 pair pendingClaimed:False 同时）→忙碌完整结束→按发布序领取（08:17:22/08:17:36）→分别回复 |
| S03-5 | **PASS**（解析路径） | R4 注入即**旧单行格式** `[CTC-WAKE pair msg]`——hook 解析成功（产 foreign-root 诊断）证明 legacy marker 现场可解析；全量投递分支由单测覆盖；全新部署无有机遗留 wake（如实边界） |

## 总结

- **25 格判定：24 PASS＋1 记录形态（S03-2 按宿主实际注册如实记录）**。
- 现场发现并处置：主树遗留 Windows 路径项目 hooks（非候选缺陷）；PO 重启后的会话恢复流（resume＋显式重连＋退役）全程按产品语义工作。
- 过程性事实：Claude TUI 提交键 C-m 常需重试（force-submit 循环可靠）；Codex TUI 用 Enter；Codex 代理倾向后台终端；glm 端点偶发 429 退避即可。
- W8 R1 完成。W9（同冻结 commit 第二轮、独立 R2 home、PO 信任动作）待排期。
