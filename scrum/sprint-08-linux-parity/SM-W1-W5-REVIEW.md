# SM 切片复核：W1–W5（过程审查）

- 日期：2026-09-18。
- 审阅对象：`5bafda9`（W1）、`09bcb3b`（W2）、`072086c`（W3）、`14036fb`（W4）、`bdce1e9`（W5）。
- 结论：**W1 / W2 / W4 过程复核通过；W3 发现一项必须修复的 Windows queue 启动缺陷；W5 Linux 退出判据通过，但不能按 HOW 原文宣称双平台测试移植完成。** 本审查不是最终 AC 验收；W8–W11 仍以安装候选和原始会话证据为准。

## 独立核对结果

| 切片 | 结果 |
|---|---|
| W1 unified transport | 通过。23 个新增切片测试中 transport 8 项通过；Windows named-pipe 客户端探针有 win32 Node、原始字节、501ms 间隔、LF framing 和 wire 记录证据。DPAPI 解包不在探针范围，Windows 真实往返留 W10。 |
| W2 live token / session shape | 通过。stale、missing key、half-written key、PID reuse、death mid-send 四类竞态 fixture 均通过；结果与错误不含 token。 |
| W3 queue direct call + native register | **有条件不通过**。Linux/Node 路径与 native register 测试通过，delivery `.ps1` 按决策移除；但 Windows `execFile('codex')` 启动方式失效，见 F-1。 |
| W4 data root + reply syntax | 通过。store / roots 共享数据根规则；Linux POSIX env 前缀和单引号转义测试通过。Windows `$env:` 分支在本机 Windows 测试中通过。发现 XDG 相对路径处理问题，见 F-2。 |
| W5 test porting | Linux 源码树与插件树均 **110/110 pass，0 fail，0 skip**；W5 提交内双树一致。Windows 提前试跑为 90 pass / 9 fail / 11 explicit skip，详见 F-1 / F-3。 |
| 双树 / 包内容 | W4 与 W5 提交中 `bridge/` 与插件树字节一致；`plugins/.../bridge/delivery/` 仅剩 `transport.mjs`，三项 `release/*.ps1` 按计划保留至 W7a 重写。 |
| 秘密扫描 | 当前代码与实验材料未发现 API key、bearer token、peerToken 明文等秘密模式。W1 evidence 中的 token 是明示 fixture 非秘密值。 |

## 发现

### F-1（阻塞，W3 / Windows queue）：Node 直接 execFile 无法启动本机 npm 脚本入口

本机 Windows 侧只读探针结果：

- `execFile('codex', ['--version'])` → `ENOENT`；
- PowerShell 解析到 `C:\Users\DELL\AppData\Roaming\npm\codex.ps1`；
- 直接 `execFile` 该 `.ps1` → `EFTYPE`；
- `codex.cmd` → `EINVAL`。

Windows 全量测试中两条 queue 集成也实际失败：`spawn codex ENOENT`。这不是测试假阳性，而是 W3 将旧 PowerShell wrapper 改为 Node `execFile('codex')` 后，未处理 Windows npm 生成 `.ps1/.cmd` 入口的启动差异。

处理要求：Developer 在继续 W6 前或至少在本切片修复中给出平台启动方案，并添加 Windows 可运行回归；不得到 W10 才发现。实现方式由 Developer 决定，但不得恢复包内 delivery `.ps1`，也不得改变既有消息语义。

### F-2（建议修复，W4 / D-C）：相对 `XDG_DATA_HOME` 被接受

`dataBaseDir` 当前使用 `env.XDG_DATA_HOME || default`。XDG 语义中非绝对路径应被忽略并回退默认；当前相对路径会被拼进产品数据根。请在 W6/W7 前补 `isAbsolute` 判断与测试，或明确记录产品不支持 XDG 规范该部分并更新说明。推荐按规范修复。

### F-3（状态修正，W5）：不能宣称双平台测试移植完成

HOW D-H⑥ 的 W5 退出判据写了“双平台零残留 skip”。实际结果：

- Linux：110/110 pass，0 fail，0 skip，源码树和插件树均通过；
- Windows 提前试跑：90 pass / 9 fail / 11 explicit skip。

其中 2 个失败来自 F-1；7 个 `transport.test.mjs` 失败主要是该测试 fixture 只生成 Unix socket 路径，Windows 需要 named-pipe fixture。W1 interop 探针已覆盖真实 Windows named-pipe 客户端通路，因此这 7 项是测试移植缺口而非已有产品反向证据；但仍不能宣称 W5 双平台完成。

处理建议：将 Windows queue 修复为立即项；transport 测试平台 fixture 可并入 W10 前置或 W10 回归，但必须更新 W5 结果措辞，不得写“双平台零残留 skip”已完成。11 个显式平台 skip 可在 W10 如实计数，不视为迁移残留。

### F-4（次要，W1 文档）：connect timeout 证据口径不一致

W1 结果明确“阻塞 connect timeout 留待 W10”；但 `transport.test.mjs` 注释称该路径由 W1 Windows pipe probe 覆盖。实际 W1 probe 是正常连接与投递，不包含阻塞服务端。请修正注释或 W10 用不调用 `ConnectNamedPipe` 的服务端补证。

### F-5（观察，W2）：多个同 sessionId 活记录的选择策略未钉死

`peerTokenForSession` 按目录枚举遇到的第一个匹配且 alive 的记录返回。真实注册表曾出现同一 sessionId 的多条历史记录。若多个同 sessionId 进程同时存活，应说明该场景的官方语义，或用最新 `updatedAt` / socket 对应关系 / 明确歧义策略钉死。当前不是已证实缺陷，不阻塞；W8/W9 或 W10 前建议补测试或记录边界。

## 测试证据摘要

- Linux source tree @ W5：110 tests / 110 pass / 0 fail / 0 skip。
- Linux plugin tree @ W5：110 tests / 110 pass / 0 fail / 0 skip。
- Windows early run @ W5：110 tests / 90 pass / 9 fail / 11 explicit skip；2 fail = F-1，7 fail = transport fixture 平台缺口。
- W4 冻结点双树 `diff -qr` 无差异；W5 提交双树无差异。
- Windows 侧测试与探针只写临时目录，未修改日常 home、插件配置或仓库状态。

当前 Developer 工作区尚有未提交 W6 skill 文档改动；本文件独立记录 SM 复核，不审阅该未完成改动。
