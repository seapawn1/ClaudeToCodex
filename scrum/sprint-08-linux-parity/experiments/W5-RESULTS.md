# W5 切片结果：测试移植 D-H①–⑥（Sprint 08）

- 日期：2026-09-18。执行：Developer。依赖：W1–W4。
- **退出判据达成（Linux 验收环境）**：全量 `node --test bridge/test/*.test.mjs` ＝ **110 tests / 110 pass / 0 fail / 0 skip**（基线 87：72/10/5）。

## 各项移植

| D-H | 内容 | 处理 |
|---|---|---|
| ① connect.test powershell 无守卫 | 5 用例平台分支 | #5 端点断言分支（win32 保留 DPAPI＋F01 解包回归；posix 断言零秘密落盘）；#6 改名"a key record…rejected on the platform's token path"（win32 connect 期拒绝；posix connect 成功→send 期 live-read 拒绝＋send-error 事件，并清理探针 pair 保持 registry 状态一致）；#7 随中性 fixture 恢复；#10 D-F 双平台文案断言；#11 死端点双平台路径＋POSIX 传 `CTC_SESSIONS_DIR` 使 live-read 命中 fixture |
| ② pipe.test 平台分支＋客户端走 transport | 整文件重写 | 3 用例全部双平台：register（Node）守卫、register＋transport 全链路（win32＝DPAPI 端点＋默认解包；posix＝零秘密端点＋registry live-read，env 覆盖设于进程内并恢复）、死端点（win32 死管道／posix ENOENT） |
| ③ Windows 路径 fixture 中性化 | roots/roots-cli/store | roots.test #1 显式根＝平台原生绝对路径；#16 indexDir 双平台断言；roots-cli `childEnv` 同时设 `LOCALAPPDATA`＋`XDG_DATA_HOME`（隔离不再漏到真实数据根）＋中性 socket/cwd；store.test 回复指引断言按 D-D 方言分支 |
| ⑤ store.test:617/639 CLI 集成 | 去 win32 skip，双平台 | `writeCodexShim`：win32 codex.ps1／posix shebang Node 脚本（chmod 755）＋`PATH` 用 `delimiter`；断言原样（queue 参数逐字、pending、reply entry） |
| ⑥ 零残留 skip | **达成** | Linux 侧 skip 计数 0。POSIX 分支用例在 win32 上以**显式理由** skip（W10 Windows 回归时如实计数，属平台语义分支而非迁移残留） |

## 附带修复

- `peerTokenForSession` 增加目录不存在守卫（原裸抛 ENOENT，pipe.test 死端点用例暴露）。
- 核查移植前旧用例是否污染真实数据根 `~/.local/share/ClaudeToCodex`：**不存在**（旧用例在读路径即失败，未写入）。

## 双平台声明（呈 SM）

- Linux＝验收环境：110/110/0/0。
- Windows 侧同套测试的完整运行属 W10 回归（win32 分支断言＋POSIX 分支用例的显式 skip 计数届时如实记录）。
