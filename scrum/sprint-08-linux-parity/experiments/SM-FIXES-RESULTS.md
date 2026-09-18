# SM W1–W5 复核发现处置＋WC 候选记录（Sprint 08）

- 日期：2026-09-18。执行：Developer。对象：`SM-W1-W5-REVIEW.md`（cc31809）五项发现。

## 发现处置

| # | 处置 | 证据 |
|---|---|---|
| F-1（阻塞）Windows queue 启动 | **已修复**：cli.mjs 平台分支——POSIX 直接 `execFile('codex')`；win32 走**最小内联 powershell** `& codex queue --thread $env:CTC_QUEUE_THREAD --message $env:CTC_QUEUE_WAKE`（`& codex` 的 shim 解析语义＝已退役 BridgeQueue.ps1 原机制；thread/wake 经环境变量传递，多行安全、不进命令行、不回显）。不恢复包内 .ps1、消息语义不变 | Windows 侧全量（node.exe 经 UNC 实测）：store.test 两项 queue 集成（617/639 的 win32 shim 分支）通过 |
| F-2 XDG 相对路径 | **已修复**：`dataBaseDir` 仅接受绝对 `XDG_DATA_HOME`，相对/空/未设一律回退默认（XDG 规范语义） | platform.test 新增两相对值断言 |
| F-3 W5 口径 | **已修正**：W5-RESULTS 增补修正节，明示"110/110/0/0 仅 Linux 验收环境；Windows 提前试跑 90/9/11"，双平台完成口径归 W10 | 本文件下方双平台实测 |
| F-4 W1 证据口径 | **已修正**：transport.test 注释改口（阻塞路径证明归 W10，W1 探针只覆盖健康服务端）；W1-RESULTS 增补口径修正 | 两处文本 |
| F-5 同 sessionId 多活记录 | **已钉死**：`peerTokenForSession` 在 alive 记录中按 **updatedAt 最新者**确定性取胜（不再依赖目录枚举序），错误文案不变 | token.test 新增双向断言（两种新旧方向都取新者） |

附带：transport.test fixture 平台化（SM Windows 7 失败根因）——服务端 socket/死端点/校验形状全部按平台生成（win32 命名管道唯一名/posix UDS）；ECONNREFUSED 陈旧文件用例为 posix 专属（win32 显式 skip 带理由，死端点由 ENOENT 用例覆盖）。

## 双平台实测（修复后）

| 平台 | 运行方式 | 结果 |
|---|---|---|
| Linux（验收环境） | `node --test bridge/test/*.test.mjs`（源码树；插件树字节一致） | **115 / 115 pass / 0 fail / 0 skip** |
| Windows（本机 Windows 侧 node v24.14.0，经 `\\wsl.localhost` UNC 对同一工作树运行） | 同套命令 | **115 / 100 pass / 0 fail / 15 explicit skip** |

15 个 skip 全部为显式平台分支带理由（3 POSIX 分支＋8 D-B live-read 系＋2 release 需 git checkout＋2 posix 专属错误路径），其中 2 个 release skip 在 UNC 运行下因 Windows git 不解析 UNC cwd 触发——在真实 Windows checkout（W10）将正常执行。SM 早跑的 9 fail（2 queue＋7 transport fixture）全部消除。

## WC 候选（重新冻结）

- 冻结 commit：见下方记录（含本修复批次；SM 复核 cc31809 已在分支内）。
- 候选包：`/home/dell/projects/claude-to-codex-release-sprint08/claude-to-codex-plugin-sprint08-candidate.zip`（＋ `.sha256` 与解包 stage），Verify=OK。
- 安装（R1 隔离 home）：**目标 home `/home/dell/projects/ctc-s08-r1-home`**（显式回显）；installedPath `/home/dell/projects/ctc-s08-r1-home/plugins/cache/claudetocodex-dev/claudetocodex/1.3.0`（marketplace 源＝冻结工作树本地路径）。
- 安装树与候选 manifest 逐文件 SHA256 一致（plugin 文件 27/27；RELEASE-NOTES.md 为 zip 根附加、manifest.json 为 zip 内清单）。
- 安装候选自带套件（清洗环境）：Linux 侧通过（release 两项按显式理由 skip——安装缓存非 git checkout）。
- plugin.json `version` 仍为 1.3.0：正式版本号属 PO 发布决策（W12），候选身份由包名/manifest `sprint08-candidate` 标识——如实记录，不预决策。

## 状态

- WC 收口条件达成；W8 R1 待 PO 动作批次（R1 home `/hooks` 信任＋Claude 接收策略确认）后开跑。
- W9 用独立 R2 home（届时另建）；W10 Windows 侧同源候选安装后回归。
