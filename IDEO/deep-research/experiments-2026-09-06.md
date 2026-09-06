# 跨工具消息实验记录 — 2026-09-06

- **环境**：Windows 10 Pro 19045；Codex CLI 0.153.4（npm）；Claude Code 2.1.263；Node 24.14.0；仓库 `D:\ClaudeToCodex`（分支 design-sprint）。
- **执行者**：Claude Code 后台研究会话（Developer 角色）。
- **用途**：供 PO 与 Codex（Scrum Master）复核与复跑。原始输出在研究会话临时目录，未入库；本文件为完整可复现记录。
- **安全说明**：文中管道哈希与令牌已泛化（`<hash>`/`<token>`）；真实值仅存在于各自会话运行期环境变量，勿落盘明文（原型实现时注意文件权限）。

## E-B：codex exec headless 建会话 ✅

- 前置：无（现有 config.toml 自定义 provider 即可）。
- 命令：
  ```powershell
  codex exec -c model_reasoning_effort="low" --json -o <last.txt> "Reply with exactly PONG and nothing else."
  ```
- 预期：建立 thread 并回复 PONG。
- 实际：EXIT=0，回复 `PONG`；`thread.started` 事件给出 thread id（本实验：`01a0751e-9c3b-…`，已归档清理）。
- 局限：首次尝试因推理网关过载失败（"Our servers are currently overloaded"，重连 5 次后 turn.failed）；重试成功。耗时约数十秒（low effort）。

## E-C：codex queue 延迟消费语义 ✅

- 前置：E-B 的已退出会话。
- 步骤：
  ```powershell
  codex queue --thread <UUID> --message "RESEARCH-PROBE-7f3a: This is a queued test message... Do not act on it."
  # 输出：Queued message <队列条目UUID> for thread <线程UUID>.（队列条目有独立 UUID）
  codex exec resume -c model_reasoning_effort="low" -o <last.txt> <UUID> "Report exactly: (1) how many user messages received, (2) quote any message containing RESEARCH-PROBE verbatim."
  ```
- 实际：会话**逐字引用**排队消息原文（"RESEARCH-PROBE-7f3a: …"），EXIT=0。
- 结论：queue → 持久化 → resume 消费链路完整；`codex exec resume` 恢复**同一线程**（非分叉）。
- 未验证：运行中 TUI 的实时消费（源码见 openai/codex@6af3454：同进程实时 / 跨进程 `watch_external_messages` 每 10s 轮询 sqlite）。

## E-D：Claude 后台会话与外部消息注入（6 步全部成功）✅

| 步骤 | 命令/操作 | 结果 |
|---|---|---|
| D1 启动 | `claude --bg -n "ed-relay-test" "<任务：回 READY 并等待>"` | 输出 `backgrounded · cb2f25d7`；注意 `--bg` 与 `-p` 互斥 |
| D2 注册表 | `claude agents --json` | 列出 pid/短id/**完整 sessionId**/kind/status(busy|idle)/state/name——外部进程可见的实时会话注册表；`claude logs <短id>` 返回 TUI 快照（含 ANSI） |
| D3 运行中 resume | `claude --resume <完整sessionId> --bg "<探针>"` | **分叉副本**：stderr 明示 "session cb2f25d7 is already running… started a copy as d9b362e0"；原会话不受影响 |
| D4 副本上下文 | 查 d9b362e0 日志 | 正确答出原会话首词 READY 并回 PONG2——完整继承历史 |
| D5 SendMessage 实时注入 | （会话内工具）ListAgents → SendMessage(to: ed-relay-test) | 原会话转 busy 并回应 LIVE-PONG——**消息实时进入运行中会话** |
| D6 一次性桥 | `claude -p "Use the SendMessage tool to send exactly this text to the session named 'ed-relay-test': BRIDGE-PROBE-c31f … Then reply with exactly SENT."` | 输出 SENT；原会话日志出现探针——**任何有 shell 的进程一条命令即可触达运行中会话** |

## E-F：codex mcp-server（stdio）探测 ✅（已弃用警告）

- 方法：预写 MCP `initialize`+`notifications/initialized`+`tools/list` 三行 JSON 经 stdin 重定向启动，10s 后读 stdout。
- 结果（serverInfo `codex-mcp-server` v0.153.4）：
  - 工具 `codex`：起会话；参数 prompt(必填)/model/sandbox/approval-policy/cwd/config 覆盖/base-instructions/developer-instructions；输出 {threadId, content}。
  - 工具 `codex-reply`：threadId（旧名 conversationId 弃用）+ prompt(必填) 续轮；输出 {threadId, content}。
- **stderr：`codex mcp-server` is deprecated and will be removed in a future release.**（HEAD 已于 2026-09-05 删除；0.153.4 过渡期可用）

## E-G：claude mcp serve（Claude Code 作为 MCP server）探测 ✅

- 方法：同 E-F。
- 结果（serverInfo `claude/tengu` v2.1.263）：正常握手；tools 至少暴露 `Agent`（别名 Task；委托子代理，支持后台运行+完成通知）。完整工具清单未取全。
- 含义：Codex 可在 config.toml `[mcp_servers.claude]` 接入，反向委派工作（对称于 E-F）。语义区分：MCP 桥=委派新实例；queue/SendMessage/管道=触达既有会话。

## E-H：inbox 命名管道原始帧直投运行中会话 ✅✅（最强结果）

- 依据：官方文档 cross-session-messaging#the-sessions-inbox-socket（明确供 script/hook 投递；Windows=named pipe、v2.1.234+、首行 auth 必需）；消息帧格式仅社区逆向（PeterSR/ccsock，基于 v2.1.233，当时 Windows 尚无此功能）。
- 步骤：
  1. 管道地址与令牌获取：Claude 会话的 env 含 `CLAUDE_CODE_MESSAGING_SOCKET`（形如 `\\.\pipe\LOCAL\cc-msg-<hash>`）与 `CLAUDE_CODE_MESSAGING_TOKEN`（32 hex）——**该会话的 shell 子进程与 hooks 均可读到**（实验中由会话自身命令落盘证实；正式方案应改用 SessionStart hook）。
  2. 投递（PowerShell 5.1）：
     ```powershell
     $p = New-Object System.IO.Pipes.NamedPipeClientStream('.','LOCAL\cc-msg-<hash>',[System.IO.Pipes.PipeDirection]::InOut)
     $p.Connect(5000)
     $sw = New-Object System.IO.StreamWriter($p); $sw.AutoFlush=$true; $sw.NewLine="`n"
     $sw.WriteLine('{"type":"auth","token":"<token>"}')
     Start-Sleep -Milliseconds 500
     $sw.WriteLine('{"msgV":1,"msg_id":"<uuid>","type":"user","message":{"role":"user","content":"<正文>"},"priority":"now","session_id":"<目标会话UUID>"}')
     ```
- 实际结果：**消息在目标会话（正处回合中）于工具调用间隙被投递，作为 peer 消息进入其上下文**——收信+入上下文全链路成立。4 秒内无同步回执行（文档称回执走回调连接）。
- 结论：外部进程直投运行中 Claude 会话在 Windows 原生 + 2.1.263 被证实；社区帧格式有效。
- 局限/待复验：①本例 token 认证后 bypassPermissions 会话直接送达（未触发文档所述"非 own-child 应 hold"），hold 边界待专门复验；②连接后 30 秒内须发完整行；③每会话管道独立，多目标需各自落盘信息。

## 负面/限制发现汇总

1. `codex app-server daemon`（start/stop/bootstrap/version）Windows 报错："lifecycle is only supported on Unix platforms"。
2. 本机 Claude 无 `--channels` flag（Channels 研究预览未灰度至此）。
3. 推理网关在 ~9-10 并发流时过载（7 研究agent+2 嵌套CLI 同时 503）；串行/分波后恢复。
4. `claude agents`（非 --json）等 TUI 命令需交互终端。
5. `claude --resume` 对运行中会话=分叉副本（`--bg` 路径明确提示；双终端裸 resume 则两进程交错写同一转录，官方文档明示）。

## 清理记录

- 测试 Claude 会话（ed-relay-test、副本、e-h-pipe-test）均已 `claude stop`；Codex 测试线程已 `codex archive`。
