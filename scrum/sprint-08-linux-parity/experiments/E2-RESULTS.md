# E2 实验结论：Codex hooks / queue 唤醒与注入探测（Sprint 08 预研）

- 日期：2026-09-18。执行：Developer（环境预置）＋ PO（`/hooks` 信任，隔离 home `ctc-e2` 内 6 条 hook 定义，实际执行者 PO）。
- 环境：WSL2 Ubuntu 同机同用户；codex-cli **0.154.0**（隔离 `CODEX_HOME=/tmp/ctc-e2/home`）；模型 glm-5.3 max（隔离 home 内联 token，直连 200 验证）；工作目录 `/tmp/ctc-e2/work`（scratch git repo，config 含 `[projects] trust_level="trusted"`）；桥根 `CTC_BRIDGE_DIR=/tmp/ctc-e2/bridge-root`；hooks 指向工作树 `bridge/cli.mjs`。
- 证据：`e2-hook-raw.jsonl`（3 类事件原始载荷）、`e2-hook-env-redacted.log`（hook 环境，已脱敏）、`e2-bridge-events.jsonl`（桥根事件）、`e2-rollout-excerpt.jsonl`（rollout 全文）、`e2-hooks-used.json`（信任的 hooks 定义）。fixture 用产品 `store.mjs` 代码路径构造（`e2-fixture.mjs`），格式零漂移，合成 Claude 身份如实标注。

## 结果：B 簇关键未知全部关闭

| # | 观察项 | 结果 | 关键证据 |
|---|---|---|---|
| 1 | 三类 hook 触发 | **PASS** | UserPromptSubmit、Stop、PostToolUse 全部触发（原始载荷存证） |
| 2 | 事件字段形状与产品依赖一致 | **PASS** | `session_id`、`hook_event_name`、`turn_id`、`tool_use_id`、`prompt`、`last_assistant_message`、`transcript_path`、`cwd` 均在——`cli.mjs` 依赖的 `event.session_id` 解析根可用 |
| 3 | hook 环境**无** `CODEX_THREAD_ID` | 记录（非失败） | hook 身份走事件载荷；`CODEX_THREAD_ID` 属于会话内工具执行路径（产品 send/reply），留待安装候选验证。SM 注 4 的双路区分得到实证 |
| 4 | 隔离 home 模型接入（D1 残留） | **PASS** | glm 变体内联 token 直连可用；隔离 home 最小文件集 = 真实变体 config.toml（600）＋ codex-models.json（glm 引用）＋ `[projects]` 信任条目；`.env` 非必需（直连 200） |
| 5 | `codex queue` 投递 | **PASS** | `--thread <uuid> --message` 接受（exit 0）；空闲会话自动续接（queue 触发新 turn）；**前置**：目标 thread 必须已有 rollout（首 turn 前 queue 报 `no rollout found`） |
| 6 | pending 领取（无唤醒最旧兜底） | **PASS** | fixture 信件在下一个 UserPromptSubmit 被领取：`context-prepared` 事件＋ claim 目录＋ receipt 文件三件套，字段与 Windows 语义一致 |
| 7 | 注入进入模型上下文 | **PASS** | rollout 出现 `response_item` 含完整消息信封（id/pairId/conversationId/from/to/body）＋回复指引——模型上下文层证据（模型是否回应属模型行为，非传输问题） |
| 8 | 跨轮重复唤醒抑制 | **PASS** | 已消费消息的 queue 唤醒触发 `wake-suppressed` 事件（receiptTurnId 对照正确），TUI 显示 "Blocked by hook — This bridge message was already supplied"，原始 wake 文本不进模型——S03 防御语义原样复现 |
| 9 | PO `/hooks` 信任流程 | **PASS** | 首启即出 "Hooks need review — 6 hooks" 对话框，PO 审阅并信任后生效；信任为每-home 粒度 |

## 附带发现（高价值）

1. **`renderPeer` PowerShell 语法活证据**：注入的回复指引为 `$env:CTC_BRIDGE_DIR='...'` 形态，Linux 会话不可执行——与代码扫描结论互证，Sprint 03 的 S03 AC"可执行回复入口"在 Linux 必须换 POSIX 语法（HOW 已列为必改项）。
2. **TUI 提交键**：tmux 驱动下 `Enter` 被当作换行、`C-m` 才提交——Linux SMOKE/测试程序要点（Windows 记忆未覆盖）。
3. **环境清洗清单不全（程序缺陷）**：`env -u CLAUDE_CODE_SESSION_ID -u CODEX_THREAD_ID` 不足以隔离身份——codex 及其 hook 子进程仍继承了 `CLAUDE_CODE_MESSAGING_TOKEN`/`CLAUDE_PID`/`CLAUDE_JOB_DIR` 等十余个 Claude 变量（本次观测日志捕获了 live token，已脱敏并验证零残留）。**Linux 测试程序须扩展清洗清单或以干净 shell 启动**；对产品的影响为卫生级（bridge 的 caller() 只认双变量恰一，MESSAGING_* 对桥惰性），但证据链污染风险真实。
4. queue 唤醒在**会话空闲**时触发新 turn（自动续接）；首 turn 前无 rollout 时 queue 报错——SMOKE 程序须先建首 turn。

## 边界声明

- 原型层真实执行证据，**不构成安装候选验收**；未测：产品 send/reply 完整路径（含工具执行环境 `CODEX_THREAD_ID`）、同轮双 hook noop、Stop-block 对**未消费**信件的投递变体（本次信件先被最旧兜底领取，随后唤醒走了抑制分支——领取/注入/抑制三语义各自有证，但 S03 的"唤醒→Stop-block 注入"完整链留待候选验证）、多 pair 并发。
- 隔离 home/工作目录/桥根均在 /tmp/ctc-e2 下，会话已 teardown；日常 home 未动（config 等仅读取复制）。

## 对 HOW 的输入

- B 簇关闭：hooks/queue/注入/抑制在 Linux 的机制与 Windows 等价，适配面确认为"实现替换"而非"架构重设计"。
- 必改项新增活证据：renderPeer 平台语法；测试程序须更新（提交键、环境清洗清单、首 turn 前置）。
- 估时核对：预置＋观测实际消耗约 0.5 工作日（含排障），符合修订预估 0.75–1 的下沿。
