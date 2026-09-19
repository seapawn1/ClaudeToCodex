# W1 切片结果：统一 Node 传输层 + Windows 管道客户端探针（Sprint 08）

- 日期：2026-09-18。执行：Developer。
- 交付物：`bridge/delivery/transport.mjs`（D-A 统一传输层）＋ `bridge/cli.mjs` send 路径接线（PowerShell 客户端退役，投递改进程内调用）＋ `bridge/test/transport.test.mjs`（五点等价性单测）。
- 证据：本目录 `w1-server-evidence.json`（Windows 侧 fixture 服务端原始字节与到达时间）、`w1-client-evidence.json`（Windows 侧真实 transport 客户端运行结果与 wire 记录）、`w1-probe-server.mjs` / `w1-probe-client.mjs`（探针脚本，可复跑）。

## 硬退出判据：Windows 命名管道客户端探针 — **PASS**

HOW §4 W1 的回滚决断点未触发。执行方式：Windows 侧 node（v24.14.0，win32）直接运行，经 `\\wsl.localhost` UNC cwd 映射 import **工作树真实模块**（零拷贝零漂移）：

| 观察项 | 结果 | 证据 |
|---|---|---|
| net.connect 连命名管道（此前唯一零证据格子） | **PASS** | 客户端连 `\\.\pipe\ctc-w1-probe-01` 成功，服务端 LISTENING 后完成往返 |
| auth→500ms→帧时序＋LF 换行 | **PASS** | `gapMs: 501`；raw 字节仅 `\n` 分帧、无 `\r`、无 BOM |
| 帧字段与 S03 语义 | **PASS** | `msgV:1`、`msg_id` 两侧一致（065a168d-…）、`type:'user'`、`priority:'next'`、`session_id`、完整 content（UTF-8 中文原样，JSON 值层等价） |
| wire 记录契约（②③） | **PASS** | `pipeWrite:'completed'`（写回调＋end/close 之后）、`receipt:'unverified'`、parity 字段齐全、时间自洽（953→520ms） |
| 无秘密落盘 | **PASS** | 记录与服务端字节均不含 DPAPI blob；tokenLoader 用明示非秘密 fixture 值 |

## D-A 五点等价性单测（Linux）— 8/8 PASS，0 skip

`bridge/test/transport.test.mjs`：① 时序/字节（含 gap≥450ms 实测）② token 失败时 not-completed 记录先于任何网络 I/O 落盘 ③ completed 仅在写回调＋end/close 后 ④ budget 看门狗（真实服务端）⑤ ENOENT/ECONNREFUSED/EPIPE/满 backlog 各自如实分类、零重试、错误与 unverified 不可区分＋端点/参数校验。

全量套件对照基线：87→95 tests，80 pass（+8）/10 fail（不变，均为 W5 移植范围的既有 powershell/路径 fixture 项）/5 skip（不变）——零新增回归。

## 实证发现与偏差声明

1. **Linux UDS connect 语义（修正测试设计）**：`listen(1)` 实际容纳 2 个排队连接（实测），第 3 个经 libuv 呈现 **EAGAIN 错误**而非挂起——内核级 connect 挂起在本机不可稳定制造。⑥ 号测试改为确定性 EAGAIN 分类测试（注释内记录依据）。
2. **connect 超时定时器的阻塞路径证明缺口**：Linux 如上不可达；Windows 需"创建管道实例但不 ConnectNamedPipe"的原生服务端（PowerShell 可做，但本工作树会话的 guard 钩子拒绝 powershell.exe/cmd.exe interop）。现状：定时器代码在位、budget 看门狗已真实覆盖、"connect 超时消息文案"经代码路径静态可核；阻塞路径留待 W10 Windows 回归补证（届时由 Operator 在 Windows 侧直接执行，不经 interop）。此为记录在案的证明缺口，非探针失败（探针判据＝连接/写帧/认证，全过）。
   - **口径修正（SM F-4）**：W1 Windows 探针只覆盖**健康服务端**上的连接/写帧/认证，**不含**阻塞服务端变体；阻塞路径的实证属 W10（transport.test 相关注释已同步修正）。原文"届时补证"表述保留，但不得引用 W1 探针作为阻塞路径证据。
3. **interop 途径**：powershell.exe/cmd.exe 被会话 guard 拒绝；`node.exe`（Windows PATH 残留）直调可用，UNC cwd 映射使 Windows 侧 node 可直接 import 工作树模块——W10 Windows 侧执行可复用此途径。

## 对后续切片的输入

- transport 已留 `tokenLoader` 注入缝：生产路径＝`resolveEndpointToken`（win32＝DPAPI 内联解包，已实现；posix＝W2 的按 sessionId 现读 .key，现为显式"未交付"错误）。
- Windows DPAPI 内联调用三处中的 send 侧解包已就位（connect 侧 wrap 在 cli.mjs 既有，register 侧 W3）。
