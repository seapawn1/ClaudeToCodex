# 插件候选 2：SM 复验

当前结论（2026-09-09，Asia/Shanghai）：**候选 2 技术验收 PASS。F01/F02/F03 修复、真实宿主 hook 执行及原始会话完整往返均已核实；复跑技术入口为 10 PASS / 0 FAIL / 0 BLOCKED，退出 0。** PO 已参与本轮真实使用，这一轮同时支撑技术 AC 与 PO DoD 体验；PO 是否接受体验和 Increment，仍待本人表达，不能由技术成功推定。

PBI-08 的技术 AC 已满足；PBI-05 的候选分发、安装与技术验证已有证据。两项尚不整体标为 Done，Sprint Goal 中的正式发布也尚未发生。按 PO 决定，取得验收结论后进行 Sprint Review、Retrospective，再发布已验收的同一份资产。

## 验收对象

- 插件 commit：`b6286c0b6756ac418a295521fbde1072fc89671f`；GitHub 草稿 `v1.0.0-plugin-candidate.2`，Release ID `384994893`。
- ZIP SHA256：`185da0bfc6e5c656a38e4c60567485a626566bf741925e69101362e5d6cb5e6b`。文档后续提交 `c977fa7` 不改插件包；更新后的 HOST-EVIDENCE-STEPS 草稿资产与仓库内容逐字节一致。
- 环境：Windows 10.0.19045、Codex CLI 0.153.4、Node.js v24.14.0；执行记录为 2026-09-08 UTC / 2026-09-09 Asia/Shanghai。独立运行目录位于 `%LOCALAPPDATA%/ClaudeToCodex/test/sm-plugin-candidate2-20260909`。

## 现场验证前已核实的结果

| 检查 | 结果与证据 |
|---|---|
| GitHub 下载及 manifest | 哈希一致；包内 Verify-Release 输出 checked=20、extra=0、VERIFY=OK。见 github-release.json、verify-release.txt |
| 实际隔离安装 | marketplace/add/list 成功；19 个安装副本文件与 ZIP manifest 一致。见 isolated-github-install.json、installed-package-and-skill-locator.json |
| F01 真实注册格式 | 从下载包读取当前真实 Claude 注册表，在独立数据目录 connect 成功；进程内比较 matchesPeerToken=true、matchesEntireKeyFile=false。未向会话发送消息，未更改 Planning 桥，未记录凭据。见 real-registry-token-check.json |
| F02 skill 路径定位 | 执行本次安装副本 SKILL.md 中的定位片段，得到与实际 installedPath 完全相同的目录，cliExists=true。见 installed-package-and-skill-locator.json |
| F02/F03 用户说明 | INSTALL 与 c977fa7 的 README 均采用安装、必要授权、自然语言指定会话、交流；已移除主流程中读取不存在字段及要求用户执行桥命令的步骤 |
| 交接说明 | c977fa7 区分安装位置、宿主加载、实际执行，纠正回复命令路径的证据强度；按仓库或包内运行说明不同结果。更新资产回读一致，见 updated-instructions-check.json |
| 回归 | 包内 connect 12、store 11、pipe 3、install 2，共 28 个测试通过；原始逐项报告仍为 7 PASS / 0 FAIL / 3 BLOCKED、退出 1。见 package-acceptance.json、package-acceptance.txt |
| 新宿主及新线程发现 skill | 实际 Codex app-server 成功创建临时新线程，技能目录列出 enabled 的 claudetocodex:claudetocodex，路径在本次安装缓存，无加载错误。见 real-host-loader.json |
| hooks 加载与路径展开 | 实际宿主发现 PostToolUse、UserPromptSubmit、Stop 三条 hooks，PLUGIN_ROOT 展开为候选 2 的安装缓存路径，无加载错误。见 real-host-loader.json |

## 现场验证前的受阻状态（历史，现已解除）

上轮检查时三条 hooks 均为 enabled=true、isManaged=false、trustStatus=untrusted，尚无通过宿主信任后实际执行、注入当前会话上下文的证据。因此当时 **AC-08-01c 为 BLOCKED，总体技术验收不通过**。这是当时证据不足的结论；下节现场证据已解除此项受阻。

包内报告的 01b/01d 受阻已有独立安装和宿主发现证据补充；这不改变原始报告，也不把未经执行的 hook 计为通过。新插件的完整原始会话请求、回复、追问链路尚未据此证明；离线回归、令牌比较及宿主加载只覆盖各自检查范围。

当时需要先完成宿主正常的审阅与信任，再取得实际执行和消息注入证据。SM 没有修改信任配置，也没有使用绕过信任的启动参数；上轮独立配置未登录模型账户，宿主检查未发起模型推理，不能当作端到端体验。随后按现场运行手册准备新项目与隔离桥数据，使用 PO 的真实 Codex 配置，由 PO 完成必要人工操作与自然语言交流。

待审阅的完整命令、来源文件、事件和 currentHash 已由真实宿主列出，保存在本目录 real-host-loader.json；它们都调用候选 2 安装缓存中的 bridge/cli.mjs hook。

## 现场复验与独立收信核对

现场往返发生于 2026-09-09 03:47–03:52（Asia/Shanghai；原始记录为 2026-09-08 19:47–19:52 UTC）。验收项目为 `D:\ClaudeToCodex-Accept`，桥数据为 `bridge-accept-c2`，使用候选 2 安装副本。业务场景为向 Developer 核查 1.0.0 的能力和限制，并追问首次使用最需要留意的限制。PO 无需在两个会话间转述业务消息。

完整证据见 [live-round-evidence.json](../po-acceptance-c2/live-round-evidence.json)，其中仅摘录相关收信消息、宿主元数据和关联结果，未归档完整会话、端点文件或凭据。

| 检查 | 独立核验结果 |
|---|---|
| 候选与安装绑定 | ZIP SHA256 未变；真实用户缓存中 19 个插件文件与 manifest 逐字节一致。仓库插件文件与候选只有 CRLF/LF 差异，统一换行后内容一致 |
| 自动连接与 skill | 新 Codex 会话 `01a0828e-57ee-7ad0-82e3-8618a6e59bc8` 的技能目录包含 claudetocodex，实际 connect 调用指向安装缓存；新 pair 为 `e4e56322-1aed-4242-86a9-66e207170e5c`，端点来源为 connect-synthesis。见 [live-skill-evidence.json](../po-acceptance-c2/live-skill-evidence.json) |
| 请求与追问到达 Claude | 消息 `1c3cdf85…`、`2a18f83b…` 分别出现在原始 Claude 会话第 3188、3260 行的独立用户消息中；排除工具结果后，每条均恰好出现一次 |
| 两次回复到达 Codex | 消息 `7f2825ad…`、`85a0e79b…` 分别出现在原始 Codex 会话第 55、121 行的独立 developer 消息中；每条均恰好一次，宿主元数据均为 `hooks.additional_context` |
| hook 实际执行绑定 | 两条 PostToolUse 的 context-prepared 分别与宿主收信消息的 turnId、前一条 item_completed 的 toolUseId/threadId/turnId 一致，时间顺序正确。两条收信分别在 context-prepared 后 51ms、52ms 入档；会话工具调用没有手动执行 cli.mjs hook |
| 正文与关联链 | 四条完整消息 JSON 与桥存储逐项相同；同 conversationId，replyTo 依次为 null、请求、第一次回复、追问；收发对象均绑定正确原始会话，回复入口均指向安装副本及验收数据目录 |
| 去重与队列 | 两次 context-prepared、两次 wake-suppressed，无重复入站消息；检查时 pending 为空，验收事件中无 send-error |

Developer 在 19:52:09 UTC 的进度消息仍把最后回复写为 pending，这是发送该进度前取得的旧状态。SM 已核实该回复于 19:51:55.113 UTC 进入 Codex 原始会话，不能继续引用旧状态作为障碍。

取证边界：Codex 在等待期间也读取了 Claude 会话文件；这些工具输出和 assistant 摘要均未计为收信。这里只以独立入站消息、完整正文、自动关联字段和宿主 hook 元数据判定。`submitted` 或 `context-prepared` 单独仍不构成送达证明，产品回执仍为 unverified。本轮使用操作员准备的隔离数据目录；默认目录免配置行为仍由已有隔离进程测试覆盖，不借本轮扩大结论。历史消息中的手写标记保留为原始记录，用户正常使用无需输入标记，也无需因此重做一轮。

## 技术入口复跑

在仓库 `4bfac6a` 上使用已独立绑定的 [live-hook-events.jsonl](../po-acceptance-c2/live-hook-events.jsonl) 与 live-skill-evidence.json，运行 bridge/release/Test-Acceptance.ps1：

- **10 PASS / 0 FAIL / 0 BLOCKED，退出 0**。逐项结果见 [live-acceptance-report.json](../po-acceptance-c2/live-acceptance-report.json)，退出状态见 [live-acceptance-exit.json](../po-acceptance-c2/live-acceptance-exit.json)。
- connect 12、store 11、pipe 3、install 2，共 **28 个回归测试通过**；宿主隔离安装检查通过。调用时对临时目录递归清理额外核对了绝对路径边界。
- 技术入口只检查所给证据的存在和特征；本报告上节的独立来源绑定才支持真实 hook/收信结论。旧包内报告 7/0/3、退出 1 保留，作为现场证据未齐时的历史，不改写原始报告。

## 交接与发布状态

Developer 已收到 SM 技术复验结论及冲刺文档对齐请求。候选 1 失败证据与候选 2 早期受阻证据保留；候选 2 产品代码和 ZIP 不变。当前需要 PO 表达本轮使用体验与是否验收接受，无需重复技术轮次。确认后按约进行 Sprint Review、Retrospective，再正式发布同一份已验收资产；不提前声称 PBI 全部 Done 或版本已经发布。
