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

**Windows 真实 Codex 会话内的现场往返**（hooks 实触发＋queue 唤醒＋注入的 GUI 会话轮）未执行——Windows TUI 无法从 WSL 无头驱动。已有替代组合：上表全部＋v1.3.0 在 Windows 已验收的会话路径（Sprint 08 对该路径的改动仅 queue 启动方式，且其 win32 分支已经套件实证）。**是否需要 PO 在 Windows 侧补一次真实会话冒烟（约 10 分钟：开 codex 会话→信任 hooks→与一个 Claude 会话互发一条），由 PO/SM 裁定。**

## 附注

- Windows 隔离 home 位于 Temp（易失）——裁定通过后如需保留可迁至持久路径重装（bundle 可复现）。
- D 盘主 checkout 的未提交改动全程未动；`D:\ctc-s08-win` worktree 与 bundle 保留至 W12。
