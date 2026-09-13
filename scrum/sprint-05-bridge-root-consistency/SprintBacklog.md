# Sprint 05 Backlog：自动会话数据根与连续官方投递

- 创建：2026-09-13（Sprint Planning 草案）。
- 范围：PO 认同以 PBI-15 的自动会话数据根与 Hook 一致性作为价值主线，并将 PBI-14 作为连续官方投递回归；Product Backlog 中 PBI-14 的严重缺陷定位和排序保持不变。
- 状态：Sprint Planning 已收口：Developer 已阅读 Scrum 方法论、复核最终版并承诺交付；C1 / W1 待启动，施工从实机首验开始。
- 参与者：PO、SM / Codex；Developer 已参与 Planning 复核并承诺交付。
- 节奏：按 PO 决定，不设固定天数或 human timebox；以 Sprint Goal、Increment 和 DoD 检视收口，采用本项目的人与 AI 协作节奏。

## 第一部分：Sprint Goal 与 DoD

### Sprint Goal（Planning 提案）

> 在真实 Windows 安装候选中，交付可靠的 per-Codex 会话数据根管理：新开或 resume 的 Codex 原始会话无需 PO 手写 `CTC_BRIDGE_DIR`，即可自动选择并复用正确 bridge root；同一 Codex 会话与多个 Claude Code 原始会话可连续完成 Claude→Codex 官方投递，每条正文直接进入 Codex 原始会话并释放 pending；当 root/hook 不一致或 hook 未生效时，状态与 wake 处理给出明确诊断和下一步，不形成首条消息后的永久阻塞，也不依赖读取数据文件旁路。

与 Product Goal 的关系：产品价值是让 Codex 与 Claude Code 原始会话直接交流并把反馈用于决策与行动。本 Sprint 聚焦让该能力在新开、恢复和多个 Claude 目标共存的日常场景中可靠续用，而不扩大为任意规模并发、自动恢复或跨机器能力。

Planning 预研观察：2026-09-13，A/B 两个新 Claude pair 在 Codex 宿主丢失 `CTC_BRIDGE_DIR` 时复现“回复发布、wake 可达、正文不注入、pending 卡住”；以正确 root resume 后两条 pending 均经官方路径直接入站并释放。随后 C/D 两个新 pair 在同一正确 root 下各自连续完成两轮 Claude→Codex 回复，四条正文均直接入站且 pending 清空。该观察用于缩小范围，不替代安装候选验收。

### DoD（照抄自 Product Backlog）

**Definition of Outcome Done**

PO 在真实使用场景中亲身体验产品，确认当前 Product Goal 所约定的价值已经实现，并记录体验场景与结论。

**Definition of Output Done**

Increment 已集成到产品中，可通过标准产品入口使用，通过与其声明范围相适应的质量验证，并由 PO 按事先约定的验收标准验收通过。

## 第二部分：选入 PBI 与验收标准

来源：[Product Backlog](../ProductBacklog.md)。下表为 PO 已排序条目的原文照抄；Developer 负责评估容量、方案与工作项，下表不构成派工。

| 编号 | 标题 | 用户故事 | 架构定位 | 当前状态 | 备注 |
|---|---|---|---|---|---|
| PBI-14 | 待收槽不领取致每配对首条后发送全拒 | 作为从 Claude 向 Codex 发消息的日常使用者，我要待收消息被 Codex 侧领取后待收槽及时清空、后续消息可继续投递，以便持续协作不因首条消息而中断、也不依赖对方直读数据文件的旁路。 | Claude→Codex 待收-唤醒-Hook 交付链路的领取与清槽步骤；修复不改变单槽语义与重叠保护本身。 | 2026-09-13 PO 判定严重缺陷并要求修复，优先级提到未完成条目最前；待 Developer 定位根因与方案 | 来自 2026-09-12/13 多配对真实演示（1 Codex + 3 Claude，CTC-WOLF 系列，bridge-threads/01a09805）：每配对首条 Claude→Codex 消息 pipe 写入后长期停留待收槽，status 持续显示 pendingMessageId，事件流无领取事件；此后同配对所有发送被重叠保护拒绝（send-error，仅存 created 记录）。宿主会话却完整引用了首日发言原文、并复述了仅存在于 send-error 记录中的第二轮猜测内容，表明其经直读记录文件取得内容而非领取路径——通道实际已中断而协作表面照常，属投递中断与状态失真的双重缺陷。验收（初步，待精化）：真实多配对场景同一配对连续多条消息经官方交付路径送达 Codex 原始会话，待收槽随领取清空且有领取证据；领取缺失时 status 如实呈现、不静默依赖旁路；重叠保护行为与说明一致；修复经隔离安装候选验证，证据遵循原始会话事件与唯一标记规则。 |
| PBI-15 | 自动会话数据根与 Hook 一致性 | 作为随意新开或恢复 Codex 对话的日常使用者，我要插件自动为当前 Codex 原始会话选择并复用正确 bridge 数据根，而不必手动导出 `CTC_BRIDGE_DIR` 或理解目录布局，以便新会话可直接连接 Claude 且 Claude→Codex 官方交付不会因 root 不一致而死锁。 | 数据根生命周期与运行时解析：为每个 Codex 原始会话建立可发现/可复用的 root 或索引，使 connect、reply entry、queue wake 与 Codex hook 解析到同一处；保留一个 root 只服务一个 Codex 的身份边界，不静默改绑或合并旧证据。 | 待 Developer 评估；优先级未定 | 来自 2026-09-13 恢复复核：默认 root 绑定旧 Codex；临时隔离 root 只在 CLI 子进程设置，Claude 回复入口与 queue wake 可达，但 Codex hook 查看默认 root，三个待收槽不释放；宿主以正确 root resume 并重载/信任 hooks 后官方路径恢复。建议方向：按 Codex 会话自动创建/复用 root 或提供会话-root 索引；hook 依据事件中的 original session 解析 root；connect 遇默认 root 被其他 Codex 占用时自动为当前会话启用新 root；status/wake 对“消息在另一 root”“hook 未信任/未重载”给出明确诊断和下一步。验收（初步，待精化）：同一机器上新开 Codex 会话无需手写 `CTC_BRIDGE_DIR` 即可连接一个或多个 Claude 并完成双向通信；同一 thread 完全退出后 resume 自动复用正确 root；默认 root 被旧会话占用时不阻塞、不串扰、不要求 PO 手写路径或 ID；人为制造 root/hook 不一致时出现可理解诊断且不形成永久 pending；既有数据保留，PBI-14 连续投递回归通过隔离安装候选验证。 |

### 2.1 精化结论（Planning 提案）

1. **PBI-15 是本 Sprint 的价值主线**：解决 per-Codex 数据根的自动选择、记录与复用，使 connect、Claude reply entry、queue wake 与 Codex hook 解析到同一数据根。它针对的是本次复现的 root/hook 不一致，而不是预设某个底层函数损坏。
2. **PBI-14 是强制回归与缺陷验收**：必须证明同一 pair 在首条消息消费后，后续 Claude→Codex 消息仍可连续官方入站且 pending 清空。若 PBI-15 修复后该回归仍失败，PBI-14 的缺陷定位继续成立并由 Developer 继续排查。
3. **诊断是可交付价值的一部分**：当 wake 指向的消息不在当前 root、hook 未信任或未重载时，用户应得到可理解的原因和下一步，而不是裸 wake、永久 pending 或依赖数据文件旁路。
4. **身份边界不放松**：一个 bridge 数据根仍只服务一个 Codex 原始会话。本 Sprint 自动化的是“找到并复用正确 root”，不是静默改绑、合并或迁移旧证据。
5. **预研中的 A/B Claude 会话消失属于端点生命周期观察**：本轮不将其吸收为新范围；发送到失效端点仍应如实失败，现有显式重连边界不回退。

### 2.2 明确不纳入本次范围

- 不承诺任意数量的 Claude 会话、任意规模并发吞吐、广播、自动重试、自动送达回执或事务性投递。
- 不自动启动、停止或恢复 Claude / Codex 进程；宿主 hook 信任仍由 PO 按宿主要求完成，产品只能提示必要步骤。
- 不提供跨机器、跨平台、完整状态中心、完整投递状态语义或插件卸载 / 升级生命周期改造。
- 不静默迁移、合并或改绑既有 bridge root；旧数据和历史证据保留。
- 不把读取消息文件、模型自述、`submitted:true`、落盘时间或裸 wake 作为原会话收信证据。

### 2.3 验收标准（Developer 审阅稿）

#### PBI-15：自动会话数据根与 Hook 一致性

1. **S05-15-1 新会话可用**：在同一机器且默认 bridge root 已被其他 Codex 会话占用的场景下，新开 Codex 原始会话可通过标准产品入口连接至少一个 Claude 原始会话并完成双向交流；PO 无需手写 `CTC_BRIDGE_DIR`、threadId 或数据根路径。
2. **S05-15-2 resume 复用**：同一 Codex thread 完全退出后 resume，自动复用正确数据根；既有 pair、pending、消息和历史证据不丢失，不创建会导致消息误投的重复身份。
3. **S05-15-3 多目标一致**：一个 Codex 原始会话同时保持至少两个 Claude 原始会话目标时，connect、按名发送、Claude reply、queue wake 与 Codex hook 消费解析到同一 per-Codex 数据根；消息只进入被选目标，回复只回到该 Codex 原始会话。
4. **S05-15-4 root 冲突安全**：默认 root 被旧 Codex 身份占用时，当前会话不得改绑、覆盖或合并旧 root；新数据根的选择或启用必须可追溯，且状态能说明当前使用的数据根与身份。
5. **S05-15-5 不一致诊断**：数据面可观察的 root 不一致必须给出确定性诊断，至少说明当前使用的数据根、wake 指向的 pair / message、后续恢复动作，且不得把 wake、落盘或提交成功表述为原会话已收到正文。hook 未信任 / 未重载本质上可能不会执行，产品不得声称已检测；相关状态或发送侧提示只能标为未知或可能，并给出 PO 检查 `/hooks` 与重启 / resume 的下一步。人为构造 wake 指向当前 root 不存在消息的场景必须验证确定性诊断；hook 未生效场景验证诚实未知 / 可能提示与不误报。
6. **S05-15-6 安装候选验证**：以上场景经隔离安装候选和标准产品入口验证；源码树、插件树、skill / 文档和回归测试同步，`CTC_BRIDGE_DIR` 仅保留为显式测试或隔离覆盖语义。

#### PBI-14：连续官方投递回归

1. **S05-14-1 连续入站**：在安装候选中，至少两个 Claude pair 各自连续完成两条以上 Claude→Codex 业务回复；每条完整正文都直接进入同一个 Codex 原始会话，并可通过 messageId、pairId、conversationId、replyTo 与目标标识核对关联。
2. **S05-14-2 pending 清空**：每条消息被官方 hook 路径消费后，对应 pair 的 `pendingMessageId` 清空；下一条消息可继续发布，不被首条消息永久阻塞。重复 wake 不得重复注入正文。
3. **S05-14-3 重叠与失败边界**：相近到达、目标不同、无效目标、Claude 端点失效或消息已在另一 root 的场景有如实结果；不得静默改投、丢失证据或把失败写成成功。
4. **S05-14-4 证据纪律**：真实验收记录接收方原始会话完整正文、hook 消费、pending 释放和下一条消息继续投递的证据；不读取消息文件替代入站，不用模型自述或单层事件替代端到端判断。
5. **S05-14-5 回归同步与 PO 端到端验收**：连续投递、重复 wake、root 冲突和 resume 复用纳入自动化回归；`bridge/` 与 `plugins/claudetocodex/bridge/` 双树一致。PO 至少亲自完成一次安装候选端到端真实验收，覆盖新开 / resume、多 Claude 目标和连续 Claude→Codex 官方入站。若容量允许，可增加第二次独立真实运行作为强化，但它是弹性项，不得掩盖必需验收未完成。

### 2.4 Developer 审阅问题

- 评估 PBI-15 的数据根索引、per-thread root 或其他方案的容量、风险与兼容边界；方案由 Developer 决定。
- 确认 PBI-14 在修复后的最小回归矩阵，以及是否需要补充自动化测试。
- 确认 hook 事件可观察信息足以支持明确诊断；宿主未暴露的信息必须诚实标为未知。
- 若发现范围超出当前承诺容量，停在可回滚点并向 PO 提出切片选择，不自行扩大承诺。

## 第三部分：Developer 工作区

本部分由 Developer 自行维护：流程要求、方案要点、工作项拆解与进展证据。承诺基线：ab0a650；施工分支：`worktree-sprint05-dev`（独立提交，SM 合入）。

- 开工前阅读并遵循 Scrum 方法论：以经验过程控制、透明、检视和适应为工作基础；尊重 PO、Developer、SM 的角色边界和五个价值观；Sprint Backlog 的 How 由 Developer 自主管理。
- 开始工作前完整重读本文件、[Product Backlog](../ProductBacklog.md) 和相关使用 / 冒烟文档；范围或验收疑问先向 SM 提出。
- 自主评估容量，制定方案、工作项、估计、顺序和测试计划，并在本节记录进展、证据与 impediment。
- 尽早在安装候选上验证真实新开 / resume / 多目标连续投递闭环；不要以源码路径或 fixture 通过替代安装候选验收。
- 发现范围、宿主权限、身份边界或证据定义超出本 Sprint 约定时，立即报告 SM 和 PO，不自行吸收。

### 工作项与进展

#### 方案要点（Developer 决定，2026-09-13）

- **全局会话-root 索引**：`%LOCALAPPDATA%\ClaudeToCodex\` 下固定位置记录 codexThreadId → 数据根映射；原子写（temp+rename），只登记不改绑（身份边界）。
- **解析次序**：显式 `CTC_BRIDGE_DIR` ＞ 索引命中 ＞ 默认根未占用或属己则采用 ＞ 新建 per-thread 根（沿用既有 `bridge-threads\<threadId>` 形态）并登记索引。
- **存量默认根采用语义**：同身份首连（默认根既有 pairs 的 codexId 与当前 `CODEX_THREAD_ID` 一致）＝ 索引登记指向默认根，不迁移、不移动、不改写既有数据；异身份则当前会话让位新根，旧根只读留证。
- **hook 侧**：按事件 `session_id` 经索引解析数据根；wake 指向的消息不在当前根时，枚举索引各根定位 pairId/messageId，给确定性诊断与恢复动作；hook 未信任 / 未重载只在发送侧 status 给"未知 / 可能"提示与下一步，不声称检测。
- **Claude reply 入口维持现状**：`renderPeer` 已内嵌数据根与命令路径，不改。

#### 工作项、估计与顺序

| 项 | 内容 | 估计 | 完成判据 |
|---|---|---|---|
| W1 | 实机首验（只读取证，先于编码） | ≤0.5h | C2a/b/c 全过或触发上报 |
| W2+W3 | 根解析模块＋索引＋connect 冲突让位＋hook 按会话解析与跨根诊断 | 3–4h | 索引模块单测绿后接入 cli.mjs；三事件路径覆盖 |
| W4 | status / 发送侧诚实提示与根身份呈现 | 1h | 措辞为未知 / 可能、不误报 |
| W5 | 单测：解析矩阵＋领取回归＋既有测试全绿（双树同跑） | 2h | `node --test` 全绿 |
| W6 | USAGE §2 数据根语义重写＋SMOKE 增格＋双树同步 | 1–1.5h | `bridge/` 与 `plugins/claudetocodex/bridge/` 逐文件一致 |
| W7 | 隔离安装候选验证＋真实验收编排（PO 步骤由 PO 亲自完成） | 2–4h（含 PO 参与） | 候选门（manifest/元数据/生效 hooks/回复入口溯源）通过后交 PO 验收 |

**证据口径（沿用既有约定）**：入站判定只认接收方原始会话事件＋唯一标记；`submitted:true`、pipe 写入、落盘时间为过程证据；fixture → 宿主加载 → 实际执行 → 原会话收信四层不混用；SM 独立复核。

**可回滚纪律**：每工作项独立提交；索引模块先单测绿再接入 CLI；任意时刻树面干净可退。

#### 进展记录

- **2026-09-13 W1 实机首验完成：C2a/C2b/C2c 全部通过，无阻碍。证据 ID 均为全量 UUID，可按 receipts/<messageId>.json、pairs/<pairId>.json 路径直接核验。**
  - C2a（线程标识跨 resume 稳定）：thread `01a09805-3cfa-7ef3-9c33-fb1d6257c628` 全目录仅一个 rollout 文件 `~/.codex/sessions/2026/09/13/rollout-2026-09-13T07-47-55-01a09805-3cfa-7ef3-9c33-fb1d6257c628.jsonl`（创建 2026-09-12T23:47:55Z，末次写入 2026-09-13 16:59 本地，仍在追加），单条 `session_meta` 且 id 即该 thread。结合 Product Backlog PBI-15 备志记录的完全退出与正确根 resume：恢复后 08:12Z 起 connect（pair 09b2323f-f8fe-4e78-9f31-0c771d229c11、085fe1b3-c786-4ce1-89f1-a27a250a4c9b，后 12e71e8f-0353-48e6-bdd7-25fd6a40db30、05cb5a3f-9680-4b95-96e9-8e84a1278a6c、faf7fa45-c489-4bf1-abd6-b44229f8072a）均在同一根通过"一根一 Codex"身份校验成功——证明 resume 后 `CODEX_THREAD_ID` 与退出前一致，resume 未另建 rollout 文件。
  - C2b（三类 hook 事件均带 session_id）：两个在用根的 `receipts/` 实录三类消费——bridge-threads\01a09805-… 根：`3dcdd392-25fa-43a7-b6ad-98a9b7bfc9db`=UserPromptSubmit（08:34:49Z）、`128331e5-4ef4-436e-8b88-e22480be94d3`=PostToolUse（08:37:57Z）、`dd92a1f1-e1f2-4faa-bcc0-79776dc8f81c`=Stop（00:23:34Z）；默认根：`d02f3d39-1759-46f7-967c-9ce63785743f`=UserPromptSubmit（08:50:51Z）、`76a141dd-f526-4f6c-a4d9-9d4ed9f33256`=UserPromptSubmit（08:54:31Z）、`3f50df61-8fca-4cbd-b6f4-1376287c771d`=Stop（08:09:24Z）。每条 receipt 的存在即证明 `take()` 的 `message.to.sessionId === event.session_id` 过滤通过。本日 Developer 两回复（`a6082f04-bbce-41d2-a9a6-ad0d16004bba`、`a56ff39a-6165-49ee-8655-da43452af27c`）经官方 UserPromptSubmit 入站。
  - C2c（数据根清点）：`%LOCALAPPDATA%\ClaudeToCodex\` 下默认根 `bridge` 今日仍有活跃消费（08:50/08:54Z）——现役占用者真实存在，S05-15-1 冲突前提成立；`bridge-threads\01a09805-3cfa-7ef3-9c33-fb1d6257c628`（本 Sprint 在用）；另有 15+ 历史 / 测试 / 归档根。无既有索引类文件、无命名冲突；索引落点（父级 `roots-index.json` 或 `bridge-threads\index.json`）在 W2 定稿。
- **2026-09-13 W2+W3 完成（提交 6217b1c＝索引/解析模块＋17 项单测先绿；570953e＝CLI/hook 接线＋7 项集成测试；全套 74/74 绿）。**
  - 新增 `bridge/roots.mjs`：`%LOCALAPPDATA%\ClaudeToCodex\bridge-roots.json` 索引（`CTC_ROOTS_FILE` 可覆盖）；`resolveRoot` 次序＝显式 `CTC_BRIDGE_DIR`＞索引＞默认根未占用或属己＞`bridge-threads\<threadId>` 新根；`bindThreadRoot` 只登记不改绑、重复登记幂等；`rootOwner` 把 legacy `pair.json`、`pairs/`、`pairs-retired/` 都算占用（退役证据同样不让位）；`locateMessage` 只读跨根定位消息。
  - CLI：connect 按会话解析根并在配对成功后登记索引（`root-bound` 事件含 source 与索引路径，S05-15-4 可追溯）；send/reply/status/retire 同一解析；install/register/pair/sessions 维持 1.0.0 默认根语义。connect 输出新增 `bridgeRoot` 字段。
  - 边界修正（测试暴露的真缺陷）：显式 `CTC_BRIDGE_DIR` 的 connect 不写索引——隔离运行不得向机器索引泄漏绑定（曾把测试绑定写进真实索引，已删除该污染文件并加回归测试锁死）。
  - hook：按事件 `session_id` 解析根；**带 wake 的事件不再被"根属他 session"门静默**（9-13 事故形态），`take()` 的收件人过滤仍保证不误投；wake 找不到消息时经 `locateMessage` 给跨根确定性诊断（事件 `wake-foreign-root` 记录 livesIn/servesCodex，systemMessage 给下一步且不声称收信），全无所知时如实 unknown＋`/hooks` 重信任与退出-resume 提示；无 wake 事件的门行为不变。
  - 集成测试覆盖：默认根被占用时 connect 自动启用 per-thread 根且不动旧根；hook 仅凭 `session_id` 从 per-thread 根领取注入（含 pending 释放与 receipt）；跨根 wake 诊断（含不声称收信）；无处可寻的 wake＝诚实 unknown；无 wake 外来 session 仍静默；同会话重连复用同根同 pair 且不重复 root-bound；显式 env 不写索引。
  - 未做（后续工作项）：W4 status 根身份与 pending 提示、W5 双树同步与全量复跑、W6 文档、W7 安装候选。
- **2026-09-13 W4+W5+W6 完成（dcaec01＝W4；81d1616＝文档；3ed61c1＝双树同步）。全套 76/76 绿 × 双树（bridge/ 与 plugins/claudetocodex/bridge/），共享文件集哈希逐一致。**
  - W4：status 输出新增 `root`（path/source/codexThread，S05-15-4）与每配对 `pendingClaimed`/`pendingNote`——未领取 pending 的提示区分数据面事实（`otherRootsServing` 发现"另一已知根也在服务本 Codex"）与未知/可能（hook 未信任/未重载不可检测），无收信声称；发送侧回执语义未动（`receipt: unverified` 既有）。
  - W6：USAGE §2 重写为四级解析次序（显式 env＞索引＞默认根属己/未占用＞per-thread 让位）＋"只增不改绑、存量零迁移"；§3 注明 Codex 侧命令与 hook 免环境变量、Claude 回复入口内嵌根；§4 新增跨根诊断与 pendingNote 两行排查项；§5 已验证范围补数据根自动选择/resume 复用/诚实提示边界。SMOKE 前置 7 改为自动根＋显式隔离双模式，新增 4c 节 R1–R6 格（新会话自动根/resume 复用/多目标同根/不一致诊断/连续投递回归/冲突边界）。
  - W5：双树逐文件哈希核对一致后，plugins 树全套复跑 76/76 绿。
- **2026-09-13 W7 Developer 侧完成（70ffa5d＝候选版本准备；d3456bf＝release 脚本仓库根修复；79f9f34＝验收 harness 纳入 S05 套件；均已推 origin）。**
  - 候选产物：`claude-to-codex-plugin-1.2.0.zip`（SHA256 `1d425242ae446c994cb4ae7a155be42c37c4775c86648135da306a31d461d59f`，源提交 79f9f34，manifest 24 文件、VERIFY=OK checked=23 extra=0）。plugin.json→1.2.0（独立缓存目录，不动在用 1.1.0）；SKILL.md 边界更新为自动根语义；RELEASE-NOTES 增 1.2.0 候选节（标注未发布、验证摘要待 PO 验收后补全；README/INSTALL 仍指向已发布 v1.1.0）。
  - 发现并修复真实缺陷：plugins 树 `Build-Release.ps1`/`Test-Acceptance.ps1` 以固定 `..\..` 推仓库根（1.0.0 布局残留），在 plugins 布局下 `git archive` pathspec 失败；改为 `git rev-parse --show-toplevel`。验收 harness 增加 S05-15 桶（roots 单测＋roots-cli 集成计入 shipped-copy 判定）。
  - 包级技术验收（repo harness 对解包候选）：**pass=8 fail=0 blocked=3**——blocked 为真实宿主隔离安装、真实 hook 执行、真实 skill 发现三项，按设计归 SM/PO 轮。
- 待办：隔离宿主安装（isolated CODEX_HOME，保持日常 1.1.0 安装与在用桥原状）→ PO 亲自 host trust 与端到端真实验收（SMOKE 4c R1–R6 格）→ PO DoD 检视。