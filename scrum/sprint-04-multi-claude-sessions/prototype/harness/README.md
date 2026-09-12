# Sprint 04 原型真实闭环 Runbook（W4）

- 状态：2026-09-13 草案，随实测修订。作者：Developer（Claude 会话 6aeef5d8）。
- 目的：在完全隔离的环境里验证多配对原型的真实闭环——宿主加载、实际执行、原会话收信三层，对应首个检查点。
- 前置：fixture 层 10/10 通过（`test/multi.test.mjs`）；本 runbook 不替代验收，产出的是证据。

## 0. 隔离边界（每轮自查，SM 复核）

- 只用 `s04-test-bridge`（桥数据）与 `s04-test\work*`（工作目录）；不碰日常默认桥（有其他项目在用、有待收）、协调目录、日常插件安装、缓存、marketplace、共享配置。
- hooks 只写入 `workCodex\.codex\hooks.json`（测试项目内）；`crossSessionInbound` 等接收策略沿用用户级设置（当前机器已核对为 `accept`，用户自管，本产品不代改——按 SMOKE 规则记录此事实）。
- 保留用户模型与 provider 设置；不复制、不伪造 hook 信任；不绕过任何授权。

## 1. 搭建

```powershell
node --test "scrum/sprint-04-multi-claude-sessions/prototype/test/*.test.mjs"   # 前置应 13/13（含 SM 复审回归 T11-T13）
powershell -File "scrum/sprint-04-multi-claude-sessions/prototype/harness/Set-Up-TestEnv.ps1"
```

## 2. 启动三个原始测试会话（Start-TestSessions.ps1）

一个启动入口完成全部动作（SM 7690b372 要求：可检视、自动传递初始提示、不劳 PO 粘贴/复制）：

```powershell
powershell -File "...\prototype\harness\Start-TestSessions.ps1"            # 干跑：只生成启动文件
powershell -File "...\prototype\harness\Start-TestSessions.ps1" -Launch    # 真启动
```

- **Claude A/B**：脚本在自身一次性进程内先 `Remove-Item Env:\CODEX_THREAD_ID / Env:\CLAUDE_CODE_SESSION_ID` 再 `claude --bg --name s04-claude-a|b <待命提示>`——子进程拿不到继承身份，自建原会话身份；父（本 Developer）会话身份不动。保留用户模型与 provider 配置。
- **测试 Codex**：独立 `CODEX_HOME=s04-test\codex-home`（隔离已装插件、信任与状态，杜绝日常插件参与）；日常 `config.toml` 仅作设置复制（无凭据、无信任态，可用 `-SkipDailyConfigCopy` 关掉）；`CTC_BRIDGE_DIR` 指测试桥。初始提示由脚本写入 `_initial-prompt.txt`，`_launch-codex.ps1` 读入后作为 `codex <prompt>` 启动——自登记 thread-id.txt、自查 sessions、自动 connect A/B、结果落 connect-log.txt。
- **登录**：~~隔离 CODEX_HOME 无凭据~~ 已按 SM e1f9350c 撤回——认证随 provider 表内嵌（`requires_openai_auth=false` + bearer token）。实测：`codex doctor` 报 `auth.credentials: ok`（OpenAI auth 不需要），隔离 home 下 `codex exec` 真实调用返回正常。**无需 PO 登录**；若后续真实认证失败再报具体原因。
- **配置提取**：不整份复制日常 config（它会带入 hooks/插件/marketplace/MCP/项目与信任态，且含认证字段）。`extract_model_config.py` 用真 TOML 解析（tomllib 读、toml 写，SM f0dc8475 指正后替换逐行正则版）：仅顶层模型参数（model、model_provider、reasoning effort、上下文窗口等）+ 引用的 `[model_providers.<provider>]` 表（bearer token 只落在隔离 home 的临时配置里，不打印、不进 Git）；写出后重解析校验值未变、排除节未回流。`approval_policy` 与 `sandbox_mode` 按用户日常值带入以保持会话行为一致——如 SM 认为不该带可去掉改用默认。
- **加载核查**（已做并存档 `s04-test\evidence\codex-doctor.json`）：`overallStatus ok`；auth/config/mcp 各项 ok；MCP 为空；路径全部指向 `s04-test\codex-home`。真启动后窗口内再存一份运行时 doctor。
- **唯一预期 PO 触点**：测试窗口内 Codex 首次要求信任三条原型 hook（`node "<worktree>\...\prototype\bridge\cli.mjs" hook`）。`--dangerously-bypass-hook-trust` 旗标存在但按"不绕过授权"边界**刻意不用**。

## 3. 建立两个配对（已并入初始提示，自动执行）

初始提示让测试 Codex 自己跑 `sessions` + `connect --name s04-claude-a/b`，输出全量落 `connect-log.txt`。Developer 在外部核对：thread-id.txt 存在、connect-log 两条 pairId、`status` 列两配对、B 连接后 A 完好（S04-11-1 实测起点）。此后对测试 Codex 的指令一律走 `codex queue --thread <thread-id> --message ...`，保持同一原始会话。

## 4. 首个检查点场景

按 S04-11 验收与 SM 指定顺序实测，每步记录时间窗：

1. **基础往返**：Codex `send --name s04-claude-a` 业务问题 → A 原会话收到完整正文 → A `reply` → 测试 Codex 原会话收到回复（S04-11-4 前半）。
2. **切换与旧消息归属**：`send --name s04-claude-b` → B 回复 → 再 reply A 的旧消息 → 归属仍 A（S04-11-3 实测）。
3. **重叠来信**：让 A、B 相近时间各自 reply（提示词要求"收到后即回"），观察接纳/等待/拒绝的实际表现与注入顺序；核对无覆盖、无串目标、无重复注入（S04-11-5 实测）。
4. **空闲唤醒**：A/B 空闲时来信应触发下一次模型调用（队列唤醒→hook 注入），不需要 PO 再输入消息推动（S03-09-4 同规则在多目标下复验）。

## 5. 证据采集（分层，不混判）

| 层 | 来源 |
|---|---|
| fixture | `node --test`（已过） |
| 宿主加载 | 测试 Codex 窗口内 hook 信任确认、`workCodex\.codex\hooks.json` 内容 |
| 实际执行 | `s04-test-bridge\events.jsonl`、`wire\*.send.json`、`pending\`、`receipts\`、`claims\` |
| 原会话收信 | A/B：`claude logs <id>`（或 attach 查看）；测试 Codex：其会话内对话记录；逐条核对完整正文 + messageId/pairId/conversationId/replyTo + 时间窗 |
| 对照 | 另一目标同时间窗无该消息入站事件（误投检查） |

`submitted:true` / `context-prepared` 单独不算收信；PO 不手写标记、ID、环境变量。

## 6. 收尾

- `claude stop <idA>/<idB>`（或 `claude rm`，证据已落盘后）；关闭测试 Codex 窗口（exit）。
- `s04-test-bridge` 与 `s04-test\*` 保留至 SM/PO 检视后再清理；清理动作单独记录。
- 日常安装与在用桥全程未动（自查 + SM 复核）。

## 7. 已知风险与未定项

- Codex 0.154.0 / Claude Code 2.1.268 的宿主行为以实测为准（SM 只读核对值）；若 hook 信任流程与预期不符，按实际记录并报 SM。
- 测试 Codex 会话的 thread id 依赖其自报（thread-id.txt）；若不可行，改用 `codex agents`/会话列表核对，不猜。
- worktree 路径随会话存续；最终整合阶段产品路径会替换（S04-11-8）。
