# Sprint 05 Review & Retrospective：自动会话数据根与连续官方投递

- 日期：2026-09-13（Asia/Shanghai；原始事件时间沿用 UTC 记录）。
- 参与者：Product Owner（首批用户）、Scrum Master / Codex、Developer / Claude Code。
- 结论：Sprint Goal 达成；PBI-15 与 PBI-14 通过安装候选、SM 真实验证和 PO 手动端到端验收。PO 反馈“整体我比较满意”，并确认唯一新增非阻塞问题属于 PBI-09 的消息呈现 / 主动报告体验。Review 与 Retrospective 完成；本文件是活跃仓库中的唯一 Sprint 05 过程总结。
- 收口边界：本 Sprint 不做 IDEO 收口。1.2.0 候选已验证；是否公开 GitHub Release、更新日常安装或开启下一个 Sprint 由 PO 按 Release 流程另行决策。

## 1. Sprint Review：Increment 与价值检视

Sprint Goal：

> 在真实 Windows 安装候选中，交付可靠的 per-Codex 会话数据根管理：新开或 resume 的 Codex 原始会话无需 PO 手写 `CTC_BRIDGE_DIR`，即可自动选择并复用正确 bridge root；同一 Codex 会话与多个 Claude Code 原始会话可连续完成 Claude→Codex 官方投递，每条正文直接进入 Codex 原始会话并释放 pending；当 root/hook 不一致或 hook 未生效时，状态与 wake 处理给出明确诊断和下一步，不形成首条消息后的永久阻塞，也不依赖读取数据文件旁路。

本次交付主题：

- **PBI-15 自动会话数据根与 Hook 一致性**；
- **PBI-14 连续官方投递回归**；
- 附带 root 不一致诊断、pending 状态诚实提示、双树同步、文档与 SMOKE 更新、1.2.0 候选构建。

### 1.1 Increment 检视

| 检视项 | 结果 |
|---|---|
| 产品源码 | Sprint 增量合入 `main`；最终实现修复提交 `e7ba853`，包含原子独占 per-session index、SMOKE 修正与双树 release 脚本一致 |
| 产品回归 | `bridge/` 81/81 通过；`plugins/claudetocodex/bridge/` 81/81 通过；两棵树共享文件逐字节一致 |
| 解包候选 | `claude-to-codex-plugin-1.2.0.zip` 81/81 通过；manifest 25 文件，`VERIFY=OK checked=24 extra=0` |
| 候选完整性 | SHA256 `8b97803af295926409195703b05d7d10796bce80219fa606327eeb43dd98afa0`，源提交 `e7ba853` |
| 隔离安装 | `installedPath` 位于隔离 `CODEX_HOME` 的 1.2.0 插件缓存；hooks 指向 `${PLUGIN_ROOT}/bridge/cli.mjs`；skill 存在；无 bridge 数据泄漏 |
| SMOKE 4c R1–R6 | 新会话自动 root、resume 复用、多目标同 root、跨 root 诊断、连续投递、冲突 / 重复 wake / 重叠 / retire 边界均通过 |
| PO 手动 E2E | 新隔离 Codex thread 同时连接 BUYER / REVIEWER；两轮交叉讨论及天气、数学、历史追问均直接回流；rollout 中 9 条完整 `Cross-session bridge message`；最终两个 pending 均为 `null` |
| PO Outcome | PO 亲自完成 host trust 与端到端操作，反馈整体满意；无需人工搬运消息，也未读取消息文件替代收信 |

证据分层保持独立：fixture / 源码测试、解包候选、隔离宿主安装、原始会话 rollout、PO 亲身体验不互相冒充。`submitted:true`、pipe 写入、落盘文件、裸 wake、模型自述均未单独作为收信证明。

### 1.2 核心能力与边界

已验证：

- 新 Codex 会话在默认 root 被 incumbent 占用时自动选择 `bridge-threads\<threadId>`；
- `bridge-roots\<threadId>.json` 记录 thread→root 映射；
- 同一 thread 完全退出后 resume 自动复用原 root；
- 显式 `CTC_BRIDGE_DIR` 仅作为测试 / 隔离覆盖，最高优先且不读不写索引；
- Codex CLI 与三类 hook 按同一 per-Codex root 解析；
- 一个 Codex 可同时连接多个 Claude，回复与 wake 不串目标；
- 同一 pair 连续多条 Claude→Codex 回复均可官方入站并释放 pending；
- wake 指向另一 root 时给出确定性诊断；
- pending 未领取时 status 区分数据面事实与未知 / 可能提示；
- per-session index 采用临时文件 + 独占 hard link，多会话并发首连不丢绑定，崩溃不留半写最终条目；
- 默认 root 属于其他 Codex 时不改绑、不迁移、不合并旧证据；
- 重复 wake 抑制、pending 单槽拒绝、显式 retire 与其他 pair 隔离均符合说明。

仍不承诺：

- 任意数量会话、广播、自动选择目标、并发吞吐或全局顺序；
- 自动重试、自动送达回执、事务性投递；
- 自动启动 / 停止 / 恢复 Claude 或 Codex 进程；
- 跨机器、跨平台或未来 CLI 版本兼容；
- 绕过宿主 hook 信任或 Claude inbound 批准。

### 1.3 PO 价值检视

Product Goal 要求 PO 通过两个原始会话直接交流，无需人工搬运消息。Sprint 05 将该能力从“多 pair 可用”推进到“新开 / resume 的日常会话可自动找到正确数据根，并能连续收信”。

PO 手动场景：

- 一个隔离 Codex 担任发布评审协调人；
- BUYER 与 REVIEWER 两个 Claude 分别代表业务采购方和质量评审；
- 双方各完成两轮意见交换；
- 额外完成天气、数学、历史追问；
- Codex 能基于直接入站的 bridge 正文继续讨论；
- 最终两个 pair pending 清空；
- PO 反馈整体满意，未使用消息文件旁路。

因此，Sprint 05 同时满足 Definition of Output Done 与 Definition of Outcome Done。

### 1.4 W7 安装事故与恢复

隔离宿主安装阶段发生真实事故：

1. Developer 在 PowerShell 中对只读自动变量 `$home` 赋值；
2. 赋值失败未按预期中断，`CODEX_HOME` 未生效；
3. marketplace/plugin 状态写入日常 `.codex`；
4. 后续 remove 误删并注销日常 1.1.0 安装；
5. `C:\Users\DELL\plugins` 出现惰性杂散树。

恢复与防护：

- 日常 1.1.0 文件从 `v1.1.0` tag 原位恢复；
- PO 授权 SM 代执行注册恢复，`codex plugin list` 确认 1.1.0 installed/enabled；
- PO 授权清理杂散树；SM 先核验路径与日常安装仍在，再移入项目安全边界逐文件清理；
- 隔离安装重做时强制：
  1. 禁用 `$home` 等只读自动变量命名；
  2. 每条宿主状态命令同命令显式设置并回显 `CODEX_HOME`；
  3. `installedPath` 必须位于隔离根前缀下；
  4. 状态命令前先核验生效环境；
- 事故、恢复、冻结和防护已写入 Sprint 历史，最终验收数据未被污染。

### 1.5 已知非阻塞问题：PBI-09

PO 手动 E2E 暴露：

- BUYER 历史题答案已作为完整 bridge payload 进入 Codex 模型上下文；
- Codex TUI 未显示原始 payload；
- 模型未主动向 PO 报告；
- PO 需要再次询问“他怎么回复的”；
- 随后 Codex 能准确转述完整答案。

分类：

- 传输 / root 一致性：通过；
- 呈现与行动提示：PBI-09 待办。

PBI-09 已吸收该场景：日常视图必须让 PO 可辨认来源目标、正文或可靠原文入口、回复去向，并区分“已进入上下文”“前端未展开”“未知 / 失败”。模型自述不得替代收信证据。

## 2. Review 的 Product Backlog 适应

| PBI | Review 结果 | 后续处理 |
|---|---|---|
| PBI-15 自动会话数据根与 Hook 一致性 | 通过 | 移入已交付能力 |
| PBI-14 待收槽不领取致每配对首条后发送全拒 | 作为连续投递回归通过；root 失配被证实为共同根因，未发现 `take()` 独立缺陷 | 移入已交付能力 |
| PBI-09 消息与标记呈现可读性 | 未完成，新增 PO 手动 E2E 输入 | 保留未完成条目，后续研究前端展示与模型主动报告 |
| PBI-02 / 03 / 06 / 07 / 10 / 12 / 13 | 未纳入本 Sprint | 继续留在 Product Backlog，由 PO 排序 |

## 3. Review 决策记录

1. Sprint Goal 达成。
2. PBI-15 交付。
3. PBI-14 交付。
4. PBI-09 保留，新增“有上下文但不主动报告”验收输入。
5. 1.2.0 候选技术验收与 PO 手动端到端通过。
6. 是否公开 Release、更新日常安装或开启下一 Sprint 由 PO 另行决策。
7. 本 Sprint 不修改全局 DoD；安装环境防护进入长期工作规则与测试记忆。

## 4. Sprint Retrospective：质量与有效性改进

### 4.1 Worked well

1. **先复现、再定位**：A/B 探针复现 root 失配，C/D 探针证明正确 root 下连续投递可用，避免盲目修改 `take()`。
2. **SM 独立复核有效**：复核发现索引并发丢绑定、SMOKE 旧索引形态、双树 release 脚本差异、索引非原子发布等问题，并在候选验收前修复。
3. **测试先行与实机首验有效**：索引模块先单测再接线；W1 先验证 thread 稳定性与 hook 事件字段，再进入实现。
4. **分层证据有效**：源码测试、解包候选、隔离安装、原始 rollout、PO 亲身体验分别判定，未把一层证据提升成另一层结论。
5. **PO 手动 E2E 有效暴露体验差异**：传输成功与“用户看见并被主动报告”被明确区分，形成 PBI-09 输入。
6. **事故透明处理有效**：误删日常安装没有被掩盖；恢复、授权、清理、重做防护和 actor attribution 均留痕。

### 4.2 Corrected assumptions

1. **“hook 收到 wake”不等于“正文已注入”**：必须核对 pending claim、receipt / context-prepared 与原始会话上下文。
2. **“模型有上下文”不等于“PO 看见或被报告”**：前端渲染与模型行动提示是独立体验层。
3. **“原子替换单文件索引”不等于并发安全**：不同 Codex 首连仍可能 stale-write 丢绑定；改为 per-session exclusive atomic link。
4. **“release 脚本在源码树可用”不等于插件树可用**：固定 `..\..` 布局假设在插件路径失败。
5. **“remove 只影响杂散安装”是未验证假设**：宿主状态命令必须先确认目标 home 与 installedPath。
6. **“等待消息”不应通过 sleep 轮询实现**：应结束模型回合，让 queue wake 与 hook 在边界注入。

### 4.3 Improvement actions

| 改进 | 具体动作 | 落地位置 |
|---|---|---|
| 宿主状态命令防护 | 安装、移除、marketplace、hook 或重启类操作必须同命令回显目标 home，并校验输出路径前缀；不使用 `$home` 等只读自动变量 | `.claude/CLAUDE.md` 与 test harness memory |
| 双树机械一致性 | 共享 bridge 文件与 release 脚本用 diff/hash 工具核对，不凭肉眼或局部文件数声称一致 | 后续 Sprint 检查单 |
| 手动 E2E 等待规则 | 禁止 `Start-Sleep` / 轮询；发送后结束回合，让 hook 注入，再要求原文复述或可靠原文入口 | SMOKE / 手动验收剧本 |
| 呈现与行动提示 | 将“已进入上下文 / 前端未展开 / 未知 / 失败”分层，研究 PBI-09 | Product Backlog |
| 单一记录流 | Developer 回报原始事实，SM 汇总进唯一 Sprint 记录；避免同一事故在两条分支重复维护 | 后续 Sprint 协作 |
| 文档 freshness 收口 | Review/Retro 时检视 README、INSTALL、RELEASE-NOTES、USAGE、SMOKE、skill、CLAUDE.md 与 memory 的版本、路径和承诺 | 本次收口及后续 Sprint 模板 |

### 4.4 Retro 结论

本次不修改全局 DoD。原因是既有 DoD 已覆盖安装候选、原始会话证据、双树同步与 PO 验收；安装事故的缺口属于执行防护，已写入长期工作规则和测试记忆，避免为一次事故增加泛化流程成本。

Sprint 05 的长期经验保存在 `.claude/memory/sprint-05-retrospective.md`。详细过程以本文件为准，memory 只保留可复用规则。

## 5. 追溯与保留

| 对象 | 记录 |
|---|---|
| Planning 基线 | `ab0a650` |
| W1 / 开发计划与首验 | `c4e0822`、`ea558c7` |
| W2 / W3 root index 与 hook 解析 | `6217b1c`、`570953e` |
| W4–W7 Developer 侧实现与候选 | `dcaec01`、`81d1616`、`3ed61c1`、`70ffa5d`、`d3456bf`、`79f9f34`、`725baf4` |
| SM 复核修复 | `e594f9b`、`5ccefb4`、`e7ba853`、`61d9960` |
| Sprint 增量合并 | `a560281` |
| 安装事故与恢复记录 | `85f8c85`、`3563dc4`、`434d503`、`abc10f8`、`1f50a50`、`66aaeeb` |
| E2E 验收记录提交 | `03140e5` |
| 1.2.0 候选 | `claude-to-codex-plugin-1.2.0.zip`，SHA256 `8b97803af295926409195703b05d7d10796bce80219fa606327eeb43dd98afa0`，源提交 `e7ba853` |
| SM R1–R6 thread | `01a09aae-cfdf-7972-a1d6-91fc5aba39df` |
| PO 手动 E2E thread | `01a09ac9-ba1c-7d62-9fc5-d0d1777e3f9b` |
| PO 手动 pair | BUYER `6afb3296-ca62-42e4-838a-8517cb557779`；REVIEWER `b696df84-7077-4bc1-ab50-f7d7bb959124` |
| 隔离安装证据 | `%LOCALAPPDATA%\ClaudeToCodex\s05-host\evidence\isolated-install-sm-check.json` |

### 原始证据检索

Sprint 过程材料在收口前记录于 `03140e5`，可用 Git 历史检索：

```powershell
git show 03140e5:scrum/sprint-05-bridge-root-consistency/SprintBacklog.md
git show 03140e5:scrum/sprint-05-bridge-root-consistency/coordination/po-e2e-record.md
git show 03140e5:scrum/sprint-05-bridge-root-consistency/coordination/po-manual-e2e-result.md
git show 03140e5:scrum/sprint-05-bridge-root-consistency/coordination/po-manual-e2e-script.md
```

Developer 分支历史由 `worktree-sprint05-dev` 与合并提交保留。按项目约定，本文件是活跃仓库中的唯一 Sprint 05 总结；一次性 Sprint 材料已从活跃树移除。