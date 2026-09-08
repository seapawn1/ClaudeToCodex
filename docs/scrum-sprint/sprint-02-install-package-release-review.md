# Sprint 02 Review：ClaudeToCodex 1.0.0

- 日期：2026-09-09（Asia/Shanghai；现场事件原始记录使用 2026-09-08 UTC）。
- 参与者：Product Owner（首批用户）、Scrum Master / Codex、Developer / Claude Code。
- 结论：插件增量的技术 AC 与 PO DoD 均通过；Review 与 Retrospective 完成，按 PO 决定发布 1.0.0。本文件是本 Sprint 在活跃仓库中的唯一总结，原始过程证据保留于 Git 历史。

## 1. Sprint Goal 与 Increment 检视

Sprint Goal：

> 发布 ClaudeToCodex 1.0.0，使目标用户在声明支持的 Windows 环境中，仅凭发布物和使用说明，即可完成安装、配置，并在 Codex 与 Claude Code 的原始会话之间开展双向工作交流。

本 Sprint 最终聚焦 PBI-05 与经 PO 明确追加的 PBI-08。PBI-08 把已验证的双向 bridge 封装为 Codex CLI 插件，提供连接与通信 skill、必要 hooks、按名称发现 Claude 会话及自动建联。用户保留必要授权，无需手动登记端点、复制会话 ID 或管理桥数据目录；Claude 侧无需安装插件或手动配置桥。

PBI-05 提供公开 GitHub 仓库中的版本化分发：marketplace 安装入口、插件 ZIP、manifest、SHA256 和版本说明。正式发布采用通过验收的同一份 ZIP；v1.0.0 固定已发布版本，另以 Sprint 标签标记包含 README 最终收尾的冲刺结束提交。两个标签均包含本次 Review、Retro 和记忆更新。

| 完成标准 | 检视结果 |
|---|---|
| 技术 AC | 验收入口 10 PASS / 0 FAIL / 0 BLOCKED，退出 0；connect 12、store 11、pipe 3、install 2，共 28 个回归测试通过 |
| 真实宿主使用 | 新 Codex CLI 会话发现安装后的 skill；真实 PostToolUse 执行及上下文注入与原始会话事件一致 |
| 双向工作交流 | 请求、回复、追问、再答均进入正确的原始会话；完整正文、pairId、conversationId、replyTo 一致，两次回复各注入一次，无 pending 残留或 send-error |
| 安装与候选对应 | 19 个安装文件与候选 manifest 逐字节一致；最终产品目录与已验收产品提交的 Git tree 相同 |
| PO DoD | PO 在同一轮真实使用后明确表示：“满意，通过我负责的DoD” |

Definition of Output Done 与 Definition of Outcome Done 沿用 Product Backlog 中的约定；本次没有为收口降低标准。同一轮使用同时支撑技术判定和 PO 体验，分别取得明确结论。

## 2. 产品价值与使用反馈

Product Goal 是让 PO 在实际项目中通过两个原始会话直接交流，将双方反馈用于澄清、评审和行动，无需人工转述消息。

本 Sprint 内最重要的产品调整来自 PO 首用反馈：原流程过于复杂。团队据此将交付方向收敛为可分发插件与免手动配置连接。现场体验围绕“1.0.0 已支持能力与已知限制”及“首次使用最需要留意的限制”开展四步往返；业务消息由桥传递，PO 无需代为搬运。PO 的满意与验收结论确认了本轮对首批用户的价值。

取证如实记录操作分工：GitHub 固定候选安装与隔离目录由 SM 作为操作员准备；PO 在真实宿主中完成必要人工操作、选择会话和自然语言交流。Developer 在 Review 中误称 PO 独立完成安装，已接受纠正；此项归属澄清不重开按本轮安排通过的验收。

现场安装与交流是本次 Review 的实际演示。现有证据来自首批用户本人，尚无更多用户或长期日常使用的数据；不据此扩大产品范围。

## 3. 已知限制与证据边界

- 实测环境：Windows 10 Pro 19045、Codex CLI 0.153.4、Node.js v24.14.0。其他宿主版本的兼容性不由本轮结果推定。
- Windows 本机、单对原始会话、正文 trim 后 1..2000 字符、串行投递；不提供本轮未验证的多会话并发、跨平台能力。
- 会话重启或端点失效后需要重新连接；不静默替换不同配对，不自动重试或恢复。
- 宿主 hooks 信任和 Claude 入站策略保留必要人工控制；产品不代改权限。
- submitted、管道写入、领取或单条 context-prepared 都不能单独证明原始会话收信。收信须核对原始入站消息、完整正文与自动关联字段；模型摘要和读取 transcript 的工具输出不计为收信证据。
- 重复安装、卸载、升级与更多 CLI 版本尚未在本轮验证。仓库未新增开源许可证。

候选 1 的真实认证值处理、skill 安装路径定位和过复杂首用说明曾未通过检查；Developer 修正后交付候选 2。候选 2 早期因未取得宿主必要授权后的实际 hook 证据而受阻，随后真实使用补齐证据并通过。历史失败/受阻报告保留原判定，不倒改为通过。

## 4. Review 的适应与发布决定

PO 已批准本次增量，并明确要求完成 Review、Retro 后收口到 main、打标签、推送及删除 Sprint 分支。该发布顺序来自本次产品决定；Scrum 的 Review 用于检视结果和未来适应，本身不构成统一的发布关卡。

- PBI-08 与 PBI-05 的交付留痕移到 ProductBacklog 第三节；活跃条目只保留未完成事项。
- PBI-02、PBI-03、PBI-06、PBI-07 继续保留。PBI-06 的安装诉求与 PBI-08 重叠，后续精化先核对剩余范围，避免按旧流程重复安排工作。
- Developer 建议后续改善 PBI-03 的消息状态可解释性。该建议没有被自动转成 PO 优先级或下一 Sprint 承诺；本次不扩大范围或自行更换 Product Goal。
- 用户说明采用正式 v1.0.0 入口；不要求用户手写验收标记、消息 ID 或配置测试环境变量。

## 5. Retrospective：原因、改进与落实

本次回顾检视范围选择、角色协作、取证、工具与资料管理。保留奏效的做法：PO 的真实反馈直接推动产品调整；SM 独立复验；同一轮实际协作同时产生 AC 与 DoD 依据；冻结已验收资产。

| 观察与原因 | 后续工作规则 | 责任与落地 |
|---|---|---|
| Planning 把“有关联”误当成“本 Sprint 必须纳入”，一度过量选择 PBI | 以 Goal 所必需的最小集合与 Developer 容量选项；PO 决定价值排序，新增范围回到明确协商 | SM / PO / Developer；写入项目协作记忆 |
| 团队曾把用户要求的 GitHub 分发误读为本地分发 | 先核对用户真实渠道与使用意图，将澄清记录为团队理解修正；不把团队误解描述成 PO 改变方向 | 已纠正记录，并写入长期记忆 |
| SM 一度跨入施工，交接与实现边界不够清楚 | SM 管流程、精化、障碍和独立验收；实现归 Developer；跨会话任务说明文件归属与完成条件 | 写入 CLAUDE.md 与长期记忆 |
| 离线通过、宿主加载、实际执行和收信证据曾被混在一起 | 尽早验证真实产品入口；分层记录证据，受阻不计通过；保留失败历史，并用原始会话及自动关联字段证明收信 | SM / Developer；写入验收记忆 |
| PO 被要求承担测试标记与重复轮次，增加首用负担 | PO 正常使用，操作员完成准备和取证；同一轮支撑 AC 与 PO DoD，明确记录各自实际操作及结论 | 写入 CLAUDE.md 与长期记忆 |
| 资料与提交边界不清，曾把过程文件放入 docs、暂存他方文件 | Sprint 内资料集中在 Sprint 目录，按明确路径提交；收口只保留一份 docs Review，长期规则进入 CLAUDE/memory，原始证据从 Git 历史追溯 | 本次已按 PO 要求清理，并写入长期记忆 |

Retro 的结果落实为 [.claude/CLAUDE.md](../../.claude/CLAUDE.md)、[memory 索引](../../.claude/memory/MEMORY.md)及 [Sprint 02 长期经验](../../.claude/memory/sprint-02-retrospective.md)的更新。memory 通过 Developer 的 Claude Code 原生记忆机制维护，保留项目类型、来源会话与更新时间元数据。本文件承载本轮总结，记忆文件保存可复用规则，不再另建一份 Sprint 总结。

## 6. 版本、追溯与保留

| 对象 | 对应关系 |
|---|---|
| 正式版本标签 | v1.0.0；固定已发布提交 48edef8478260b4ba4b2b442b969924c328f8aac，包含本次 Review、Retro、记忆及资料清理 |
| Sprint 收口标签 | sprint-02-install-package-release-review-retro；标记 main 上包含 README 最终收尾及双标签说明的冲刺结束提交 |
| 产品构建来源 | b6286c0b6756ac418a295521fbde1072fc89671f；保留包内 manifest.sourceCommit |
| 插件 Git tree | 8aa897b41ecf3022e08202e7e070d10890e88f67；用于证明最终收口未改变已验收产品 |
| 发布 ZIP | claude-to-codex-plugin-1.0.0.zip |
| ZIP SHA256 | 185da0bfc6e5c656a38e4c60567485a626566bf741925e69101362e5d6cb5e6b |
| 关键验收提交 | b20d0a3：独立现场证据与技术通过结论；4502fde：PO 验收结论与 Review 输入 |

按 PO 最后补充，本次保留版本与 Sprint 两个标签。v1.0.0 保持已发布指向，Sprint 标签覆盖 README 与标签说明的最后整理；二者产品 tree 相同。包内产品来源提交固定已验收源码，版本标签与该来源通过相同插件 tree 和同一 ZIP 校验值对应；不为整理文档而重建已验收资产。

从活跃树删除 scrum/sprint-02-install-package-release 下的 SprintBacklog、会议中间稿、候选验收报告、JSON 证据与现场启动脚本。产品实现、通用测试、使用说明、ProductBacklog 和长期记忆继续保留。GitHub 的过期候选草稿及一次性过程附件在正式发布收口时清理。

需要追溯原始证据时，从 Git 历史读取，例如：

~~~powershell
git show b20d0a3:scrum/sprint-02-install-package-release/po-acceptance-c2/live-round-evidence.json
git show b20d0a3:scrum/sprint-02-install-package-release/po-acceptance-c2/live-acceptance-report.json
git show 4502fde:scrum/sprint-02-install-package-release/SprintReview.md
~~~
