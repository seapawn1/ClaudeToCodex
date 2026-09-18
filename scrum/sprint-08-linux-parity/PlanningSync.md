# Sprint 08 Planning 同步：Linux 前置研究与当前决定

- 日期：2026-09-18。
- 来源：PO 转述的 Developer 只读研究报告，以及 PO 与 SM 的 Planning 讨论；SM 对代码与既有本机观察进行交叉核对。
- 用途：保存研究输入、回应 Developer 的疑问，并作为 PO 转交的当前同步说明。本文落盘不代表消息已直接送达 Developer。
- 当前事实与承诺以 [SprintBacklog.md](SprintBacklog.md) 为准；本文中的 HOW 机会不构成选定方案。

## 1. 已确认的方向与当前流程

PO 要求交付面向 Linux 的版本，在同一 WSL2 / Ubuntu、同一 Linux 用户下完整提供 Windows v1.3.0 已交付能力。PO 没有原生 Linux 环境；本轮以 WSL2 验收，原生 Linux 标明未实机验证。保留 Windows 既有能力并按变更影响回归；SM 已核对本机 Windows 的工具与历史项目位置，隔离测试模型和执行安排仍须在 HOW 定稿前落实，详见第 7 节 D1。

PO 已确认当前 Goal 表述，并同意新增 PBI-16（通信与到达）、PBI-17（多会话与持续使用）、PBI-18（安装、分发与使用支持）的候选组合，以及 PBI-02 / 06 / 07 的承接调整。Sprint 06 / 07 保留种子，本轮先讨论 Linux 交付。三条候选的内部优先级、容量、HOW 和 Sprint 时长尚未确定。

初次同步时仅落盘现有讨论；PO 随后交接 SM 主持精化，并在听取 Developer 风险说明及 SM 审阅后同意 E1 / E2 前置预研。Developer 已通过 v01 审阅，SM 已将意见吸收为 v02，按 PO 要求核对后提交 Git，供 PO 交接 Developer 主导第三部分。PO 暂时转述双方意见，Planning 尚未关闭，也未开始产品实现。

## 2. Developer 研究输入与证据层

| 层次 | Developer 报告的发现 | SM 核对与记录边界 |
|---|---|---|
| 官方文档 | Linux / WSL2 Claude inbox 使用 UDS，优先 XDG runtime，回退 `/tmp/cc-socks-<uid>/`；限同 OS 用户；Linux auth 行可选，Windows 必需；Linux 跨会话消息要求 Claude Code >=2.1.224。 | 初次按 Developer 报告记录；SM 后续独立复核了 UDS、同用户限制、auth、回退与 30 秒完整行超时，来源见第 5 节。XDG 优先规则和最低版本仍按 Developer 报告记录，待补对应定位。 |
| 本机真实记录 | `~/.claude/sessions/<pid>.json` 给出 UDS 地址；`.key` 文件为 0600，含 `peerToken`、`procStart`、`pidDomain`。 | SM 此前只读观察同样见到这些字段、权限及存活的项目会话 socket；未连接 socket、未认证或发送消息，因此不构成传输验证。 |
| 工具链 | Codex 0.154.0、Claude 2.1.275；queue / plugin 子命令及接口存在；Linux Node 缺失，PATH 存在 Windows npm 残留。 | SM 独立核对了两工具版本及当前 shell 找不到 `node`；queue / plugin 接口与 Windows npm 残留按 Developer 报告记录。Node 是执行验证的环境障碍，命令存在不能证明行为等价。 |
| 运行时代码 | 四处 `powershell.exe` 调用，Windows pipe 校验、DPAPI、Windows 数据根、PowerShell 回复指引，以及三条 delivery 脚本。 | SM 直接阅读确认。适配必须贯穿建联、投递、回复入口及数据定位。 |
| 测试与材料 | 一些测试无 Windows 守卫调用 PowerShell；另一些在非 Windows 跳过。文档含 Windows 路径及旧环境前置。 | Linux 测试通过必须检查实际覆盖内容，不能把跳过 Windows 路径当作 Linux 等价验证。双树继续按现有约定保持一致。 |
| 发布工具 | Developer 将 `release/*.ps1` 描述为开发侧、不入发行物。 | 需纠正：当前构建脚本归档整个 `plugins/claudetocodex` 并复制整棵插件树，插件树中有受 Git 跟踪的三条 `bridge/release/*.ps1`；按现有构建逻辑它们属于包内容。 |

发布范围核对位置：[Build-Release.ps1](../../bridge/release/Build-Release.ps1) 的 plugin 模式，以及 [插件 release 目录](../../plugins/claudetocodex/bridge/release)。

Developer 提出的“存储、多配对、原子写、锁、hooks、queue 可复用”记录为代码层判断与验证候选。特别是 Linux queue 的实际唤醒、hooks 的信任 / 加载 / 注入，以及文件权限和并发行为，均尚无本轮端到端通过结论。

## 3. 对六项问题的回应

| Developer 问题 | 当前处理 | 下一步责任 |
|---|---|---|
| 1. Linux-only 还是 Windows + Linux | 按 PO 已同意的 PBI 提案，增加 Linux 能力并保留 Windows 既有能力。是否共用传输实现、如何分支，不由 SM 指定。 | Developer 在 HOW 评估方案与变更影响；SM 落实相应 Windows 验收可行性。 |
| 2. Node 谁安装、何时安装 | Linux Node 缺失是实验与测试前置，用户侧说明归 PBI-18。Developer 已补齐 v24.14.0 用户级准备方案，SM 已核对官方来源与安装位置，详见第 7 节。 | Developer 以 Operator 身份在实验前落实并记录实际版本、来源、校验和路径，SM 复核；本次仅审阅，未安装。 |
| 3. 会话拓扑 | 已确认同一 WSL2 / Ubuntu、同一 Linux 用户。Windows 与 WSL2 跨边界通信不在当前范围。 | 无需重复询问 PO；验证脚本和案例使用此拓扑。 |
| 4. 与 Sprint 06 / 07 的顺序 | PO 已发起本轮 Linux Planning；06 / 07 保持未启动种子，本轮不引入其新增体验。编号 08 仅用于追溯。 | 不需重新决定本轮议题；容量及候选内部排序仍在 Planning 内讨论。 |
| 5. token 保护 | endpoint 明文 0600 与发送时读取宿主 `.key` 均为未定技术选项；Developer 倾向后者。尚未选择任何一种，也未认定其与 Windows DPAPI 等价。 | Developer 比较凭据暴露面、权限、会话身份和生命周期约束，说明可验证的保证与剩余限制；SM 主持讨论，涉及实质风险或体验取舍时由 PO 决定。 |
| 6. 发布工具链 | 可追溯候选、完整性校验、隔离安装和真实验证的结果要求已明确；具体构建与验证工具属于 HOW。 | Developer 比较现有工具复用、替换或其他可重复方案及成本。脚本可替换或退役，但不能据此取消既定验收能力或以未留证的手工结论代替。 |

因此，六项不是六个同等性质的 PO 决策阻塞：1 / 3 / 4 已有产品方向与范围依据，2 是环境前置，5 / 6 是仍需研究与评估的方案问题。重要未知需及时暴露，但不必等待 PO 先选技术实现才继续精化。

## 4. 尚待实证与后续审阅输入

- UDS 是否接受既有 `msgV` / `priority=next` / `session_id` 帧，认证行为及当前生成不中断的语义；官方文档中的 socket 支持不等于这些帧已通过实测。
- Linux Codex 的 `CODEX_THREAD_ID`、queue 实际投递、hooks 配置 / 信任 / 重载 / 注入及原始会话续接。
- marketplace / plugin 安装全路径、实际缓存来源、hooks 和回复入口在 Linux 的一致性。
- Claude `crossSessionInbound` 的实际行为及 PO 必要授权体验。
- PBI-16 / 17 对应的最终安装候选原始会话入站帧、自动关联和 PO 真实协作结果。
- Windows 回归环境、覆盖范围与候选证据；Linux 缺少历史安装数据时，既有兼容能力如何取得对应证据。

Developer 的统一 Node 传输设想，以及 Windows DPAPI 保留分支，均作为 HOW 素材保留。`pipe.test.mjs` 使用 Node 建立 Windows pipe 服务端，并不能单独证明拟议客户端、认证和时机语义已通过产品验证。必要的短实验在精化中先明确问题与观测条件，再按阶段交接执行。

初次同步请 Developer 阅读 Goal、候选 PBI 与以上回应，并补充文档引用和可定位的只读证据；后续实验决策与正式 PBI 审阅交接见第 5 / 6 节。

## 5. PBI-16 精化反馈：E1 / E2 前置实验提案

2026-09-18，PO 转述 Developer 对方案成熟度的补充判断：多数适配面属于已知工程工作，但 A 簇（Claude UDS 帧与认证）和 B 簇（Codex queue / hooks 唤醒与注入）缺少实测，失败可能改变通信架构。可提出基本方案形状，尚不能据此承诺实施级估算。Claude 当前 2.1.275 也超出历史 Windows 2.1.263 / 2.1.268 验证基线，实验须记录实际平台和版本。

**当前状态**：PO 已同意按 SM 补充的观察边界，将 E1 / E2 安排为 HOW 定稿前的预研实验；实验尚未执行。Developer 已将原各半日估算上修为 E1 0.5–0.75 工作日、E2 0.75–1 工作日，合计 1.25–1.75 工作日，不含环境准备；这是最新预测，尚非整体容量承诺。暂不安排发散 Ideate；追加研究的必要性依实验发现或后续方案比较再交 PO 决定。实验批准不等于产品 HOW 或实现已通过。

| 实验 | Developer 提案与学习目标 | SM 建议补足的最小观察 |
|---|---|---|
| E1：Claude UDS 帧接受 | 隔离测试 Claude 会话；比较现有帧带 auth 与不带 auth，观察接收原始会话是否出现来信，决定能否沿用既有帧格式。 | 两个变体分别留证，固定版本、接收策略及调用者关系；发送者代表另一会话，避免把接收会话自己的子进程回写当作跨会话结果。帧接受与 `priority=next` 时机分开判定，建议增加一例忙碌到达的不抢占观察。 |
| E2：Codex queue 与 hooks | 隔离 `CODEX_HOME` 的测试 Codex 会话；观察三类 hook 事件、字段及环境，检查 queue 到达和 hook 时序。 | 除 hook 执行日志，还需以最小可辨认内容观察 hook 输出实际进入模型上下文，以及 Stop 续接效果；区分 queue 自带正文与 hook 注入内容。核对 `session_id`、事件名、`prompt`、`turn_id` 等实际依赖，分别报告触发、注入及续接。 |

以下 SM 审阅补充已随 E1 / E2 安排获 PO 同意，执行细节由 Developer / Operator 落实：

1. **控制学习范围**：使用 design-kernel 的 Identify a Variable 方法限定观察对象。E1 分清认证变体、正文接受和忙碌时机；E2 分清触发、字段、输出生效与续接。无需在探针中重建完整产品。上述补充若改变原估时，由 Developer 明示影响。
2. **独立文档核对**：SM 已查阅 [Claude inbox socket 官方说明](https://code.claude.com/docs/en/cross-session-messaging#the-sessions-inbox-socket)，确认 Linux / WSL2 UDS、auth 行可选、同 OS 用户限制及 30 秒完整行超时。该说明也指出消息仍受 inbound 控制，且接收会话自身子进程存在特殊判定；这正是实验需标明调用者关系的原因。该文档没有为本实验取得实际收信证据。
3. **缩小结果推论**：任一变体通过，支持该版本与配置下的候选通路；不能据此宣布 PBI-16 可完整估算或直接决定产品去掉 token。E1 / E2 要共同反馈方案，剩余未知继续明列。失败须区分配置 / 权限 / 探针问题、证据不足和机制不支持；不因一次失败自动扩大研究或调整 Goal。
4. **字段依赖核对**：当前 `cli.mjs` 的 hook 分支从事件 `session_id` 解析数据根，普通 Codex CLI 操作使用环境中的 `CODEX_THREAD_ID`。hook 环境中缺少后者不能单独判定架构失败；两种调用场景分别记录。
5. **隔离与必要参与**：实验使用独立配置和数据，测试会话保持项目身份，避免修改日常 home 或产品配置。E2 包含 `/hooks` 信任，不能预先认定无需 PO 参与。现有项目规则为“only the PO performs PO experience and required host trust”（见 [CLAUDE.md](../../.claude/CLAUDE.md)）；Operator 预置最小人工动作集，实验与最终候选验收分别归批执行、记录实际执行者，不伪造信任状态，也不把某隔离 home 的信任沿用为另一 home 的事实。
6. **证据与停止点**：原型可以取得其测试原始会话的真实收信证据，但不得替代最终安装候选验收。每项回报环境 / 版本、变体、原始记录位置、通过 / 失败 / 未判定、未覆盖项及对 HOW 的影响；达到约定时间上限仍未解决时先回报再协商，不自动进入无限协议研究。

**Node 前置**：Linux `node` 仍未安装，`npm` / `npx` 当前解析到 Windows 路径。Developer 已补齐用户级 v24.14.0 方案，SM 的来源与路径核对见第 7 节；准备执行归 Developer / Operator，本轮 SM 未安装任何运行时。不需再次询问 PO 是否安排 E1 / E2。

PBI-17 / 18 的范围与验收精化可继续；E1 / E2 的结果影响 PBI-16 的实现可行性与估算，不暂停整个 Planning 讨论。

## 6. 精化审阅稿 v01 交接

2026-09-18，PO 同意 E1 / E2 后要求尽快完成精化，先交 Developer 审阅，通过后再由 PO 交接 Developer 主导第三部分。SM 已据此完成 [Sprint Backlog](SprintBacklog.md) 的三条 PBI、12 项 AC、基线场景与证据映射、PO 体验和研究安排；Goal 与全局 DoD 保持原文。

此次精化重点：PBI-16 明确双向发起和三类收信状态；PBI-17 明确双目标连续来信、resume、并发索引与退役 / 在途语义；PBI-18 明确标准安装、兼容入口、凭据边界、发布完整性及 Windows 回归。保留原生 Linux 未实机验证、维护增强及跨平台数据迁移不在本轮承诺的边界。

请 Developer 审阅以下内容，并以“定位 / 阻塞或建议 / 依据 / 建议措辞”回报：

1. 对照 v1.3.0 累计已交付能力，检查 12 项 AC 是否遗漏、冲突或扩入未完成 PBI 的新功能。
2. 检查现场与自动化证据分工、现有环境能否取得证据，尤其 Windows 回归、Linux legacy 样本及 PO 必要参与。
3. 核对 E1 / E2 补充观察能否回答两簇关键未知、是否影响各半日的原估；补充 Node 准备方案和必要文档依据。
4. 区分影响范围 / 验收的待决项与属于 HOW 的技术选择；本轮无需提前提交实现计划或容量承诺。

以上为 v01 发出时的审阅请求；Developer 审阅结果与 SM 的 v02 处理见下节。HOW 仍由 Developer 在 PO 交接后主导，SM 审阅；产品尚未实现，Planning 未关闭。

## 7. Developer 审阅通过与 v02 处理

2026-09-18，PO 转述 Developer 审阅结论：12 项 AC 无冲突，覆盖 v1.3.0 累计能力，未引入 PBI-03 / 10 / 12 / 13 的未交付体验。覆盖依据为 SMOKE 的 26 个场景码、Sprint 03 的 S03-09-1..7，以及 Sprint 04 / 05 Review 能力清单；S04 原逐条 AC 位于历史过程材料，本轮不声称已逐条重读该历史原文。PO 要求 SM 核对无误后提交 Git，再由 PO 交接 Developer 进入 HOW。

| 发现 | SM 处理 |
|---|---|
| D1 Windows 回归环境 | 接受其为 HOW 定稿前必须落实的执行前提；SM 已只读核对两个 Windows 目标，历史项目在当前 WSL2 的本机 Windows，不在 SSH `workstation`。工具版本可见，但可用模型和隔离环境尚未验证，D1 未完全解除。 |
| D2 缺少 sessions | S08-18-3 补入 `sessions` 列出可选会话的兼容要求及证据。 |
| D3 register 的 Linux 判据 | 补为 `register` 端点经 `pair`、`send` / `reply` 完成原会话真实往返。保留收缩范围须 PO 协商的边界，不接受只更新发布说明即可放弃既定 AC。 |
| D4 输入类别出处 | S08-16-1 映射注明：多行沿 S03 基线；中文与引号为 Linux 编码 / 引用差异新增显式检查，属于已有正文能力验证。 |
| D5 人工步骤归批 | 实验与候选验收分别预置最小 PO 动作集并归批，保留必要信任及真实执行者记录。 |
| D6 实验估时上修 | 更新为 E1 0.5–0.75、E2 0.75–1 工作日，合计上限 1.75 工作日，不含环境准备。此为执行前预测上修，不写成“仍在原各半日估算内”；实际触顶仍先回报。长工具窗口观察只证明工具边界，不能代替模型生成不中断证据。 |

### D1：Windows 回归目标与只读证据

SM 于 2026-09-18 通过 Windows PowerShell `Get-CimInstance Win32_OperatingSystem`、`Get-Command`、工具 `--version`、`Test-Path` 和不含密钥的 profile 名称检查取得以下事实；没有安装、更新或改变宿主配置。

| 目标 | OS / PowerShell | Node / Codex / Claude | 项目与 profile |
|---|---|---|---|
| 当前 WSL2 所在的本机 Windows（用户 DELL） | Windows 10 Pro 10.0.19045；PS 5.1.19041.6456 | Node v24.14.0；Codex 0.154.0；Claude 2.1.273 | `D:\ClaudeToCodex` 存在；当前 `C:\Users\DELL\.codex\config.toml` 无 profiles，未配置顶层 model / model_provider。未做模型调用。 |
| SSH 别名 workstation（用户 SeaPawn） | Windows 11 Pro 10.0.22631；PS 5.1.22621.6133 | Node v24.18.0；Codex 0.146.0；SSH PATH 未找到 Claude | `D:\ClaudeToCodex` 不存在；当前配置未见 `glm` profile。 |

因此，优先将本机 Windows 作为历史回归环境候选，由 Operator 在 HOW 定稿前落实隔离 home、可用模型及启动 / 信任安排并留证；不能机械套用当前不存在的 `--profile glm`。Claude 2.1.273 相对历史 2.1.263 / 2.1.268 已漂移，需记录实际测试版本，不能借历史通过代替新版本验证。环境就绪后，Developer 将变更影响映射到 Windows 场景：若采用统一传输层，至少包含受影响 Codex→Claude 路径的真实往返；其他宿主通信变化同样映射对应现场证据。

### Node 准备方案核对

- Developer 提案：Linux x64 Node v24.14.0，与 Windows 验证基线一致；从 [官方 tarball](https://nodejs.org/dist/v24.14.0/node-v24.14.0-linux-x64.tar.xz) 获取，按 [官方 SHASUMS256.txt](https://nodejs.org/dist/v24.14.0/SHASUMS256.txt) 校验。
- 用户级目标：`~/.local/lib/node-v24.14.0/`，`node` / `npm` / `npx` / 包内提供的 `corepack` 链接到 `~/.local/bin/`，无需 root 或修改 shell 配置。仅创建目标不存在的链接，若执行时出现冲突，先核对所有权和用途，不覆盖已有工具。
- SM 核对本机为 x86_64、官方包可取；`~/.local/bin` 当前早于所有 `/mnt/c` PATH 项，安装目录和四个同名入口均不存在。安装后由 Operator 核对实际路径、Linux 可执行文件与版本，保存 URL、SHA256、路径和执行者；SM 复核。
- SM 将官方归档读入内存计算 SHA256，与官方清单一致：`41cd79bb7877c81605a9e68ec4c91547774f46a40c67a17e34d7179ef11729df`；包内确认含 `node` / `npm` / `npx` / `corepack` 四个入口。未解压或安装；实际安装时仍校验所下载文件，实验和宿主验证待执行。
- 回滚范围限本次创建且仍指向该安装的符号链接和版本目录；保留其他工具。实验固定版本不等于重新验证了所有声明最低版本；现有 Node >=18.3 声明如因 HOW 新依赖需调整，须明确影响。

Node 准备属于已批准实验的前置工作，由 Developer 以 Operator 身份在阶段交接后落实。本次文档提交不代执行安装，也不重复请求 E1 / E2 的安排授权。
