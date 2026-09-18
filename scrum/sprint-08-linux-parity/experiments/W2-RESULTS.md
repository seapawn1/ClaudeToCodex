# W2 切片结果：token 平台分支 + sessions 校验 + 四类竞态 fixture（Sprint 08）

- 日期：2026-09-18。执行：Developer。
- 交付物：`bridge/sessions.mjs`（D-F 平台 socket 检查＋`peerTokenForSession` 按 sessionId 反查现读）、`bridge/delivery/transport.mjs`（posix 端点免 tokenProtected＋`resolveEndpointToken` posix 分支接通）、`bridge/cli.mjs`（connect 平台分支：Windows 保留 DPAPI wrap，Linux 零秘密落盘）、`bridge/test/token.test.mjs`（7 测试）。

## 退出判据：四类竞态 fixture — 全部钉死（Linux，生产路径 default tokenLoader）

| 竞态 | 行为 | 证据要点 |
|---|---|---|
| ① stale record | 死 pid 的匹配记录 → `no longer running` 显式错误，不触线，记录 not-completed/unverified | token.test #2 |
| ② .key 缺失 | 匹配记录无 key 文件 → `no peer key file` 显式错误 | #3 |
| ② .key 半写 | key JSON 截断 → `not valid registry JSON (possibly mid-write)`，**文件内容零回显** | #4 |
| ③ PID 复用 sessionId 不匹配 | 只按 sessionId 匹配，绝不按 pid；他人会话的 key 不进任何失败路径；正反双向断言 | #5 |
| ④ 发送中会话死亡 | auth 写出恰一次后 EPIPE → not-completed/unverified，零重试 | #6 |

另：D-B live-read 全链路 happy path（registry 现读 token→帧到达→completed；记录零秘密）；D-F selectSession 平台分支（posix 拒 Windows 形状 socket）。

## 测试计数说明（呈 SM）

全量 102 tests：85 pass / 12 fail / 5 skip。fail 从基线 10 → 12 的位移**全部**位于 connect.test.mjs 的 Windows 形状用例（fixture `\\.\pipe\LOCAL\...`、DPAPI blob 断言、connect 期 key 校验断言），根因是 W2 两项**有意**语义变化（D-F 在 posix 拒绝 Windows 形状端点；D-B 把 key 校验从 connect 期移到发送期）——即 D-H①③ 的移植对象，W5 处理。既有通过项零破坏；新 W2 测试 7/7 通过。

## 边界

- Linux 现读按 sessionId 精确匹配且要求 pid 存活（`process.kill(pid,0)`），全部死记录 → 'reconnect to refresh' 提示；与 Windows DPAPI 路径行为差异如实存在（Windows 端点记录自带保护 blob，不依赖 registry 存活）。
- `peerTokenForSession` 错误消息含 sessionId（非秘密），不含 key 内容/token。
