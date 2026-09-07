# 原型实验

组合原型初版已组装，使用与启用步骤见 [Bridge](Bridge.md)。当前显式重配对到新 Designer 原会话后，已完成统一接口连续对话、已消费唤醒重放检查，以及双向工具边界收信；Stop 接续等生成末尾状态仍在验证范围内。旧 Designer 因外部网关 502/503 与 daemon 回收断开，旧配对数据保留。

以下保留前期探针：P01 空闲 queue 收信、P03 同步 Hook 注入、P04 外部文件经 Hook 注入已通过单项实验；P02 确认 queue 单独使用未满足工具后的接收边界，P05 完成含一次 PO 批准的真实往返。

## P01：Codex 空闲时能否被 queue 唤起

目的：向一个已运行、正在等待输入的 Codex 原会话发送消息，观察它能否自动开始回应。暂由普通脚本代替 Claude 发信，手动指定会话 ID；这是通道实验，不代表 T02 双向测试已通过。

1. 核对接收会话 ID，等待它正常完成当前回复、回到等待输入状态。保持会话运行。
2. 在另一个 PowerShell 终端运行下方命令，替换会话 ID。脚本继承当前用户的 Codex 配置；发送端须与接收端使用同一 Codex 数据目录。
3. 观察接收会话 60 秒，不向它输入提示、不按 Esc、不手动启动队列、不恢复或分叉会话。60 秒是本次观察窗口，不是产品延迟要求。
4. 若会话自动输出 `P01-RECEIVED` 和本次独特标记，记录是否自动开始回应及大致时间。若没有回应，记录现象，再检查原因。

```powershell
& .\IDEO\cross-session-agent-messaging\prototype\Send-CodexProbe.ps1 -ThreadId '<接收会话 UUID>'
```

`-DryRun` 只检查命令入口和参数，不发信。实际发送时才生成独特标记，投递记录写入用户临时目录的 `cross-session-agent-messaging/probes/`。脚本输出的“队列接受消息”不等于原会话已收信。

取证：保留投递 JSON、原会话收信前后的事件记录以及 PO 对空闲状态和无人输入期间的观察。不要把含消息标记的投递记录或终端输出粘贴给接收会话后，再将它的回应当作通道成功。会话源码推断、发送命令成功或恢复会话后读到消息均不足以判定本实验通过。

P01 已于 2026-09-06 在当前 Codex 原会话中通过；实际时序、证据及适用范围见 [TestResults](../test/TestResults.md)。忙碌接收和真实双向往返尚待验证。

## P02：工具执行期间，queue 在哪里交付消息

目的：观察消息在工具执行期间进入 queue 后，是在工具结束后的首次模型调用中进入上下文，还是等整个工作回合结束才交付。先测 queue 本身，暂不安装 Hook；实际消息仍由脚本生成，PO 不需要手动抓住投递时机。

### PO 操作

1. 在另一个 PowerShell 终端运行下方命令。看到 `WAITING_FOR_BUSY_WINDOW` 后，在原 Codex 会话发送“开始忙碌测试”。
2. 此后保持两个终端运行，观察 Codex 的检查点、本轮工作结束，以及可能随后出现的独立收信回复。不要输入其他内容、按 Esc、手动操作队列或粘贴消息标记。
3. 工作结束后继续观察 60 秒，再告诉 Codex 看到的顺序。若发信脚本报错，记录错误；没有实际投递到忙碌窗口，不能判定该状态通过或失败。

```powershell
& .\IDEO\cross-session-agent-messaging\prototype\Send-CodexProbe.ps1 -ThreadId '<接收会话 UUID>' -DuringTool
```

脚本最多等待 3 分钟，只接受启动等待之后、属于指定会话的新忙碌窗口；看到窗口后等待 2 秒再发信。超时即退出，不发消息。每次重试都要先重新启动发送脚本，再让 Codex 开始新的忙碌测试。

### Codex 执行约定

接到“开始忙碌测试”后：

1. 在当前原会话内调用 `Invoke-CodexBusyWindow.ps1 -ThreadId <当前会话 UUID>`，默认运行 20 秒。该工具只发布起止时间，不读取消息正文。将 `exec_command` 的 `yield_time_ms` 设为 `30000`，等待工具完整返回；避免中途轮询增加不必要的模型调用。
2. 工具返回后的首次模型续接，先输出一条 commentary：`P02-CHECKPOINT: <上下文中实际收到的 P02 标记>`；没有则输出 `P02-CHECKPOINT: NONE`。不得为获得标记而读取投递文件、队列或会话日志。
3. 再执行一个短工具动作 `Get-Date -Format o`，然后以 `P02-WORK-DONE` 标识本轮工作正常结束。检查点时原任务尚未结束，以便与回合末交付区分。
4. 若消息随后另开回合到达，按其要求只回复 `P02-RECEIVED <标记>`。等 PO 反馈观察后，再核对投递与会话日志，避免取证动作提前泄露正文。

### 判定依据

以同一会话的实际工具起止、queue 投递记录、消息输入事件、检查点及回合结束事件共同判断。先确认投递确实发生在工具窗口内；窗口未捕捉到记为无法判定。检查点的模型自述只能作辅助证据，不能单独证明正文进入时机。

若消息仅在 `P02-WORK-DONE` 后的新回合成为输入，说明此次 queue 单独使用不符合工具结束后的首次调用接收要求，后续再用 Hook 补足并复测。若缺少判断调用边界所需的证据，则记为无法判定。该实验不代替 T04 两个真实会话的完整测试。

P02 已于 2026-09-06 执行：投递确实位于工具执行窗口内，消息直到原工作回合结束才成为新回合输入，未通过忙碌接收判据。实际时序及证据见 [TestResults](../test/TestResults.md)；本次 P02 未安装 Hook，后续验证见下方 P03。

## P03：Hook 的正文能否进入工具后的首次思考

目的：先单独验证同步 `PostToolUse` 的 `additionalContext` 是否进入原会话的首次续接。为简化原型，消息由 Hook 执行时随机生成，暂不接外部发信脚本、收件箱或 queue。因此本实验即使通过，也不代表工作中实际来信的接收已验证。

### 准备与 PO 操作

项目配置在 [hooks.json](../../../.codex/hooks.json)，处理脚本为 [PostToolProbe.mjs](PostToolProbe.mjs)。P03 分支只对 `Invoke-CodexHookProbe.ps1 -RunP03` 这类明确的测试调用生成上下文；P04 的外部消息分支见下节。普通命令只留下事件与匹配条件的诊断记录，无测试消息。配置暂用本机绝对路径，未改变全局权限设置。

1. 在当前 Codex CLI 输入 `/hooks`，找到本项目 `PostToolUse` 下指向 `PostToolProbe.mjs` 的命令，审阅并信任它。若列表中没有这条 Hook，先报告界面情况，暂不开始测试或另开副本会话。
2. 信任后，在当前会话发送“开始 Hook 测试”。这次无需在另一个终端运行发信脚本。
3. 观察工具结束后的 `P03-CHECKPOINT` 是否直接出现新标记；随后 Codex 会完成一个短动作，并以 `P03-WORK-DONE` 结束本轮。不要从日志中抄入标记。

该界面操作来自 [Codex 官方 Hook 规则](https://learn.chatgpt.com/docs/hooks#review-and-trust-hooks)：非托管 Hook 的具体定义必须先审阅并信任，新 Hook 在此之前会被跳过。项目已受信任与单条 Hook 已受信任是不同条件。

### Codex 执行约定

1. 收到“开始 Hook 测试”后，在原会话运行 `& ./IDEO/cross-session-agent-messaging/prototype/Invoke-CodexHookProbe.ps1 -RunP03`。该工具仅运行约 2 秒并返回起止时间，不生成或读取消息标记。
2. 工具返回后的首次续接，先用 commentary 报告 `P03-CHECKPOINT: <实际收到的标记>`；若无则报告 `P03-CHECKPOINT: NONE`。在此之前不得读取 Hook 记录、会话日志，或自行调用 Hook 脚本来获取标记。
3. 再执行 `Get-Date -Format o`，最后输出 `P03-WORK-DONE`。等 PO 反馈后再核对 Hook 输出、工具事件与续接顺序。

### 取证与限制

Hook 在执行时新生成标记，将对应会话、回合、工具调用 ID、时间及输出 JSON 记录到 `%TEMP%/cross-session-agent-messaging/probes/P03-<随机标记>.json`。它只返回 `hookSpecificOutput.additionalContext`，不阻断工具、不要求重试，也不触发 queue。

将 Hook 执行事件、工具完成事件、输出正文与首次续接的标记对应起来，才能判断是否通过。模拟输入的本地测试只检验脚本筛选和 JSON 输出，不能证明 Codex 加载了 Hook 或模型获得了正文。缺少关键时序证据记为无法判定。

本地检查：`node --test IDEO/cross-session-agent-messaging/test/PostToolProbe.test.mjs`。实验后可通过 `/hooks` 禁用这条 Hook；不要通过放宽全局权限或跳过 Hook 信任来完成实验。

### 诊断与重载对照结果

早期两次现场测试和一次诊断复测均未见标记，也未找到 Hook 实际执行证据，保留为无法判定。官方 `hooks/list` 随后确认当前定义被识别、启用且受信任，无需重复信任同一定义。

本次对照先正常退出 CLI，再执行以下命令恢复同一线程，重新加载实验配置后发起测试。恢复只是实验准备，不把恢复动作视为消息送达。

```powershell
codex resume 01a074a1-bf49-72f2-9337-194555aa49f6
```

重载后 P03 已通过：Hook 入口记录、完整正文的上下文事件、首次续接的正确标记和后续短动作能逐项对应。详见 [TestResults](../test/TestResults.md)。现已生效的同一定义不要求每次测试重启；本次对照也不推导所有 Hook 修改都必须重启。

诊断入口记录位于 `%TEMP%/cross-session-agent-messaging/probes/P03-hook-invocations.jsonl`。后续若缺少标记，先区分是否有脚本调用记录、匹配条件是否满足，以及正文是否加入上下文；首次检查点之前仍不读取消息记录。下一步将合成正文换成外部发来的正文，再验证与 queue 的配合。

## P04：外部来信经 Hook 进入工作中的会话

目的：把 P03 中由 Hook 生成的正文，换成外部脚本在工具执行期间写入的正文。用一个临时 JSON 文件暂代收件箱；不安装数据库，不做自动配对，不调用 queue。本轮仍是定向原型实验，只有 P04 指定工作工具完成时才读取该文件。

### PO 操作

1. 在另一 PowerShell 终端运行下方命令。看到 `WAITING_FOR_BUSY_WINDOW` 且显示 `sender=P04, route=file + Hook` 后，回到原 Codex 会话发送“开始外部来信测试”。
2. 保持两个终端运行，不输入其他内容、不按 Esc、不粘贴外部终端的消息标记。脚本看到新的 P04 工具窗口后等待 2 秒，生成正文并发布临时收信文件。
3. 观察 `P04-CHECKPOINT` 是否包含新标记，以及之后能否正常出现 `P04-WORK-DONE`。工作结束后反馈观察；脚本若报错，保留错误提示。因为本轮没有 queue，不预期在工作结束后另起一轮自动收信。

```powershell
& .\IDEO\cross-session-agent-messaging\prototype\Send-CodexProbe.ps1 -ThreadId '<接收会话 UUID>' -ViaHook
```

`-ViaHook` 自动启用等待工具窗口，默认最多等待 3 分钟；`-DryRun` 不等待、不写信。P02 使用 `-DuringTool`，走 queue；P04 使用 `-ViaHook`，走文件与已有 Hook。两端实验编号不同会直接报错、不发送。沿用已生效的 Hook 定义，不需要为这次重测重新信任或重启。

### Codex 执行约定

1. 收到“开始外部来信测试”后，在当前原会话执行 `& ./IDEO/cross-session-agent-messaging/prototype/Invoke-CodexBusyWindow.ps1 -ThreadId <当前 UUID> -RunP04`，默认运行 20 秒。`exec_command` 的 `yield_time_ms` 使用 `30000`，等待工具完整结束；该工具只记录时间，不读取来信。
2. 工具返回后的首次续接，先输出 commentary：`P04-CHECKPOINT: <实际收到的新标记>`；没有则输出 `P04-CHECKPOINT: NONE`。不得自行读取收件箱、发送记录或 Hook 日志来获得标记。
3. 再执行 `Get-Date -Format o`，最后输出 `P04-WORK-DONE`。等 PO 反馈后再核对证据。

### 临时收信与判据

运行文件均位于 `%TEMP%/cross-session-agent-messaging/probes/`。外部脚本先写完整文件，再原子发布为 `P04-inbox-<会话 UUID>.json`；存在旧待收消息时拒绝覆盖。Hook 校验接收会话与已完成的工作窗口，读取整段正文，再将原文件移为 `P04-<标记>.consumed.json`。后续调用没有待收文件就不注入；读取失败或不匹配会报错并保留证据。

发送记录为 `P04-<标记>.json`，Hook 注入记录为 `P04-<标记>-hook.json`；入口诊断沿用 `P03-hook-invocations.jsonl`，其中增加 `matchesP04`。文件发布、Hook 消费和模型实际获知分开判断。

通过需要：文件确实在工具窗口内发布，Hook 在对应工具完成后将外部正文加入原会话的首次续接，检查点出现对应标记，原工作正常继续。仅写文件成功或脚本本地测试通过不足以判定。错过窗口或缺少关键事件记为无法判定。本轮不验证空闲唤起、queue 与 Hook 的重复唤醒处理、生成末尾收信或 Claude 方向。

首轮实际使用了 P02 发送模式，未发布 P04 文件；Hook 正常执行但没有正文可读。该次保留为通道错配、无法判定，发送模式检查已修正。证据见 TestResults。

2026-09-07 重跑 P04 已通过：外部正文在工具执行期间发布，由 Hook 加入工具后的首次续接，原工作继续完成；已消费文件与发送记录一致。详见 TestResults。当前仍未将 queue 与这一分支同时接入。

## P05：Codex 与选定 Claude 会话的一问一答

本次选定 PO 指定的 Designer 原会话 `de6f62ab-7c48-4787-8d2a-73944478e05e`。先让它接收 Codex 的短消息，再由它通过脚本回复到 Codex 原线程；不用另一 Claude 实例代答。本轮只验证首次往返，后续再覆盖连续追问及双方的接收状态。

### 会话登记

在选定的 Claude 会话中，请它通过自己的工具执行：

```powershell
powershell.exe -NoProfile -File "D:\ClaudeToCodex\IDEO\cross-session-agent-messaging\prototype\Register-ClaudeEndpoint.ps1"
```

脚本读取该会话自动导出的 `CLAUDE_CODE_SESSION_ID`、`CLAUDE_CODE_MESSAGING_SOCKET` 和 `CLAUDE_CODE_MESSAGING_TOKEN`，以 Windows 当前用户范围的 DPAPI 保护令牌，写入 `%TEMP%/cross-session-agent-messaging/claude-<会话 UUID>.json`。输出仅有会话 ID、文件位置及状态，不输出令牌，不发测试消息。保持该原会话运行，并让它知道接下来的 P05 是一次通信测试，可以按消息中的命令回复一次。

### Codex 发信与观察

登记完成并核对 UUID 后，Codex 使用选定端点文件调用：

```powershell
& .\IDEO\cross-session-agent-messaging\prototype\Send-ClaudeProbe.ps1 -EndpointPath '<端点文件路径>' -ReplyThreadId '01a074a1-bf49-72f2-9337-194555aa49f6'
```

脚本采用研究 E-H 的本机管道帧，发送包含独特标记的短消息和一条 `Reply-CodexProbe.ps1` 回信命令。Claude 应在自己的原会话执行该命令，使用实际的 Claude 会话 ID 回信；Codex 收到后只回复 `P05-ACK <标记>`，结束本次测试，避免形成自动循环。

发信前确认所选 Claude 会话仍在运行并记录其状态。发信后 Codex 正常结束当前回合，PO 观察两个窗口，暂不转贴测试正文；以 60 秒作为初次观察窗口。若出现接收审批、错误或超时，记录实际现象，按正常权限规则处理，不改变全局入站设置。

发送、回信记录分别为 `%TEMP%/cross-session-agent-messaging/probes/P05-<标记>-send.json` 和 `P05-<标记>-reply.json`。结合双方原会话的输入、工具执行与回应事件，确认是谁收到、谁回复；仅管道写入或 queue 成功均不足以通过。

本地检查：`node --test IDEO/cross-session-agent-messaging/test/ClaudePipeProbe.test.mjs`。此准备沿用 [Claude 官方跨会话文档](https://code.claude.com/docs/en/cross-session-messaging) 的环境变量与认证说明；原始消息帧仍是需要现场验证的版本适配部分。

本次已通过 `claude agents --json` 定位 PO 选定的 Designer，并核对其本机登记、PID 与进程启动时间，直接准备了加密端点文件，省去一次手动导出。上述自行登记脚本仍可用于后续目标会话。

P05 已完成首次真实往返，但包含一次 PO 接收批准：Claude 先因发送方未声明权限模式而暂存消息，PO 批准后才向模型放行；随后 Designer 执行回信，Codex 收到并确认。消息到 ACK 约 4 分 8 秒，含约 2 分 23 秒的暂存等待，不能视为传输延迟或无人审批接收通过。证据见 TestResults。

PO 已决定本轮暂时保留现有审批，是否调整原生接收设置以后再决定；不制作自动批准机制。后续测试按现有规则由 PO 放行需要批准的消息，分别记录到达、放行与获知，不用转贴正文。继续制作组合收信入口与连续对话原型，不以修改 Claude 设置为前置条件。
