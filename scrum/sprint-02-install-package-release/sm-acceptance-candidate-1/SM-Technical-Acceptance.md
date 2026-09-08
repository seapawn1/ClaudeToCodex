# 插件候选 1：SM 独立技术验收

结论：**未通过，退回 Developer 修复；尚未进入 PO DoD 验收。** 本报告只描述候选 1，不代表后续分支或候选状态。执行记录时间：2026-09-08 UTC / 2026-09-09 Asia/Shanghai。

## 验收对象与已通过检查

- 候选 commit：`4a91abd5840cd5734830e84c2cfd24443fd68825`；GitHub 草稿 `v1.0.0-plugin-candidate.1`，Release ID `384987334`。ZIP SHA256：`2d171bc2bb1dce74644dba08b2feb4bc232849291851955bea38e6dfee6f80cb`。SM 独立下载与 GitHub 资产摘要一致，见 `github-release.json`。
- 仓库外解压，用包内 Verify-Release 检查：`VERIFY=OK checked=20 extra=0`；来源 commit 一致，见 `verify-release.txt`。
- 环境：Windows 10.0.19045、Codex CLI 0.153.4、Node.js v24.14.0。独立子进程配置从 GitHub 安装成功，19 个插件文件与 ZIP manifest 一致，见 `isolated-github-install.json`、`installed-package-parity.json`。
- 从下载包运行 `bridge/release/Test-Acceptance.ps1 -PluginDir <解压目录> -ReportPath <报告路径>`，复现 **7 PASS / 0 FAIL / 3 BLOCKED，退出码 1**。connect 11、store 11、pipe 3、install 2 个测试通过，见 `package-acceptance.json`、`package-acceptance.txt`。这是原始检查入口结果，不能覆盖下述独立验收缺陷。
- HOST-EVIDENCE-STEPS 已迁至 Sprint 文件夹，README 引用正确；候选至 `113a18b` 之间只变更文档和 Sprint 记录。

## 阻塞缺陷

**F01 / AC-08-03：自动连接认证值与真实宿主格式不符。** 发布副本 connect 将整份 `.key` 文本直接 DPAPI 包装。真实文件为含 `peerToken`、`procStartFt`、`pidDomain` 的 JSON。SM 在独立数据目录读取真实注册表执行 connect，退出 0；仅在进程内解密比较得到 `matchesPeerToken=false`、`matchesEntireKeyFile=true`。生成值为完整 JSON，与实际认证令牌不一致。没有发送验证消息，没有改动 Planning 桥配对或端点。证据 `real-registry-token-check.json` 只含格式及布尔结果，不含凭据。现有测试使用裸字符串 key fixture，漏掉了真实格式。

**F02 / AC-08-01、03：skill 和安装说明引用不存在的 installedPath 字段。** SKILL.md 第一步及 INSTALL 第三节要求从 `codex plugin list --json` 取得 installedPath。隔离 CLI 实测只有 plugin add 输出含该字段，list 没有；新会话按现有 skill 无法完成所述定位。修复需使 skill 自行取得实际安装副本位置，不依赖用户保留安装输出或开发目录。证据见 `isolated-github-install.json`、`installed-package-parity.json`。

**F03 / AC-08-03：首用说明仍要求用户执行桥内部命令。** INSTALL 主步骤要求取得安装路径并执行 node sessions/connect/send，仅把自然语言调用 skill 列为可选方式。既定精化为用户不执行桥命令；主路径应落实安装插件、必要授权、向 Codex 指定 Claude 会话、交流。内部操作交由 skill，排查说明可以保留技术命令。此项落实既有范围，不新增 PBI。

## 真实宿主证据与边界

SM 启动独立配置的实际 Codex app-server，未请求模型执行任务。skills/list 能发现 enabled 的 `claudetocodex:claudetocodex`，路径位于安装缓存。另一次 thread/start 成功建立临时新线程，随后同一宿主的技能目录仍列出该安装副本，见 `new-thread-skill-catalog.json`。宿主发现能力已验证，连接步骤可用性仍受 F02 阻塞。

hooks/list 发现三条插件 hooks，PLUGIN_ROOT 均展开为安装缓存内的实际路径，无加载错误；均为 enabled=true、isManaged=false、trustStatus=untrusted，见 `real-host-loader.json`。**加载、路径展开与实际执行是不同证据；本轮未证明 hooks 已执行。** 没有修改信任或绕过授权。AC-08-01c 继续受阻。

包内原始报告将 01b/01c/01d 列为受阻；独立宿主检查补充了实际安装、skill 发现、新线程启动和 hooks 加载事实，没有仅凭字符串计数把总体结果改为通过，没有使用 Planning 旧桥日志替代新插件证据。

| 范围 | 本轮判定 |
|---|---|
| PBI-05 候选下载及一致性 | 当前候选通过；修复后需绑定新候选复核 |
| AC-08-01 | 宿主安装与发现已验证；F02 阻塞可用性，hook 实际执行受阻 |
| AC-08-02 | 现有模拟回归通过，尚未完成真实自动建联与交流 |
| AC-08-03 | 未通过：F01、F02、F03 |
| AC-08-04 | 现有通信回归通过；修复候选的真实原始会话通信待验证 |
| AC-08-05 | 已有失败路径、包内容与策略静态检查通过；保留宿主信任要求 |
| 技术 DoD / PO DoD | 技术验收未通过；PO 验收尚未开始 |

## 交接

缺陷已通过 Planning 桥发送给 Developer：标记 `CTC-SPRINT02-SM-DEFECTS-AL`，消息 ID `ce915f9d-a73c-42d5-967a-5a3f9856d298`。Developer 负责修复及新候选，SM 负责复验。过程记录继续归本 Sprint 文件夹。正式发布仍在技术验收、PO 验收、Review、Retro 之后。
