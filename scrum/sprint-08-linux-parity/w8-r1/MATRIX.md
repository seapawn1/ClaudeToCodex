# W8 R1 判定矩阵（runId: s08r1-20260918/19，SM 口径第 3 节）

> **会话身份（续跑用）**：Codex＝R1-2 thread `01a0b4b8-05f9-75c3-af4b-67f335d1bb7b`（tmux `s08r1-codex`，resume 命令见 w8-resume.sh；pair `d558d398-0072-4982-95bc-2d3b0790c3e1`→claudetocodex-51）；Claude＝`claudetocodex-51` sessionId `a7954f30-8956-4eb6-a04e-94a9082cb7d5`（tmux `s08r1-claude`）。rollout＝R1-2 home `sessions/2026/09/18/rollout-…01a0b4b8….jsonl`（resume 后续写同一文件）；Claude 侧＝`~/.claude/projects/-home-dell-projects-ClaudeToCodex/a7954f30….jsonl`。**TUI 提交键经验**：Claude composer 常需多次 C-m（force-submit.sh 循环重试可靠）；Codex 用 Enter，个别需补发。
> **待续格**：T04CX（Codex 跑长工具＋Claude reply 入口中途投）→ T05（连续往返 conversationId 核对，可用既有链 messages conversationId 抽验＋一轮显式 2×2）→ MT 系（**需第二 Claude 会话**：新 tmux 窗口 claude，取注册名，codex connect 第二目标）→ R 系（R1 新会话自动根可借第二 Codex 会话或记 N/A；R4 跨根诊断构造；R5 连续投递＝多轮连环；R6 边界抽验）→ S03 系（S03-1 可读到达已有 rollout 样本；S03-2 同轮双 hook＝宿主仅插件注册，按"以宿主实际注册为准"记录单注册形态或构造项目级重复注册；S03-3 跨轮抑制＝对已消费消息重发 wake；S03-4 忙碌堆叠＝Codex 工作中连发两条；S03-5 旧单行 wake 兼容＝手造 legacy marker 经 queue 注入或记录为不适用）。

| 格号 | 场景 | 判定 | 证据要点 |
|---|---|---|---|
| REG | 安装与配置实证 | **PASS**（附记） | 隔离 home 标准入口安装（WC2 复核）；PO 首启 Trust-all 处理 hooks 审阅（插件 hooks 亦需交互信任——探针实证）；SKILL 引导 Codex 自主完成 sessions＋connect（自然语言「连接 Claude 会话 codex-86/51」）；自动数据根 `~/.local/share/ClaudeToCodex`（root-bound＋connect 事件）；resume 复用同根同 pair；重启后旧端点 pair 显式 retire 留证（`pairs-retired/3100b30f….json`）。附记：主树遗留 Windows 路径项目级 hooks 造成 Hook failed 噪声（根因＋处置见 diagnostics/HOOK-FAILURE-DIAGNOSIS.md；PO 批准改名保留） |
| T01XC | 首次联系 Codex→Claude | **PASS** | Codex 经 SKILL/CLI 发送（标记 7b2e94d1）；Claude 原始会话 `~/.claude/projects/-home-dell-projects-ClaudeToCodex/a7954f30….jsonl` 含标记 ×9（入站帧＋回复流）；**POSIX 回复入口在入站消息正确渲染**（`CODEX_HOME='/home/dell/projects/ctc-s08-r1-home-2' node "…" reply --to …`，D-D＋隔离 home 内嵌实证）；Claude 经入口回复，Codex 收到并核收（wake-submitted＋context-prepared 事件） |
| T01CX | 首次联系 Claude→Codex | **PASS**（路径附记） | Claude 侧裸 send 的 queue 唤醒落默认 home 报 `no rollout found`（跨 home 语义：首次联系须由 Codex 侧发起、Claude 经内嵌入口回应——产品文档口径一致）；该信件落 pending 槽，Codex 下一 turn 的 UserPromptSubmit hook **最旧兜底领取**（E2 语义现场复现），正文注入＋Codex 经回复入口答复；标记 a3f81c27 落 Codex rollout ×6、Claude jsonl ×8 |
| T02CX | 空闲收信 Claude→Codex | **PASS** | 消息 5306ce80：wake-submitted 07:29:41→context-prepared 07:29:52→Codex task_complete 07:30:03「空闲后自动开启新轮」；标记 c41d8e2f 落 rollout×7/claude jsonl×6 |
| T02XC | 空闲收信 Codex→Claude | **PASS** | Codex 发出（Claude 空闲）→Claude 自动开新轮并经回复入口确认（473a756c wake→context-prepared 07:32:22）；标记 9e5a71c4 落 claude jsonl×3/rollout×12 |
| T03CX | 生成中收信 Claude→Codex | **PASS**（等价证据） | T01CX 信件 ece96d74 于 Codex turn 进行中到达（07:22:03 published，turn 至 07:22:34），hook 边界领取（context-prepared 07:22:06），原输出 task_complete 完整无截断并答复——即"生成中到达、当前输出完整、下次上下文进入"语义 |
| T03XC | 生成中收信 Codex→Claude | **PASS** | 掐窗脚本 t=2s 命中生成窗口投递（b52c19e7）；Claude 长文完整输出无截断（"第二段完成…done"），结束后经入口确认（f0d793ee）；标记落 claude jsonl×3/rollout×12 |
| T04CX | 工具边界收信 Claude→Codex | 待跑 | |
| T04XC | 工具边界收信 Codex→Claude | **PASS**（分层） | wire 层：657e28a5 pipe-written **07:43:05**，Claude sleep 60 运行中（~07:42:45 起，~07:43:45 止）——工具窗口内到达；接收层：工具结束边界注入、无打断无截断；范围限定确认 ad34e086（replyTo 657e28a5）由 Claude 明示边界措辞、到达时刻由本台账以 wire 事件佐证；标记 6f1c84d3 落 claude jsonl×3/rollout×7 |
| T05 | 连续往返 | 待跑 | |
| MT1–MT5 | 多目标系 | 待跑（需第二 Claude 会话） | |
| R1–R6 | 数据根系 | R2 已实证（resume 复用）；其余待跑/叠加 | |
| S03-1..5 | 可读到达系 | S03-1 部分（rollout 已见可读格式）；其余待跑/按宿主注册记录 | |
