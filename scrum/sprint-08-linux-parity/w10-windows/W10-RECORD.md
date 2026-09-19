# W10 Windows 回归记录（Sprint 08，冻结 commit `c0f8d6e` 运行时树）

- 日期：2026-09-19。执行：Developer（全部经 `node.exe`/bundle 无头驱动，未用 powershell/cmd interop 直跑）。

## 环境准备（W10-pre）

- Windows 源：D 盘 `D:\ClaudeToCodex`（原 v1.3.0 checkout，未动其未提交改动）→ 经 **git bundle**（`/mnt/d/sprint08-frozen.bundle`）取入冻结分支 → 专用 worktree **`D:\ctc-s08-win`**（分支 s08-win @ `a9a2062`，插件树与冻结点 `c0f8d6e` 一致；后续两个 w10 脚本提交仅过程材料）。
- Windows 侧工具：node v24.14.0（`node.exe`）；codex＝npm shim `codex.cmd`（经 node 子进程驱动）。

## 回归结果

| 项 | 结果 | 证据 |
|---|---|---|
| 原生 Windows 全量套件（D 盘冻结树） | **115 tests / 100 pass / 0 fail / 15 explicit skip** | w10-suite.sh 运行输出（与 SM 独立结果一致） |
| **DPAPI 端到端往返**（Windows token 路径核心） | **OK** | `w10-windows/dpapi-roundtrip-evidence.json`：register（CLI 子进程＋内联 powershell 加密）→ 端点含 blob 且无明文泄漏 → transport 默认加载器（内联 powershell 解包）→ 管道服务端收到 **auth 携带原始 token** ＋完整帧；wire 记录无 token；exit 0 |
| Windows 侧安装候选（标准入口） | **27/27 哈希一致** | 隔离 home `C:\Users\DELL\AppData\Local\Temp\ctc-w10-home`（显式回显；未触碰日常 `C:\Users\DELL\.codex`）；marketplace 源＝`D:\ctc-s08-win`；`plugin list` 正常；`w10-win-install-evidence.json`＋check-win-installed `OK=27 MISSING=0 MISMATCH=0` |
| Windows 命名管道客户端 | 已证（W1 探针，同冻结前代码路径；transport 未变） | W1-RESULTS |
| queue 启动（F-1 修复） | 已证（套件 617/636 win32 分支经 `& codex` shim） | 本轮套件内 |

## 缺口（如实呈报，不降级）

**Windows 真实 Codex 会话内的现场往返**（hooks 实触发＋queue 唤醒＋注入的 GUI 会话轮）**未执行**——Windows TUI 无法从 WSL 无头驱动，且 PO 在收到两个选项后选择直接进入 W11（2026-09-19，隐含接受替代证据，未要求补冒烟）。已完成的替代证据组合：上表全部（原生套件 100/0＋DPAPI 端到端＋同源安装 27/27＋W1 管道探针＋queue win32 套件分支）＋ v1.3.0 在 Windows 已验收的会话路径（Sprint 08 对该路径的改动仅 queue 启动方式）。

## 最终结案（SM 问询回复，2026-09-19）

**结论：PARTIAL**——自动化与同源安装证据闭合；真实会话冒烟未执行，以替代证据组合＋PO 进入 W11 的决定结案。

| SM 问询项 | 回答 |
|---|---|
| 真实冒烟（Codex↔Claude 真发送/回复入口/queue wake/hooks 注入/原始记录） | **未执行**——无 Windows 侧 sessionId/marker/消息链可提供 |
| Windows installedPath / CODEX_HOME | `C:\Users\DELL\AppData\Local\Temp\ctc-w10-home`（隔离，日常 `.codex` 未动） |
| candidate sourceCommit | `c0f8d6e84bd53711a89956578a4ef22de8a7e440`（D 盘源 `D:\ctc-s08-win` @ s08-win，插件树一致） |
| candidate ZIP SHA256 | `aaa5edf7cc8c303bb37a4aa022cb66b39968d42fb59fc6f10b3c586e555524d6` |
| PO /hooks 信任执行者与时间 | **unknown**（Windows 侧无会话交互；W10 无信任动作） |
| 错误/偏差/恢复 | 无运行错误；环境偏差＝隔离 home 位于 Temp（易失）；D 盘主 checkout 未提交改动全程未动 |
| c0f8d6e 之后 runtime/plugin tree 变更 | **零**（`git diff c0f8d6e..HEAD -- bridge/ plugins/` 为空）；后续 10 个提交均为 scrum/ 下过程材料（清单见 PRE-REVIEW） |

## 附注

- Windows 隔离 home 位于 Temp（易失）——裁定通过后如需保留可迁至持久路径重装（bundle 可复现）。
- D 盘主 checkout 的未提交改动全程未动；`D:\ctc-s08-win` worktree 与 bundle 保留至 W12。
