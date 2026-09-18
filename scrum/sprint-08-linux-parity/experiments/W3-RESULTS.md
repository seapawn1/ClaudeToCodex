# W3 切片结果：queue 直调 + register Node 化 + delivery .ps1 退役（Sprint 08）

- 日期：2026-09-18。执行：Developer。依赖：W1＋W2。
- 交付物：`bridge/cli.mjs`（`codex queue` 直接 `execFile`，D-G；`register` 原生 Node 化，含 Windows DPAPI 内联 wrap 三处调用点之二）；双树删除 `delivery/{Send-ClaudePipe,BridgeQueue,Register-ClaudeEndpoint}.ps1`；`bridge/test/register.test.mjs`（4 测试）。

## 行为等价要点

| 项 | 旧（.ps1） | 新（Node） | 等价性 |
|---|---|---|---|
| queue 唤醒 | `& codex queue ... 2>&1`，非零 exit → `Bridge queue submission failed: <output>` | `execFile('codex',['queue','--thread',...,'--message',...])` 15s 超时，失败 → 同文案（stderr→stdout 顺序取回显） | 文案与 `wake-submitted` 事件 stdout 记录语义保留（过程证据≠回执）；E2 已证 Linux 原生 `codex queue` 语义 |
| register 守卫 | env 三变量缺失/坏 UUID → 固定文案，**先校验后落盘** | 同文案同顺序（校验先于 initialize/写入） | 新增测试 #2/#4 钉死 |
| register 端点 | DPAPI blob 写入 endpoints/claude-\<id\>.json | win32 同（内联 powershell wrap）；posix 零秘密（D-B），输出行平台化 | posix 分支由 #1 钉死；win32 留 W10 回归 |
| register 输出 | `REGISTERED_CLAUDE_SESSION=…`／`ENDPOINT_FILE=…`／提示行 | 同两行＋平台化提示 | #1 断言 |

## 包内容影响（→W7a manifest 对照）

- 插件树移除 3 个 .ps1；`delivery/` 现仅含 `transport.mjs`。旧包（v1.3.0）含 .ps1 → 新旧 manifest 结构差异将出现在 W7a 对照报告（PBI-18-4）。
- `pipe.test.mjs` 仍保留对已删脚本的字符串路径引用（win32-skip 守卫，Linux 运行时零影响）——W5 D-H② 将整文件重写为 transport 客户端测试，此为唯一遗留引用，记录在案。

## 测试

全量 106：89 pass / 12 fail（与 W2 后完全一致，均为 W5 移植对象）/ 5 skip。新增 register 4/4。
