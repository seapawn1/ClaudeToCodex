# ClaudeToCodex 1.3.0 版本说明（正式发布）

> 状态：正式发布版本。该版本已通过隔离安装候选、SM 真实宿主验证和 PO 手动端到端验收；安装入口固定 `v1.3.0` tag。Sprint 过程收口另有 `sprint-03-readable-arrival-review-retro` tag。

## 版本

- **版本**：1.3.0（Codex CLI 插件）
- **主题**：可读到达与自动继续（PBI-09）。
- **实现源提交**：`04f002e`；1.3.0 收口提交仅追加版本、Review / Retro、Backlog 与记忆等发布材料，不改变已验收运行时代码。

## 新增能力

- Claude→Codex 排队唤醒改为多行可读消息：来源头行、完整正文、独立尾部 `[CTC-WAKE ...]` 标记行。
- hook 注入层保留可执行回复入口；正文已在排队文本中时不再重复注入。
- 空闲到达自动触发下一次 Codex 处理；工作中到达先排队，不破坏当前模型调用或工具执行，并在随后调用前进入上下文。
- 同轮双 hook 重复处理放行并记录 noop；跨轮重复唤醒继续抑制。
- 在途旧单行 wake marker 继续兼容。
- 采用尾部 marker 规则：正文内嵌的完整有效 marker（包括指向其他 pair 的伪造 marker）不得劫持路由；跨 pair 伪造 marker 与堆叠真实 wakeText 均有回归。

## 已验证环境

Windows 10 Pro 19045、PowerShell 5.1、Node.js v24.14.0、Codex CLI 0.154.0、Claude Code 2.1.268。

## 验证摘要

- 产品回归：**87/87 × 双树**（`bridge/` 与 `plugins/claudetocodex/bridge/` 同套通过）。
- 隔离安装候选：`claude-to-codex-plugin-1.2.0.zip`（sourceCommit `04f002e`），SHA256 `892d029962f063c4a56faa9464188596cff2e2a5fccaa942e14a5f4a153e74aa`；安装缓存关键文件 hash 与 manifest 匹配，缓存树 87/87 通过。
- SM 真实宿主验证：S03-1 可读排队、S03-2 同轮双 hook 放行、S03-3 跨轮重复抑制、S03-4 忙碌两条堆叠、S03-5 旧单行兼容均 PASS；S03-5 的 send-error / 手工恢复记录为测试偏差，候选按兼容路径投递完整 frame。
- PO 手动 E2E：真实四段往返请求、回复、追问、再答自动关联；PO 无需催问复述、人工搬运或读取 bridge 数据文件，并明确表示验收通过。
- 完整 Review / Retro / 证据索引见 `docs/scrum-sprint/sprint-03-readable-arrival-review-retro.md`。

## 边界与限制

- Windows-only；短文本 trim 后 1..2000 字符；串行逐事件注入；回执仍为 `unverified`。
- 不承诺广播、自动重试、自动恢复、自动启动 / 终止进程、跨机器或跨平台能力。
- 正文内容不解析、不改写；marker 解析仅识别锚定整行格式，并按尾部 marker 规则处理。
- 未验证任意宿主异常注入形态、任意跨版本升级路径或未来 CLI 兼容性。

---
# ClaudeToCodex 1.2.0 版本说明（正式发布）

> 状态：正式发布版本。该版本已通过隔离安装候选、SMOKE 4c R1–R6 与 PO 手动端到端验收；安装入口固定 `v1.2.0` tag。Sprint 过程收口另见 `sprint-05-bridge-root-review-retro`。

## 版本

- **版本**：1.2.0（Codex CLI 插件）
- **主题**：自动会话数据根与连续官方投递（PBI-15 / PBI-14）。
- **实现源提交**：`e7ba853`；v1.2.0 release-prep 仅在此基础上追加发布文档，不改变插件运行代码。

## 新增能力

- 每个 Codex 原始会话自动选择并复用 bridge 数据根：新开或 resume 的会话无需手写 `CTC_BRIDGE_DIR`、threadId 或路径即可连接与收发；同一 thread 完全退出后 resume 复用原根与既有配对。
- 默认数据根被其他 Codex 会话占用（含仅剩退役存档）时，connect 自动为当前会话启用 `bridge-threads\<threadId>` 新根并登记会话索引；旧根数据与证据零改动。
- 会话索引位于 `bridge-roots\`，每会话一个 JSON 文件，采用临时文件 + 独占 hard link 原子发布；只增不改绑，多会话并发首连互不丢失，崩溃不留半写最终条目。
- Codex 侧 `send`/`reply`/`status`/`retire` 与三条 hook 按同一索引解析数据根；Claude 回复入口内嵌数据根，维持不变。
- wake 指向另一 root 时给出确定性诊断，说明消息所在根、该根服务的 Codex 会话和下一步；诊断不构成收信证明。
- pending 未领取时，status 呈现数据面事实与未知 / 可能提示；hook 未信任或未重载不可被产品检测，只提示检查 `/hooks` 与退出 / resume。
- `CTC_BRIDGE_DIR` 保留为显式测试 / 隔离覆盖：最高优先，且完全不读不写会话索引。

## 已验证环境

Windows 10 Pro 19045、PowerShell 5.1、Node.js v24.14.0、Codex CLI 0.153.4 / 0.154.0、Claude Code 2.1.263 / 2.1.268。

## 验证摘要

- 产品回归：**81/81 × 双树**（`bridge/` 与 `plugins/claudetocodex/bridge/` 同套通过）。
- 并发索引：API 级双会话共存、真实 8 进程不同会话并发绑定零丢失、真实 8 进程同会话竞争收敛单绑定、不可读条目不覆盖均通过。
- 安装候选：`claude-to-codex-plugin-1.2.0.zip`，SHA256 `8b97803af295926409195703b05d7d10796bce80219fa606327eeb43dd98afa0`；manifest 25 文件，`VERIFY=OK checked=24 extra=0`；解包候选 81/81 通过；包级技术验收 pass=8 / fail=0 / blocked=3，三项 blocked 均为须真实宿主与 PO 参与的检查。
- 隔离宿主安装：插件 installed/enabled；安装路径位于隔离 `CODEX_HOME`；hooks 指向 `${PLUGIN_ROOT}/bridge/cli.mjs`；skill 可发现；无端点、配对、消息或凭证泄漏；日常 1.1.0 基线保持可用。
- SMOKE 4c R1–R6：新会话自动 root、resume 复用、多目标同 root、跨 root 诊断、连续官方投递、默认 root 不改绑 / 重复 wake 抑制 / pending 单槽拒绝 / retire 隔离均通过。
- PO 手动端到端：一个隔离 Codex 同时连接 BUYER / REVIEWER 两个 Claude，完成两轮交叉讨论及天气、数学、历史追问；原始 rollout 中 9 条完整 `Cross-session bridge message` 直接进入模型上下文，最终两个 pending 均为 `null`，未读取消息文件替代收信。PO 反馈整体满意。
- 已知非阻塞问题：bridge 正文进入模型上下文后，Codex TUI 不一定显示原文，且模型可能未主动向 PO 报告；由 PBI-09 继续跟踪。

## 边界与限制

- 最低验证规模为一个 Codex + 两个 Claude；不承诺任意规模、广播、并发吞吐或全局顺序。
- Windows-only；短文本 trim 后 1..2000 字符；串行逐事件注入。
- 回执恒 `unverified`；不自动重试、不自动恢复、不代改宿主权限。
- Claude 重启后旧端点失效；显式重连。新身份创建新配对；同名陈旧配对需按完整 pairId 显式退役。
- 一个 bridge 数据根仍只服务一个 Codex 原始会话；本版本自动选择 / 复用 root，不做跨 root 合并或改绑。
- 未验证所有宿主异常注入形态、任意跨版本升级路径或 CLI 未来版本兼容性。

完整 Review / Retro / 证据索引见 `docs/scrum-sprint/sprint-05-bridge-root-consistency-review-retro.md`。

---

# ClaudeToCodex 1.1.0 版本说明

## 版本

- **版本**：1.1.0（Codex CLI 插件）
- **来源**：GitHub 仓库 [seapawn1/ClaudeToCodex](https://github.com/seapawn1/ClaudeToCodex)，固定 `v1.1.0` tag。
- **安装入口**：

```powershell
codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref v1.1.0
codex plugin add claudetocodex@claudetocodex-dev
```

- **完整性**：包内 `manifest.json` 记录来源提交与逐文件 SHA256；Release 资产附整包 `.sha256`；`bridge\release\Verify-Release.ps1` 可复核。

## 新增能力

- 一个 Codex 原始会话可同时保持多个 Claude Code 原始会话配对。
- 新发送按名称确定目标；名称不存在、歧义、身份失效或已断开时明确报错并给出下一步，不猜测、不静默切换。
- 回复与追问绑定被回复消息的原目标，不随最近一次发送或当前候选排序改变。
- 每个配对有独立待收槽；相近来信逐事件注入，不覆盖、不串目标、不重复注入；重复唤醒被抑制。
- 单个目标可显式 `retire --pairId`；证据归档，在途信件保留原归属，其他目标继续可用。
- 状态入口列出各目标名称、双侧原始会话、项目上下文与待收信息；`endpointOnDisk` 只表示文件存在，不声明存活。
- 1.0.0 单目标入口与 legacy `pair.json` 数据继续可用；同身份重连刷新端点。

## 已验证环境

Windows 10 Pro 19045、PowerShell 5.1、Node.js v24.14.0、Codex CLI 0.153.4 / 0.154.0、Claude Code 2.1.263 / 2.1.268。

## 验证摘要

- 产品回归：50/50 通过，覆盖多配对、legacy、生命周期、并发锁、唤醒、队列与 1.0.0 回归。
- 双树一致：`bridge/` 与 `plugins/claudetocodex/bridge/` 的 16 个 tracked 文件一致。
- 隔离安装候选：19 个文件全部匹配固定源提交，无源外夹带；实际插件 hooks、CLI 与 reply 入口均指向同一安装。
- 原始会话验证：A/B 业务问答、交错追问、切回旧消息、相近来信、工作中三类收信边界、重复唤醒抑制和生命周期分支均以原始事件核对。
- PO 体验：对象容易区分、切换无需拆除连接、追问归属正确，PO 确认支持其多方协作并满意。
- 完整技术判定与证据索引见仓库 `docs/scrum-sprint/sprint-04-multi-claude-sessions-review-retro.md`。

## 边界与限制

- 最低验证规模为一个 Codex + 两个 Claude；不承诺任意规模、广播、并发吞吐或全局顺序。
- Windows-only；短文本 trim 后 1..2000 字符；串行逐事件注入。
- 回执恒 `unverified`；不自动重试、不自动恢复、不代改宿主权限。
- Claude 重启后旧端点失效；显式重连。新身份创建新配对；同名陈旧配对需按完整 pairId 显式退役。
- 未验证所有宿主异常注入形态、任意跨版本升级路径或 CLI 未来版本兼容性。

## 分发与权利

本发布物经 GitHub Release 分发。仓库尚未附开源许可证；作者保留所有权利，未随包授予再分发许可。

## 包内容

ZIP 根即插件根：`.codex-plugin/plugin.json`、`skills/claudetocodex/SKILL.md`、`hooks/hooks.json`、`bridge/` 与本说明。包内不含端点、令牌、配对数据或消息记录。