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
node --test "scrum/sprint-04-multi-claude-sessions/prototype/test/*.test.mjs"   # 前置应 10/10
powershell -File "scrum/sprint-04-multi-claude-sessions/prototype/harness/Set-Up-TestEnv.ps1"
```

## 2. 启动三个原始测试会话

### 2.1 测试 Codex（专用 TUI 窗口）

```powershell
$env:CTC_BRIDGE_DIR = "$env:LOCALAPPDATA\ClaudeToCodex\s04-test-bridge"
Start-Process powershell -WorkingDirectory "$env:LOCALAPPDATA\ClaudeToCodex\s04-test\workCodex" -ArgumentList '-NoExit','-Command','codex'
```

初始提示词（贴入该窗口）：

> 你是 Sprint 04 专用测试 Codex 会话，仅用于桥接多配对验证，不做其他工作。请先执行：
> `Set-Content -Path .\thread-id.txt -Value $env:CODEX_THREAD_ID`
> 然后等待后续指令。

- **预期 PO 触点**：首个 hook 事件触发时，Codex 会要求信任 hook 定义（`node "<worktree>\...\prototype\bridge\cli.mjs" hook` 三条）。这是宿主信任机制，不可代点、不可预置——已备具体入口（测试窗口内 /hooks 或提示处确认）报 SM 转 PO。
- 之后的指令经 `codex queue --thread <thread-id.txt 内容> --message ...` 下发，保持同一原始会话。

### 2.2 Claude A / B（后台会话）

```powershell
# A（B 同理，换 s04-claude-b 与 workB）；先清继承身份，保留模型/provider 配置
$child = @{ CODEX_THREAD_ID = $null; CLAUDE_CODE_SESSION_ID = $null }
Push-Location "$env:LOCALAPPDATA\ClaudeToCodex\s04-test\workA"
claude --bg --name s04-claude-a "你是 Sprint 04 测试会话 A（s04-claude-a），仅用于桥接验证。收到跨会话桥消息后按其内嵌指引用 reply 回复；不要主动发确认或无关消息。等待即可。"
Pop-Location
```

- 身份核对：`node "<prototype cli>" sessions --sessions-dir $env:USERPROFILE\.claude\sessions` 应列出 s04-claude-a / b（注册表全局，但名称唯一、按名选用，不触碰其他会话记录）。

## 3. 建立两个配对（在测试 Codex 会话内执行）

经 queue 下发给测试 Codex：

> 运行 `node "<prototype cli>" connect --name s04-claude-a`，再运行 `node "<prototype cli>" connect --name s04-claude-b`，把两条输出的 pairId 报给我。

- 预期：两配对共存（`status` 列出两条）；连接 B 不拆 A（S04-11-1 实测起点）。

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
