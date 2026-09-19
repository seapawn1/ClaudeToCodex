# Sprint 08 Review & Retrospective：Linux 版本功能对等交付

- 日期：2026-09-19。
- 状态：**Review 与 Retrospective 完成；Sprint Goal 达成，PO 决定发布 v1.4.0。**
- 参与者：Product Owner、Scrum Master / Codex、Developer / Claude Code。
- 运行时候选：`c0f8d6e84bd53711a89956578a4ef22de8a7e440`；候选 ZIP SHA256 `aaa5edf7cc8c303bb37a4aa022cb66b39968d42fb59fc6f10b3c586e555524d6`。正式 v1.4.0 发布提交仅追加版本与收口材料，运行时行为与该候选一致。
- 本文件是活跃仓库中的唯一 Sprint 08 总结；一次性 Sprint 材料已移除，原始记录由 Git 历史与本文件证据 ID 追溯。

## 1. Sprint Review

### 1.1 Goal 与结论

> 交付面向 Linux 的 ClaudeToCodex 版本，在 WSL2 环境中完整提供 Windows v1.3.0 已交付的用户功能与协作体验，让 PO 通过标准插件入口开展 Codex 与 Claude Code 的多会话双向协作，无需人工传话。

**结论：达成。**

- Linux/WSL2 目标能力通过 W8 R1 与 W9 R2 两轮独立全矩阵验证。
- Windows 保留能力通过原生 Windows 套件、DPAPI 全链路、同源候选安装、W1 named-pipe 探针和 W10 真实原始会话双向冒烟验证。
- PO 在真实使用后口头确认无需人工搬运消息、能理解来信并继续追问、回复入口可用且无阻塞体验问题；Developer/SM 按其确认代录 Outcome 结论，未虚构操作细节。
- Output Done 与 Outcome Done 均通过；PO 决定发布 v1.4.0。

### 1.2 交付 Increment

- 统一 Node transport：Linux/WSL2 使用 Unix domain socket，Windows 使用 named pipe；保留 auth 行、500ms 间隔、LF JSON frame、`priority=next`、wire 双写和错误分类。
- Linux token 零落盘：endpoint 不存 secret，发送时按 sessionId 选择最新 alive registry 记录并现读 `.key`；Windows 继续使用同用户 DPAPI。
- Linux 数据根与回复入口平台化：`~/.local/share/ClaudeToCodex`（仅接受绝对 `XDG_DATA_HOME`），POSIX env 前缀与引号转义；Windows 路径、DPAPI 与 `$env:` 语义保留。
- Windows queue 启动修复：POSIX 直调 `codex`；Windows 经最小内联 PowerShell `& codex` 解析 npm shim，thread/wake 经环境传递。
- `register` Node 化、delivery PowerShell 退役、Node Build/Verify 与按源 commit UTC 时间戳的跨时区字节可复现 ZIP。
- 双平台文档与 Linux SMOKE 程序同步更新；公开 v1.4.0 入口同时支持 Windows 与 WSL2/Linux。

### 1.3 AC / DoD 矩阵

| AC | 结论 | 证据摘要 | 边界 |
|---|---|---|---|
| S08-16-1 双向往返 | PASS | W8/W9 T01/T05：两个方向四段往返，conversationId 与 reply 链闭环；中文、引号与多行正文现场覆盖。 | 既有短文本与串行边界不变。 |
| S08-16-2 收信时机 | PASS | W8/W9 T02/T03/T04：空闲、生成中、工具边界双向覆盖；原始会话事件与 bridge 事件时间线互证。 | Codex 前台阻塞窗口受代理行为限制，以等价边界领取链与后台工具变体记录。 |
| S08-16-3 到达体验 | PASS | W8/W9 S03-1：来源头行、完整正文、尾部 marker；POSIX 回复入口真实渲染并闭环。 | 未改变现有前端呈现设计。 |
| S08-16-4 兼容与失败边界 | PASS | 正文限制、旧单行 wake、跨轮抑制、伪造 marker、堆叠 wake 由现场与套件覆盖。 | S03-2 双注册同轮 noop 按宿主实际单注册形态记录，不伪造未声明 hook；语义由套件与历史 Windows 证据覆盖。 |
| S08-17-1 多目标协作 | PASS | W8/W9 MT1-3：双 pair 共存、按名路由、零误投、回复归属。 | 不承诺任意数量目标。 |
| S08-17-2 自动数据根 | PASS | R1/R2/R3/R4：默认根、让位、resume、同根多目标与跨根诊断。 | W9 本轮无重启事件，resume 由 R1 与既有语义覆盖。 |
| S08-17-3 连续与相近来信 | PASS | R5 与 S03-4：多 pair 连续领取、同窗双槽按序释放，无首条阻塞。 | 注入顺序仍限于既有串行语义。 |
| S08-17-4 状态与生命周期 | PASS | MT5/R4/status：死端点、退役归档、旧消息拒绝、另一目标继续可用。 | 不增加自动恢复或新状态 UI。 |
| S08-18-1 标准安装 | PASS | Linux R1-2/R2 从本地冻结源标准安装，27/27 manifest 一致；Windows 同源候选安装亦 27/27。 | Windows W10 自动化 home 位于 Temp，真实冒烟使用日常 Windows home 验证。 |
| S08-18-2 启用与入口一致 | PASS | hooks、skill、CLI 与 reply entry 均来自安装候选；Linux R1/R2 PO trust 后真实触发；Windows 真实会话亦触发 UserPromptSubmit/Stop hook。 | 必要信任仍由 PO/用户执行。 |
| S08-18-3 使用支持与兼容入口 | PASS | README / INSTALL / RELEASE-NOTES / USAGE / SMOKE / skill / plugin metadata 双平台化；install/register/pair/sessions 与 Linux SMOKE 程序覆盖。 | W7b Test-Acceptance Linux 移植按 PO 决策后置。 |
| S08-18-4 版本交付证据 | PASS | ZIP verify、manifest schema、双 TZ 字节可复现、双树一致、多安装缓存一致；W10 Windows 真实双向会话补证完成。 | 原生 Linux、macOS 与跨 Windows/Linux 侧通信不支持。 |

**Output Done**：PASS。Increment 集成于产品树，可通过标准插件入口安装，Linux/Windows 测试与原始会话证据与声明范围相适应，PO 验收通过。

**Outcome Done**：PASS。PO 确认真实协作中无需人工传话，能理解 Claude 来信并继续追问，回复入口可用，Sprint Goal 的协作价值达成。记录来源为 PO 口头确认、Developer/SM 代录；未声称存在脚本化 PO 时间戳证据。

### 1.4 现场证据摘要

#### W8 R1 / W9 R2

- W8 R1：25 格判定＝24 PASS + 1 宿主单注册形态记录。
- W9 R2：24 PASS + 1 宿主形态记录；本轮无重启事件，R2 resume 语义由 R1 覆盖。
- 两轮均使用独立 runId、全新会话与 marker，并只在 `c0f8d6e` 冻结安装候选上执行。
- W8 主会话：Codex `01a0b4b8...`，Claude `a7954f30...` / `499908b1...`。
- W9 主会话：Codex `01a0b8ef...`，Claude `b8141244...` / `bf576336...`。
- 两轮覆盖 T01-T05、REG、MT1-MT5、R1-R6、S03-1..5；完整矩阵与原始记录在删除前保存于 `7dea76a` / `a066745`。

#### W10 Windows 真实原始会话补证

- Windows Codex thread：`01a0b97b-ea94-7a30-b583-a99bf9c00efc`。
- Claude 原始会话：`5efd1474-77fd-43bb-8e87-b8a99398aabd`（test-111）、`59fa1b33-8809-495c-9a7f-2e23680190d6`（test-222）。
- Codex→Claude：
  - `04138284-7124-42ae-8c21-c9532251ccc1`：武汉天气请求，`pipe-written` at `2026-09-19T11:50:36.399Z`；Claude jsonl 出现 queue-operation 与 peer user 入站帧。
  - `2d9fd0fb-08d8-47a2-92eb-1ca66bbb8847`：纽约天气请求，`pipe-written` at `11:50:37.590Z`；另一 Claude jsonl 出现 queue-operation 与 peer user 入站帧。
- Claude→Codex：
  - `90b0a903-6456-4681-a9f9-4dc1f93d75f8`：武汉天气回复，`created` / `published` / `wake-submitted` / `context-prepared`，经 UserPromptSubmit hook 注入 Windows Codex rollout。
  - `80b686f0-c8a6-41c5-964f-1f52f8e708d8`：纽约天气回复，`created` / `published` / `wake-submitted` / `context-prepared`，经 Stop hook 注入 Windows Codex rollout。
  - 重复 wake 在后续 turn 被 `wake-suppressed`，receiptTurnId 对照正确。
- W10 自动化：原生 Windows 套件 115 tests / 100 pass / 0 fail / 15 explicit skip；DPAPI register→protected blob→unwrap→named-pipe auth/frame 全链路 OK；Windows 同源安装 27/27 哈希一致。
- W10 真实冒烟原始记录：
  - Codex rollout：`C:\Users\DELL\.codex\sessions\2026\09\19\rollout-2026-09-19T19-45-01-01a0b97b-ea94-7a30-b583-a99bf9c00efc.jsonl`
  - Claude：`C:\Users\DELL\.claude\projects\D--ClaudeToCodex\5efd1474-77fd-43bb-8e87-b8a99398aabd.jsonl`
  - Claude：`C:\Users\DELL\.claude\projects\D--ClaudeToCodex\59fa1b33-8809-495c-9a7f-2e23680190d6.jsonl`
  - Bridge root：`C:\Users\DELL\AppData\Local\ClaudeToCodex\bridge-threads\01a0b97b-ea94-7a30-b583-a99bf9c00efc\`

### 1.5 测试与候选身份

| 对象 | 结果 |
|---|---|
| Linux source tree | 115 / 115 pass，0 fail，0 skip。 |
| Linux plugin tree | 115 / 115 pass，0 fail，0 skip。 |
| Installed candidate | 115 tests / 113 pass / 0 fail / 2 explicit skip（两项 release build 需 Git checkout）。 |
| Native Windows checkout | 115 tests / 100 pass / 0 fail / 15 explicit skip。 |
| Candidate verify | `VERIFY=OK checked=28 extra=0`；Python zipfile 外部校验通过。 |
| Byte reproducibility | `TZ=UTC` 与 `TZ=Asia/Shanghai` 从 `c0f8d6e` 重建均得到 `aaa5edf7...5524d6`。 |
| Dual tree | `bridge/` 与插件树字节一致。 |
| Security scan | 包内未发现 API key / bearer token；无会话凭据、配对或消息数据。 |

### 1.6 重要缺陷、返修与 SM 复核

- F-1：Windows npm shim 不能由 Node `execFile` 直接启动；修复为最小内联 PowerShell `& codex`，参数经环境传递。
- F-2：相对 / 空 / 未设 `XDG_DATA_HOME` 统一回退默认，符合 XDG 规范。
- F-5：同 sessionId 多活记录按最新 `updatedAt` 确定取得 token。
- B-1/B-2：公开获取入口与 SMOKE 平台口径修正，避免 Linux 用户误装 Windows-only v1.3.0。
- B-3/B-4：R1 隔离 home 重做为空配置标准安装，消除 TOML duplicate key、错误 marketplace 来源和继承 trust。
- M-1：ZIP 时间戳改为源 commit UTC，跨时区字节可复现。
- W1 zip writer EOCD 偏移错误、R2 安装套件 Git checkout 守卫等自测拦截也已修复。
- SM 复核先后拦截 Windows queue 启动、R1 环境污染、ZIP 非复现与文档发布口径错误；所有问题均在候选或现场收口前处置。

### 1.7 Product Backlog 适应

- PBI-16、PBI-17、PBI-18 移入已交付能力。
- Sprint 06（PBI-10+13）与 Sprint 07（PBI-12）保持待 Planning 种子。
- PBI-12 增加实测输入：Claude 会话内容衍生自动改名可能造成按名歧义与目标漂移；现有候选列表与完整 pairId 可缓解，但不能替代目标辨识研究。
- W7b Test-Acceptance Linux 移植保持显式待办，不因本轮现场通过而消失。
- Windows 真实会话补证已完成，不再作为发布阻塞项。

### 1.8 发布决策

- 发布版本：**v1.4.0**。
- 支持范围：Windows 10+ 与 WSL2 Ubuntu 24.04，同一 OS 用户内运行两侧会话。
- 不支持：原生 Linux（非 WSL2）、macOS、Windows 与 Linux 跨侧通信、跨机器通信。
- PO 决定公开推送 v1.4.0 tag，并更新 Windows 与 WSL2 日常安装。

## 2. Sprint Retrospective

### 2.1 Worked well

1. E1/E2 预研在 HOW 定稿前关闭 UDS 帧、hooks、queue、注入与 PO trust 等架构未知。
2. 候选优先执行序避免开发树证据冒充安装候选验收。
3. SM 独立复核产生实质拦截：Windows launcher、隔离 home、ZIP 复现和发布口径问题均被修正。
4. W8/W9 独立矩阵复现同一能力集，降低偶然通过风险。
5. W10 先记录 PARTIAL、再由 PO 补真实会话，最终以原始记录闭环，避免把替代证据提升为收信证明。

### 2.2 Corrected assumptions

1. Windows npm shim 不能被 Node `execFile` 直接启动；跨平台 launcher 必须实测。
2. 复制日常 config 不是隔离；会引入 duplicate key、错误来源与不可归属 trust。
3. “同输入同内容”不等于“同 ZIP 字节”；发布物时间戳必须纳入复现定义。
4. Linux UDS backlog 可能呈现 EAGAIN 而非稳定挂起；测试须尊重真实平台行为。
5. 插件 hooks 的授权 / 重载不能从安装状态推断，必须由原始会话触发证明。
6. 模型上下文、前端可见性与 PO 体验仍是不同证据层，不能互相替代。

### 2.3 Impediments and frictions

- WSL 会话 guard 阻止直接 interop，验证改用 Windows node、UNC、bundle 与脚本文件模式。
- Claude TUI 的 `C-m` 提交键偶发重试；Codex TUI 使用 Enter。
- 机器重启、glm 429 与代理偏好后台终端增加现场编排成本。
- 主树与 Developer 工作树并行产生过程材料，需要严格路径与 actor attribution。

### 2.4 Improvement actions

| 改进 | 动作 | 落点 |
|---|---|---|
| 跨平台假设早证 | 涉及 launcher、PATH、路径、文件语义的平台分支在实现时双平台探针；未证明显式列为 proof gap | `.claude/memory/cross-platform-assumptions-verify-early.md` |
| 隔离环境零复制 | 测试 home 从空配置构建，仅注入最小模型配置；禁止复制日常 config/trust/marketplace | `.claude/memory/sprint-review-retro-closure.md` 与 SMOKE |
| 发布物复现 | ZIP 时间戳来自源 commit UTC；同 commit 跨时区重建 SHA 必须一致 | release.test 与发布流程 |
| 原始会话 gate | 涉及 hooks、queue、注入或跨会话通信的改动必须列出各平台 real-session round | 后续 Sprint 检查单 |
| TUI 驱动工具化 | 将 C-m 重试、tmux 等待、恢复与证据摘录抽成可复用脚本 | 后续 Sprint 工具化 |
| 目标改名风险 | PBI-12 精化纳入自动改名、同名歧义与目标漂移 | Product Backlog |

### 2.5 Retro 结论

不修改全局 DoD。既有 DoD 足以暴露并驱动 W10 补证；本次问题不在标准缺失，而在发布前必须完整执行既定证据层。长期经验保存于项目 memory，本 Review/Retro 文档保留事实与证据索引。

## 3. 追溯与保留

| 对象 | 记录 |
|---|---|
| Planning baseline | `0d5d36f` |
| HOW v2.1 | `87d9a88` |
| Runtime freeze | `c0f8d6e` |
| WC redone record | `eccf298` |
| W8 complete | `7dea76a` |
| W9 complete | `a066745` |
| W10 automation | `a9a2062` / `0207554` / `619f5c5` |
| W10 partial record + W11 PO record + PRE-REVIEW | `0b54f04` |
| Field memory preservation | `ffd85d3` |
| Prepared integration merge | `138bcb4` |
| Candidate ZIP | `claude-to-codex-plugin-sprint08-candidate.zip` |
| Candidate SHA256 | `aaa5edf7cc8c303bb37a4aa022cb66b39968d42fb59fc6f10b3c586e555524d6` |

一次性 Sprint 过程材料在收口前记录于 `138bcb4`，可用 Git 历史检索。Developer 分支历史由合并提交保留；实现 worktree 与临时分支在发布验证和远端推送后清理。本文件是活跃仓库中的唯一 Sprint 08 总结。
