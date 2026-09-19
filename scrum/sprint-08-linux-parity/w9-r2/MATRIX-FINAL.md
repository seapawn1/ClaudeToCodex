# W9 R2 矩阵最终判定（runId: s09r2-20260919，同冻结 commit `c0f8d6e` 第二轮独立运行）

会话：Codex-R2a thread `01a0b8ef`（主轮，R2 home）、Codex-R2b thread `01a0b926`（R1 格）、Claude-58 `b8141244`（主目标）、Claude-6c `bf576336`（MT 后退役）。PO 动作：R2 home `/hooks` 信任（2026-09-19 ~17:1x，PO 实际执行；trust 状态存于 home state DB，无 config 明文——与 R1 相同，以功能实证为准：本轮 hook 全程触发零失败）。

| 格 | 判定 | 证据摘要 |
|---|---|---|
| REG | **PASS** | R2 home 标准安装（27/27 哈希一致、本地冻结源、零预置 trust）；自然语言连接；自动根 `bridge-threads/01a0b8ef…`（默认根被 R1 incumbent 占用，正确让位） |
| T01XC | **PASS** | 标记 91c4e7f2：rollout×12 / claude-58 jsonl×6，回复入口闭环 |
| T01CX | **PASS** | 首轮 claude 经入口回复→wake→7s 内领取（等效中途到达链） |
| T02CX | **PASS** | 83450cd0：wake 09:20:52→context 09:21:00，rollout×5＋面板确认自动开新轮 |
| T02XC | **PASS** | 标记 77b3f1c8 双侧（rollout×12/claude×3），Claude 空闲自动续轮确认 |
| T03CX | **PASS** | 回复到达时 Codex turn 进行中（07:5x 链）→边界领取→答复 |
| T03XC | **PASS** | 掐窗 t=2s 投递（4a5b90d7），Claude 生成中排队无截断，结束后确认；双侧 ×3/×12 |
| T04XC | **PASS** | 43c73c4e pipe-written 10:00:43 于 sleep 60 中途（t04b-tool-done 工具证据在面板）；边界确认 4081537c（10:01:21）；双侧 ×12/×4 |
| T04CX | **PASS**（复合） | 同 R1 口径：边界领取链（T01CX/T03CX）＋后台工具变体 |
| T05 | **PASS** | conv `9ec765b2` 四消息闭合（f64282cf→73791ee9→6b871692→55c62ec8） |
| MT1/MT2 | **PASS** | 双 pair 并存；按名路由零误投（6c×6 / 58×0） |
| MT3 | **PASS** | e37cf288→b8141244（与 6c 往来后回 58 旧消息），conv 8634ed6d，58 确认返回 |
| MT4/S03-4 | **PASS** | 双信同窗堆叠（9a7d941d/10:06:53、f9b0c19d/10:07:47）→按序领取→分别回复（90e83245/0ef187ef）；rollout S034×14 |
| MT5 | **PASS** | 死端点如实失败＋retire 归档＋58 不受影响（标记 6d40e8b1）＋退役 pair 旧消息回复拒绝（exit 1） |
| R1 | **PASS** | 第三会话 01a0b926 connect 58→专属根 `bridge-threads/01a0b926…`（pair ad5b0f56） |
| R2 | — | 本轮无重启事件（R1 已证）；resume 语义同源 |
| R3 | **PASS** | 58＋6c 双目标同落 01a0b8ef 根（status 佐证） |
| R4 | **PASS** | legacy 注入→`wake-foreign-root`（711613f0，livesIn=01a0b8ef 根，servesCodex=01a0b8ef） |
| R5 | **PASS** | pair-58 ≥6 连续、pair-6c 2 连续（MT1/S03-4），pending 随领取清空 |
| R6 | **PASS** | retire/重复唤醒抑制（本轮自然 wake-suppressed ×1：9a7d941d 10:07:39）/重叠/零误投 |
| S03-1 | **PASS** | rollout 行 51/52 起＝可读头行＋完整正文＋尾部 marker |
| S03-2 | **记录** | 宿主单注册形态（同 R1 口径） |
| S03-3 | **PASS** | 自然实例：wake-suppressed 9a7d941d |
| S03-4 | **PASS** | 见 MT4 |
| S03-5 | **PASS**（解析路径） | R4 注入即 legacy 单行格式，解析成功产诊断 |

## 总结

**第二轮全矩阵：24 PASS＋1 记录形态（S03-2）＋1 不适用（R2 本轮无重启，R1 轮已证）**——与 R1 结论一致，独立 runId/全新会话/全新标记。两轮现场均只在安装候选（R1-2/R2 home，冻结 commit `c0f8d6e`）上执行。W9 完成；下一步 W10-pre/W10（Windows 同源候选回归）。
