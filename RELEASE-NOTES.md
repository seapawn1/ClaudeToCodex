# ClaudeToCodex 1.2.0 版本说明（Sprint 05 候选，未发布）

> 状态：Sprint 05 安装候选。以下"新增能力"为候选内容；"验证摘要"待 PO 完成
> 安装候选端到端真实验收后由 release 准备提交补全。已发布版本见下方 1.1.0 说明。

## 版本

- **版本**：1.2.0（Codex CLI 插件，Sprint 05 候选）
- **主题**：自动会话数据根与连续官方投递（PBI-15 / PBI-14）。

## 新增能力（候选）

- 每个 Codex 原始会话自动选择并复用 bridge 数据根：新开或 resume 的会话无需手写 `CTC_BRIDGE_DIR`、threadId 或路径即可连接与收发；同一 thread 完全退出后 resume 复用原根与既有配对。
- 默认数据根被其他 Codex 会话占用（含仅剩退役存档）时，connect 自动为当前会话启用 `bridge-threads\<threadId>` 新根并登记会话索引（`bridge-roots\` 目录，每会话一个文件、临时文件＋独占硬链接的原子发布、只增不改绑，多会话并发首连互不丢失，崩溃不留半写条目）；旧根数据与证据零改动。
- Codex 侧 `send`/`reply`/`status`/`retire` 与三条 hook 按同一索引解析数据根；Claude 回复入口内嵌数据根，维持不变。
- 数据面可观察的不一致给确定性诊断：wake 指向的消息在另一根时，原始会话收到"所在根＋该根服务的会话＋下一步"提示（不构成收信证明）；未领取 pending 在 `status` 中呈现数据面事实与未知/可能提示（hook 未信任/未重载不可检测，仅提示检查 `/hooks` 与退出-resume）。
- `CTC_BRIDGE_DIR` 保留为显式测试/隔离覆盖：最高优先，且完全不读不写会话索引。

## 已验证环境

Windows 10 Pro 19045、PowerShell 5.1、Node.js v24.14.0、Codex CLI 0.153.4 / 0.154.0、Claude Code 2.1.263 / 2.1.268。

## 验证摘要（待补全）

- 产品回归：76/76 通过（bridge/ 与 plugins/claudetocodex/bridge/ 双树同套）。
- 安装候选与原始会话真实验收：待 PO 完成（SMOKE 4c R1–R6 格）。

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