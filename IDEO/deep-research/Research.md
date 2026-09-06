# 深度研究报告：Claude Code 与 Codex 的跨工具协作

- **研究日期**：2026-09-06
- **研究者**：Claude Code（Developer 角色，后台研究会话）
- **对应阶段**：Design Sprint · Ask the Experts 之深度研究（"技术机制 How Things Work" + "既有尝试 Previous Efforts" 两个视角）
- **基线**：DesignMap 初稿 commit `04632d1`，五个 Questions 编号 Q1–Q5（见第 3 节）
- **方法**：本地环境核查 + 官方文档核查（双端）+ openai/codex 源码级核查 + GitHub 三路发现（编排器/协议/桥接）+ 候选仓库深读 + 本机可复现实验 6 组（E-B…E-H，其中 E-D 含六个子步骤）
- **路径说明**：任务书（`.claude/SeaPawn.md`）原定交付于 `IDEO/Research.md` 与 `IDEO/experiments/`；按 PO 2026-09-06 指示调整为 `IDEO/deep-research/` 子目录集中存放
- **执行者声明**：本研究由 7+3 个并行研究 agent 与主会话实验完成；全部关键结论可溯源（来源索引见 6.4）

---

## 1. 核心发现与建议

### 1.1 可行性总判断

**结论：在当前工具与运行条件下，跨工具双向消息是可行的，且双端都已被本机实验证实。** 主要条件是会话寻址约定与一次性的"管道信息落盘"配合；最大不确定性不在"能否通信"，而在"三方共享讨论上下文"的形态与 PO 的实际体验（Q3/Q5，需原型验证）。

三条已证实的直达通道（均作用于**接收方当前正在运行的会话**）：

| 方向 | 通道 | 证据等级 | 说明 |
|---|---|---|---|
| Claude → Codex | `codex queue --thread <UUID\|会话名> --message` | 实验证实（延迟消费）+ 源码证实（实时消费路径，真机延迟待协同实测） | 消息持久化于 `queue_1.sqlite`；同进程（挂共享 daemon 的 TUI）实时消费，跨进程由 Codex 每 10 秒轮询 sqlite 补投，未加载线程在 resume 时消费 |
| Codex → Claude | **inbox 命名管道直投**（`\\.\pipe\LOCAL\cc-msg-<hash>` + auth 令牌） | **实验证实（E-H，本机 Windows 原生）** | 官方文档明确该接口供 script/hook 使用；消息帧格式为社区逆向，本实验验证其在 2.1.263/Windows 有效 |
| Codex → Claude | `claude -p "<用 SendMessage 发给会话 X>"` 一次性桥 | 实验证实（E-D6） | 不依赖帧格式知识；一条命令把消息实时送进运行中会话 |

### 1.2 主要条件（方案成立的前提）

1. **会话寻址约定**：Codex 会话名（`/rename`，`session_index.jsonl` 可按精确名解析）与 Claude 会话名（`-n`/`/rename`，`claude agents --json` 可枚举）需要项目内约定（如 `SM` / `DEV`）。
2. **管道信息落盘**（仅管道直投路径需要）：Claude 侧用一个 SessionStart hook 把 `CLAUDE_CODE_MESSAGING_SOCKET/TOKEN` 写入约定文件，供 Codex 读取。token 仅本 OS 用户可读，文件权限需同样收紧。
3. **入站审批策略**：Claude 会话对外部消息有 accept/hold/refuse 三档；需在项目 settings 设 `crossSessionInbound`（或验证 token 认证下的默认行为——E-H 在 bypassPermissions 会话中直达，未触发 hold，与"token=own-child 判定"的文档描述一致，留待复验）。
4. **不改变日常入口**：上述通道都不要求 PO 或任何一方更换终端/TUI；消息到达**现有**会话。（若改用 Channels/Remote Control 等路径则会改变启动方式，见 4.1。）
5. **网关与认证现实**：本机 Claude Code 走自定义网关（`ANTHROPIC_BASE_URL=sdisk.cc`，项目级），认证为 oauth_token/firstParty。**Remote Control / Cloud / Channels 在项目内大概率不可用**（官方文档：网关覆盖时禁用）；且本机 help 中无 `--channels` flag（灰度未至）。凡依赖 Anthropic 云中继的路径都标记为"当前条件下不支持"。

### 1.3 最大不确定性

1. **三方共享讨论上下文（Q3）**：没有任何官方或主流开源方案提供"Claude+Codex+PO 围绕同一条讨论串"的现成形态。两个做到"双工具既有会话互发"的开源项目（chillacks、ultracode）都自建了 hub 层。我们的原型需要自建轻量共享讨论文件 + 消息引用约定。
2. **Codex TUI 运行中实时消费 queue**：源码证据充分（同进程实时 / 跨进程 10 秒轮询），但未在本机真实 TUI 上演示（需要 PO 协同的一步验证）。
3. **PO 协调负担是否减轻（Q5）**：价值假设，只能靠原型试用度量，研究无法替代。
4. **时效风险**：Codex 侧 `codex mcp-server` 已在 openai/codex HEAD（2026-09-05 commit `531f3836`）删除；Claude 侧跨会话消息的帧格式是未文档化内部接口。两者都要求方案**不深度绑定这些不稳定面**，优先走 `codex queue`（CLI 稳定面）与 SendMessage/管道（官方文档化行为）。

### 1.4 推荐方向（一句话）

**用双端官方原语自建一个约百行的"直通桥"**：Claude→Codex 走 `codex queue --thread`；Codex→Claude 走管道直投（或更简单的 `claude -p` SendMessage 桥）；三方共享讨论落在一个 repo 内 markdown 文件；PO 在自己两个终端（或一个极简网页）参与。辅以 OpenAI 官方 `codex-plugin-cc` 处理"委派评审/会话搬运"类场景。不引入重框架。

---

## 2. 研究基线与场景

### 2.1 实际环境（全部本机核查，2026-09-06）

| 项 | 值 | 证据 |
|---|---|---|
| OS | Windows 10 Pro 19045 | 系统 |
| Codex | CLI 0.153.4（npm 全局；`codex-tui` 为真实会话 originator） | `codex --version`；rollout 文件 |
| Claude Code | 2.1.263（`~/.local/bin/claude.exe`，CLI/后台会话） | `claude --version` |
| Node / gh | v24.14.0 / 2.97.0 | `--version` |
| 共享项目 | `D:\ClaudeToCodex`，分支 `design-sprint`，**无 remote（纯本地）** | `git remote -v` |
| Codex 配置 | 自定义 provider（`ai.ravenhash.org/v1`，`gpt-6-astra`，responses API）；sandbox=danger-full-access；approval=never；未配 notify；已配 `claude-code-docs` MCP 与 IDEO-Scrum 插件（PO 自有 fork，ref=codex） | `~/.codex/config.toml` |
| Claude 配置 | 项目 settings.local.json：网关 base_url+token、`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`、autoMemoryDirectory 指向项目；github 官方插件启用 | `.claude/settings*.json` |
| 项目指令 | `.agents/AGENTS.md`（Codex 读，含工作站信息）；`.claude/CLAUDE.md` 与 `.claude/memory/MEMORY.md` 均为空（如实记录） | Read |
| 认证形态 | oauth_token / firstParty（但项目级网关覆盖 base_url） | `claude auth status` |
| 本机不存在 | `--channels` flag（Channels 灰度未至） | `claude --help` 检索 |

**角色分工实据**：Codex 全局 `~/.codex/AGENTS.md` = IDEO-Scrum **Scrum Master** 输出风格；本项目 Claude Code 输出风格 = **Developer**。Codex 真实会话中 multi_agent 已激活（developer 消息注入 `/root` primary-agent 指令）。

**形态区分声明**：本报告所有结论按形态标注（CLI/TUI 交互、headless `-p`/`exec`、SDK、IDE 扩展、桌面 App、Cloud）。对桌面 App 与 IDE 扩展未在本机核查，相关结论只引用官方文档。

### 2.2 三个协作场景的消息流（研究目标场景，逐项记录）

#### 场景 A：Developer 遇到困惑，主动向 Scrum Master 提问

| 项 | 内容 |
|---|---|
| 发起者 | Claude（Developer 会话） |
| 接收者 | Codex（SM 会话，按会话名寻址） |
| 触发时机 | Developer 工作中需要澄清（任意时刻） |
| 通道 | Developer 执行 `codex queue --thread <SM会话名> --message "<问题+上下文引用>"` |
| 所需上下文 | 问题正文 + 相关文件路径/摘要（消息是纯文本，不带历史）；SM 会话内自带项目上下文（AGENTS.md） |
| 回应方式 | SM 会话（运行中）收到排队消息并开新回合——实时或 ≤10 秒为**源码级结论**（真机延迟待一次协同实测）；若 SM 会话未开，消息持久化，SM 下次 resume 时消费（本机已证） |
| PO 操作 | 无需中转；可在自己终端看到双方会话的动静；紧急时直接在任一会话补充意见 |

#### 场景 B：围绕计划交换意见，Developer 审阅并提出反馈

| 项 | 内容 |
|---|---|
| 发起者 | 任一方（SM 发计划草案 → Developer 审阅；或 Developer 反馈） |
| 接收者 | 另一方：SM 发→Dev 收；Dev 发→SM 收 |
| 触发时机 | 计划草案落盘后（Sprint Planning 节点）、评审请求、或任一方主动发起 |
| 通道 | 双向：SM→Dev 用管道直投/`claude -p` 桥；Dev→SM 用 `codex queue` |
| 所需上下文 | 计划文档落盘（如 `IDEO/` 或 Backlog 任务文件），消息引用路径——**共享文件是上下文的载体** |
| 回应方式 | 双方各自在自己会话内读到对方消息（运行中实时），多轮往返 |
| 后续行动 | 结论写回共享文件（Sprint Backlog / 任务卡），双方会话均可读 |
| PO 操作 | 在任一终端参与拍板；或只看共享文件的 diff |

#### 场景 C：PO 与 SM Review，Developer 参与同场讨论

| 项 | 内容 |
|---|---|
| 参与者 | PO + Codex(SM) + Claude(Dev) 三方 |
| 通道 | 同 B 的双向通道 + 共享讨论文件（如 `IDEO/discussions/<日期-主题>.md`，append-only） |
| 触发时机 | Review 时间点（SM 主持）；SM/PO 的发言经通道分发到 Dev 会话，Dev 的补充经通道回投 SM 会话，PO 在自己终端直接可见三方消息 |
| 所需上下文 | Review 材料（Increment/报告）+ 讨论文件累计内容 |
| 回应方式 | 各方在自己的会话内回应；关键结论由任一方 append 到讨论文件 |
| PO 操作 | 在两个终端间看讨论（或一个极简网页汇总三路输出）；决策直接在任一会话或讨论文件中作出 |
| 已知缺口 | "同一条讨论串的三方统一视图"无现成实现，需原型提供（哪怕只是共享文件 + 消息互相引用） |

### 2.3 已确认约束

1. Windows 原生环境；tmux 系方案（claude-squad、ccgram、CCB 稳定线、cli-agent-orchestrator）不可用或仅 WSL/beta。
2. `codex app-server daemon` 生命周期管理（start/stop/bootstrap）**仅 Unix**（本机实验报错）；但 `codex app-server` stdio 直连与控制 socket 在 HEAD 源码支持 Windows（0.153.4 未核对）。
3. 自定义推理网关（双端均非官方直连）→ 依赖 Anthropic/OpenAI 云中继的能力（Remote Control、Cloud、Channels）在本项目内不可用或未灰度。
4. 推理网关在高并发（~9-10 并发流）下过载（本机实测 503）→ 协作消息与批量研究需控制并发。
5. 仓库无 remote → GitHub 类共享介质（issues/PR/Cloud）当前不可用（可加 remote 解锁，属 PO 决策）。

---

## 3. Q1–Q5 证据表

状态标记：**已证实**（本机实验）/ **源码证实** / **官方文档** / **部分成立** / **未验证** / **当前条件下不支持**。

### Q1 双方能否主动发起沟通并使对方接收和回应？

**结论：已证实（双向）。**

| 子项 | 状态 | 证据 |
|---|---|---|
| Claude→Codex 到达**已退出/未加载**会话 | 已证实 | E-C：queue 后 `codex exec resume` 逐字引用探针消息 |
| Claude→Codex 到达**运行中** TUI | 源码证实，未真机演示 | openai/codex@6af3454：同进程 `wake_if_loaded` 实时；跨进程 `watch_external_messages` 每 10s 轮询 `PRAGMA data_version`（`codex-rs/ext/queue/src/service.rs`/`lib.rs`）；README L964 "thread becomes idle 时自动提交" |
| Codex→Claude 到达**运行中**会话 | 已证实 ×2 | E-D5/E-D6（SendMessage 桥）；E-H（原始命名管道帧，忙碌会话工具间隙投递成功） |
| Codex→Claude 续接既有会话内容（以分叉副本形式） | 已证实 | E-D3/E-D4：`--resume --bg` 对运行中会话分叉副本并完整继承上下文（原会话不受影响） |
| 双向均不改日常入口 | 已证实 | 全部通道作用于现有会话/现有 TUI |

缺口：queue→运行中 TUI 的 10 秒轮询在 Windows 真机的表现（PO 协同一测即可）。

### Q2 双方能否获得足够上下文、准确理解并有用回应？

**结论：部分成立——消息层已够，深层共享需约定。**

- 消息是纯文本、不带发送方历史（双端一致：Claude 消息"不含发送者历史/文件"；codex queue 只有 text 输入）→ 消息必须自带"上下文指针"（文件路径+摘要），这符合本仓库已有习惯（AGENTS.md/CLAUDE.md/IDEO 文件共享）。
- 双方会话各自有项目上下文（Codex 读 `.agents/AGENTS.md`；Claude 读 `.claude/`）——**两边项目指令文件不同名且内容已分叉**（`.agents/AGENTS.md` 有工作站信息；`.claude/CLAUDE.md` 为空）：跨工具协作应统一或互链项目指令，列为条件。
- 会话级搬运存在官方件：`/codex:transfer`（codex-plugin-cc）把 Claude 转录导入 Codex 线程；Codex `/import` 一次性导入 Claude 设置+最近聊天。
- 未验证：长讨论中"引用哪个文件、引用到什么粒度"的约定是否足以避免误解——属原型观察项。

### Q3 三方能否围绕同一问题持续讨论并掌握待回应/结论/分歧？

**结论：当前条件下不支持（无现成方案）；自建轻量共享讨论层可行。**

- 官方无跨工具共享讨论形态；Claude 的跨会话消息只在 Claude 会话间；Codex queue 只进 Codex 线程。
- 开源界做到"双工具既有会话互发"的 chillacks/ultracode 都是自建 hub + 共享文件（chillacks 有频道/DM/ack/claim 锁；ultracode 传共享目录路径而非内容）。
- 可借用原语：Claude `notify_when_idle`（订阅对端空闲一次性通知）；双端 Stop/回合边界钩子；共享 markdown 讨论文件（append-only）。
- PO 侧"统一视图"：最简=共享文件+两个终端；进阶=chillacks 式本地网页（可后置）。

### Q4 沟通能否形成明确后续行动并由相应角色接续？

**结论：部分成立（消息→回应的机制已证实；"形成明确行动并接续"依赖项目约定与行动落盘规范）。**

- Codex 侧：queue 消费即自动开新回合（接续行动的入口）；Sprint Backlog/任务文件为行动载体。
- Claude 侧：收到消息空闲即开新回合（同上）；后台会话/attach 机制保证会话可驻留。
- 行动落盘（任务文件/讨论文件）后双方会话都能读取——闭环成立。
- 参照：Backlog.md 把"共享任务台账+三检查点人审"做成了成品（双工具、Windows、零依赖），可作为行动层范本。

### Q5 能否减轻 PO 的协调负担？

**结论：未验证（价值假设）。**

- 现状痛点（任务书 `.claude/SeaPawn.md` 原文："目前双方共享项目文件，本次交接由 PO 转达"）：PO 目前是唯一传输介质。
- 预期收益：通道直连后 PO 从"传话者"变为"旁观者+决策者"；Review 场景三方同场减少复述。
- 验证办法（原型成功/失败信号，见 5.3）：试用一周，度量 PO 中转次数、等回复耗时、上下文错乱次数、PO 主观负担评分。
- 风险：三路消息若混乱（重复触发、互相唤醒的对话环路），反而加重负担——双端都有环路限流（Claude 消息循环自动节流；Codex queue FIFO 上限 100 条），但需在原型中观察。

---

## 4. 官方能力与 GitHub 候选比较

### 4.1 双端官方能力矩阵（触达"运行中会话"的机制）

#### Claude Code 2.1.263（官方文档 code.claude.com，检索 2026-09-06）

| 机制 | 状态 | 作用域 | 关键限制 |
|---|---|---|---|
| 跨会话消息 SendMessage/ListAgents | **GA 默认开启** | 本机运行中会话（含后台）；跨机需 Remote Control | 发送方必须是 Claude 会话；纯文本；队列 50/hold 100 上限；环路限流 |
| **inbox 管道（script/hook 投递）** | 官方文档化（Windows v2.1.234+，命名管道+auth 令牌） | 运行中会话 | 消息帧格式未文档化（社区逆向，本机实验验证可用）；30 秒内须发完整行；入站三档控制 |
| Stop 钩子 | 稳定 | 回合结束免键入注入 | 仅回合边界；外部数据需 hook 主动读文件 |
| UserPromptSubmit 钩子 | 稳定 | additionalContext 注入 | 被门控在用户下次提交输入 |
| FileChanged 钩子 | 稳定 | 唯一"外部写文件即触发"的钩子 | 输出不进模型上下文（只能提示用户/改 env） |
| Channels（外部事件推送） | research preview | `--channels` 启动的会话 | **本机无此 flag**；需 Anthropic 认证；无法挂到已运行会话 |
| 后台会话 + agent view | research preview | `--bg`/`/bg`/attach/logs/stop | 完成后 ~1h 无人 attach 被停（转录保留） |
| `--resume`/`--fork-session` | 稳定 | 磁盘转录续接 | 对运行中会话=分叉副本（E-D3）或不报错交错写（双终端 resume） |
| `claude -p --cloud <id>` | 稳定 | **仅云会话** | 不适用本地 |
| Remote Control（手机/网页镜像） | 稳定 | 本机会话+claude.ai 面 | 需订阅登录且网关未覆盖——**本项目内当前不可用** |
| notify_when_idle | 稳定（v2.1.236+） | 本机另一会话空闲/退出一次性通知 | 12h 过期；仅主对话 Claude 可订阅 |
| agent teams（实验 flag） | experimental | lead+队友 | 队友是新进程；Windows 仅 in-process 显示 |

负面结论（文档全文检索）：无任何"外部进程排队消息到本地运行中会话"的 CLI 子命令（`claude queue` 不存在）；tmux send-keys 类终端注入无官方支持声明；Notification 钩子仅内部事件、只出不进。

#### Codex CLI 0.153.4（官方文档 learn.chatgpt.com——developers.openai.com/codex 已 308 迁移至此；源码 openai/codex@6af3454）

| 机制 | 状态 | 作用域 | 关键限制 |
|---|---|---|---|
| `codex queue`（=RPC `thread/queue/add`） | CLI 可用（协议标 experimental） | 既有会话（运行中实时/10s 轮询；未加载则 resume 消费） | 100 条/线程；FIFO；按 UUID 或**精确会话名**寻址；不支持图片 |
| app-server 协议（JSON-RPC：thread/start\|resume、turn/start\|steer\|interrupt…） | experimental | 外部客户端附着/驱动会话（VS Code 扩展即参考客户端） | "experimental, not for production"；daemon 生命周期管理**仅 Unix**；stdio 直连 Windows 待核 |
| `codex mcp-server`（codex/codex-reply 工具） | **0.153.4 尚在但已弃用；HEAD 已删除**（2026-09-05 `531f3836`） | MCP 客户端多轮委派（threadId 寻址，E-F 实证可用） | 会话活在 server 进程内；**勿作长期方案**；继任=app-server/codex-plugin-cc |
| hooks（12 事件） | stable | 会话生命周期（含 exec/headless） | UserPromptSubmit additionalContext ~2500 token 上限；Stop block+reason=续跑提示词；hooks.json 四层加载（含 repo `.codex/`） |
| `notify`（agent-turn-complete） | 稳定（legacy，将移除） | turn 完成时执行用户程序，payload 含 `input-messages`+`last-assistant-message` | 仅用户级配置；单向出站；app-server 形态是否触发未证实（issue #13019） |
| TUI steer/queue（Enter/Tab） | 稳定 | 本 TUI 内 | 人工输入，非外部通道 |
| `codex exec`/`exec resume` | stable | headless 续跑同线程 | 新进程重放 rollout |
| `codex resume/fork` | stable | 交互恢复/分叉 | 新进程 |
| multi_agent（子代理） | stable/enabled | 会话内 | 子代理间无点对点通信；`collabToolCall`（sender/receiverThreadId）是协议中预留的线程间消息原语（语义未文档化） |

### 4.2 GitHub 候选对比（发现层：三路扫描，27+ 仓库入表，5 个重点）

**全景结论**：没有任何主流（>1k★）项目能"接管用户已开的 Claude+Codex 会话互发消息"。做到的只有两个新生个人项目（chillacks 0★、ultracode 4★），且其核心推送同样依赖 `codex queue` 与官方消息机制。社区对 Codex 的外部推送全部走 `codex queue --thread` 或 PTY 打字；**无人用 app-server daemon 做 agent 间通信（空白）**。（三路扫描共 27+ 仓库入考察清单，见 6.4；下表列 16 个代表性仓库；深读 3 个，见 4.3。）

| 仓库 | ★/License | 双工具 | 挂接既有会话 | Windows | 与本项目关系 |
|---|---|---|---|---|---|
| **cpuchip/chillacks** | 0 / MIT（当天仍在更新） | ✅（Codex 经 bridge） | ✅ 双方 | ✅ 原生 PowerShell | 机制最贴近：hub+频道+DM+PO 网页+foreman 审批；地基 Channels 本机不可用→**借鉴设计** |
| **diepquynh/ultracode** | 4 / MIT（深读确认） | ✅（+Grok/Antigravity） | ✅（会话注册/adopt） | 部分（install.sh） | MCP hub 模式参照；Codex 推送=codex queue |
| **openai/codex-plugin-cc** | 32.8k / Apache-2.0（官方） | ✅（单向 Claude→Codex） | 部分（rescue 线程/transfer） | ✅（npm） | 官方互操作件：review/rescue/transfer/review-gate；自定义 provider 兼容 |
| **MrLesk/Backlog.md** | 6.6k / MIT | ✅ | ✅（不动会话形态） | ✅ | 共享任务台账层（行动层范本） |
| chenhg5/cc-connect | 15.4k / MIT | ✅（+10 agent） | ❌（会话迁入其框架） | 有构建记录 | Multi-Bot Relay=三方同群讨论现成品；重框架 |
| SeemSeam/claude_codex_bridge | 3.5k / AGPL | ✅（16 CLI） | 半（自家 pane 内可接管） | beta（重依赖） | /ask 跨 agent 协作图+共享记忆文件 |
| chaitanyagiri/munder-difflin | 6.4k / MIT | ✅ | ❌ | ✅ 构建 | 文件邮箱 hive+审批门（机制范本） |
| openclaw/acpx | 3.2k / MIT | ✅ | ❌（ACP 无头） | claude.exe 已适配 | 统一无头驱动+flow 编排 |
| BloopAI/vibe-kanban | 28k / Apache-2.0 | ✅ | ❌（issue #3293） | ✅ | **2026-04 官方停运**转社区；看板+逐 agent 对话 |
| slopus/happy | 23.7k / MIT | ✅ | 半（须 happy 启动） | 未声明 | 双工具移动客户端+Happy Agent CLI |
| alexei-led/ccgram | 263 / MIT | ✅ | ✅（tmux 注入+转录旁读） | ❌ WSL2 | "附着真实会话"的机制范本 |
| awslabs/cli-agent-orchestrator | 1.2k / Apache-2.0 | ✅ | ❌ | ❌ WSL | supervisor/specialist 结构同构 PO-SM-Dev |
| 协议类：A2A（25.6k）/ ACP（4.2k）/ AHP（303）/ agent-inbox（1.1k） | — | 需包装 | ❌ | 各异 | A2A 过重；ACP 适配器可作无头统一层；AHP 观察 |

负面澄清：opcode（22.4k★）为 getAsterisk/claudia 改名（现 winfunc/opcode），**仅 Claude 单工具**（任务线索中"BloopAI/opcode"归属有误）。

### 4.3 重点仓库深读发现（chillacks / ultracode / codex-plugin-cc）

三个仓库均为当日 commit 深读（引用格式：文件@commit）。

#### A. cpuchip/chillacks @ `26c701c`（MIT，2026-09-06 当天 HEAD；README 末尾"private for now"一句已滞后——仓库实际 public，LICENSE/package.json/GitHub API 三方确认 MIT）

- **架构**：hub.mjs（127.0.0.1:8790，SSE `/stream` 下行 + POST `/send` 上行）+ 每座位一个 shim。**座位（seat）= 一名一流**：`members: Map<name,{write,end,authed}>`，同名重连即驱逐旧流。
- **身份防伪造**（值得整体借鉴）：tokens.json `{座位名: token}`，铸造 `crypto.randomBytes(24)`、文件 mode 600、list 只报名不报值；hub 只认 `x-chillacks-token` 头，body 里的 from 字段被完全忽略——"伪造按构造不可能，而非靠 policing"；ws 长连接用 60 秒单次票（防止 token 泄露于会话转录）；fs.watch 热加载只升不降。
- **Claude 座位**（本机不可用）：channel.mjs 声明 `claude/channel` 能力，SSE → `notifications/claude/channel` 推入会话；硬前提 `--dangerously-load-development-channels server:chillacks`（自定义 channel 不在预览 allowlist）；缺 flag 时事件按官方文档**静默丢弃**。
- **Codex 座位**（本机最可借鉴，逐行已读）：耳朵=codex-bridge.mjs 独立进程（先于 TUI 800ms 启动），听 SSE → 渲染成 `[chillacks DM] from X: …` → FIFO 串行 `execFile(codex, ["queue","--thread",thread,"--message",text])`；嘴=TUI 内 MCP 工具（chillacks_send 等，from 由 token 保证）。**回复不靠读 rollout**——rollout 只用于线程发现。
- **Codex 线程寻址三级**：①`CODEX_THREAD`=UUID/精确名；②TUI 首条命令 `/rename <座位名>` 约定；③自动发现：扫 `~/.codex/sessions/年/月/日/*.jsonl`，只预读首 8KB 的 `session_meta`，比对 `cwd`（反斜杠归一+小写）且 birthtime≥bridge 启动-5s，1.5s 轮询、120s 上限，取最新者。
- **PO 参与**：四个面——裸 HTTP POST（任意终端）、portal.mjs 网页（以 PO 座位 token 连接、tail room.jsonl 全量 firehose、textContent-only 渲染防注入）、手机桥、CLI status。**foreman 不是人类**，是一个 Claude 座位：升级矩阵只把"不可逆/对外发布/花钱/意图愿景"交给人类，且"direction, not permission"（不能授出自己没有的权威）。
- **实测口径**：DM→bridge→queue→回复 ≈1 分钟（作者 2026-09-06 实测）；安全上经历过一次 CSRF 实况修复（README 记录）。
- **对本项目的可移植判断**：hub/座位/PO 参与层与 channels **解耦度中等**——把 Claude 座位的传输从 channel 通知替换为我们已验证的 inbox 管道直投（E-H），hub 层消息模型基本不动。

#### B. diepquynh/ultracode @ `1b3fc51`（MIT 确认；node>=22.5，仅依赖 MCP SDK+zod；main HEAD 2026-09-05）

- **架构**：loopback HTTP daemon（默认 45777）+ hub.json 发现文件（url/port/token/pid/version，客户端每请求重读）+ SQLite（sessions/adoptions/messages/tasks）。四 harness（Claude/Codex/Grok/Antigravity）经各自 shim 以 stdio MCP 服务 "ultracode-gate" 注册。
- **三层寻址**：`session_key=harness:id`（注册时 hub 生成 + 每会话 16 字节 secret 一次性下发，重注册即轮换）；共享 ultracode 会话按目录名；原生推送地址 `native_address||harness_session_id`（codex=线程 UUID；claude-uds 按 `/rename` 名匹配 `~/.claude/sessions/<pid>.json` 记录）。
- **投递序（架构级蓝本）**：消息先 COMMIT 再投递（零丢失）；①收件方停在 daemon 内 55s 长轮询 waiter → 直接 resolve；②否则按 harness 原生推送**只发唤醒通知**（"N new message(s)… call msg_wait"，**永不携正文**——把脆弱逆向通道的攻击面砍半）；③推送失败静默降级为排队拉取。游标（cursor）语义：读不销毁、ack=推进，幂等重发安全；"body carries addresses not content"（传共享目录路径不传内容，64KiB 上限）。
- **`mcp/lib/push/codex.js` 约 70 行、零依赖，可原样移植**：`codex queue --thread <UUID|名> --message <通知>` 单次调用 + `queue --help` 特性探测 + 500ms 超时。
- **claude-uds 推送适配器是最大不确定项**：逆向协议仅在 2.1.251/Unix 验证；Windows 上 Node 连不了文件系 UDS 路径——对本案大概率不可用，**应用已验证的 SendMessage/管道替代**（设计上失败即降级拉取，不破坏正确性）。
- **Windows 移植评估**（深读结论）：核心 daemon/shim/REST/SQLite/锁**开箱即用**（全 Node、node:path）；install.sh 是 bash（需手动路径重装）；SIGTERM→TerminateProcess 硬杀差异；`execFile("codex")` 需处理 .cmd shim（shell:true 或显式 codex.cmd）。**建议只摘取源码级组件（codex push、cursor 收件箱、注册协议），不整装**（整装会带上其 pipeline hooks 的行为约束）。
- 特殊机制：跨 harness 会话认领（adoption link 文件，模型不可写）；Codex 侧"密封通道 spawn 票"（Codex 会 spawn 加密子代理——用单次票携带凭证而非明文 prompt）；YOLO 模式的用户特权边界写进工具描述（"模型不得自行发起"）。

#### C. openai/codex-plugin-cc @ `db52e28`（Apache-2.0+NOTICE；v1.0.6；main HEAD 2026-07-08——近两月无 push）

- **架构**：Claude Code 插件（命令全部收敛为 `node scripts/codex-companion.mjs <子命令>`）包装本机 codex 二进制的 **app-server**（JSON-RPC over stdio）。两种模式：direct spawn；**共享 broker**（detached 常驻进程独占一个 app-server，跨 Claude 会话复用；端点 win32=`\\.\pipe\<名>-codex-app-server` 命名管道——Node 原生支持；busy 时第二 socket 回 -32001，仅 `turn/interrupt` 例外放行）。
- **Windows 适配（代码级一等，CI 仅 ubuntu）**：spawn 一律 windowsHide；跨平台 spawn 用 shell（.cmd shim 需要）；进程树终止 `taskkill /PID <pid> /T /F`；git 强制 shell:false 防注入（HEAD commit 即此事）；SessionStart hook 以 POSIX 风格 `export` 行追加 `CLAUDE_ENV_FILE`（Windows 下成立）。
- **通用模式（可摘取）**：①SessionStart hook 把 session_id/transcript_path 注入 env——外部工具挂接 Claude 会话身份的官方姿势；②线程命名+发现约定（"Codex Companion Task: " 前缀 + `thread/list{searchTerm}` 兜底）；③detached 后台作业体系（三级落盘：state.json 摘要/jobs/<id>.json 详情/jobs/<id>.log 日志，2s 轮询/240s 超时）；④turn 捕获状态机（通知缓冲至 turnId 确定、final_answer 后 250ms 排空推断完成）。
- **/codex:transfer**：Claude 转录 → `externalAgentConfig/import` RPC → Codex 侧内容寻址台账（sha256）→ 打印 `codex resume <id>`。**一次性导入、无增量同步**（转录追加后重跑会生成新线程）；转换规则在 openai/codex 仓（`codex-rs/external-agent-migration/`），本仓不可见。
- **Stop hook 评审门**：ALLOW:/BLOCK: 首行契约 + `decision:block` 阻断停止形成 Claude↔Codex 修正循环——**无循环上限**，README 明确警告限额消耗，需主动监视才启用。
- **边界**：`--resume` 只能续插件自建线程（job 台账+sourceKinds:[appServer] 过滤），**不能接管用户 TUI 已开线程**；无"推送到运行中 Claude 会话"通道（回收全靠拉取/打印 resume 命令）；自定义 provider 兼容=架构结果（全部委托本地 codex 配置），非显式实现。

#### 深读层综合判断

1. **给 Codex 的推送，两个独立项目都收敛到 `codex queue --thread`**（chillacks 的 bridge 与 ultracode 的 push 适配器互不知晓却同构）——与本机 E-C 实验形成三方互证，该通道的社区置信度可视为已收敛。
2. **"唤醒通知不带正文 + 正文走拉取"**（ultracode）与 **"回复走会话自己的嘴、不旁读转录"**（chillacks）是两条可直接采纳的健壮性设计。
3. **PO 参与面**两案给出不同答案：chillacks=对等座位+全量 firehose 网页；ultracode=PO 注册为普通会话。我们的 v0 用"两终端+共享讨论文件"即可，v1 可抄 chillacks portal。
4. **codex-plugin-cc 提供的不是对话而是委派**：它解决了"Claude 会话身份注入 env""Windows 命名管道 broker""会话转录搬运"三块工程难题，即便不整装也值得当参考实现读。

---

## 5. 关键验证记录与候选路径

### 5.1 实验一览（详细记录见同目录 `experiments-2026-09-06.md`）

| 编号 | 假设 | 结果 |
|---|---|---|
| E-B | Codex headless 在 Windows+自定义 provider 可用 | ✅ PONG，thread 可寻址 |
| E-C | queue 消息持久化并在 resume 时进入上下文 | ✅ 逐字引用探针 |
| E-D1/2 | `claude --bg` 后台会话 + `agents --json` 外部注册表 | ✅（pid/sessionId/state 可枚举） |
| E-D3 | `--resume --bg` 对运行中会话的语义 | ✅ 分叉副本（不注入原会话） |
| E-D4 | 分叉副本上下文连续性 | ✅ 完整继承 |
| E-D5 | SendMessage 实时注入运行中会话 | ✅ 原会话 busy 处理并回应 |
| E-D6 | `claude -p` 一次性桥（外部最短命令） | ✅ 一条命令触达运行中会话 |
| E-F | `codex mcp-server` Windows 可用性/工具面 | ✅ codex+codex-reply（但官方已弃用，HEAD 删除） |
| E-G | `claude mcp serve`（Claude 作 MCP server） | ✅ 至少暴露 Agent 工具→反向委派通道 |
| E-H | **inbox 命名管道原始帧直投运行中会话** | ✅✅ 帧格式（社区逆向）在本机验证有效；忙碌会话工具间隙收到 |

负面/限制实验发现：`codex app-server daemon` 生命周期管理 Windows 报错；`--channels` 不存在；推理网关 ~9-10 并发流过载。

### 5.2 代表性路径比较

| 路径 | 组成 | 可直接复用 | 需适配/自建 | 维护成本 | 主要不确定性 |
|---|---|---|---|---|---|
| **P1 原生直通桥（推荐）** | queue（C→X）+ 管道直投或 p 桥（X→C）+ 共享讨论文件 | 全部官方机制（已实验证实） | 会话名约定、SessionStart hook 落盘、讨论文件规范、（可选）PO 汇总网页 | ~百行脚本，随双端版本升级偶发维护 | 管道帧格式属未文档化接口（已验证但可能变）；queue→TUI 实时性待真机确认 |
| P2 官方插件辅助 | codex-plugin-cc（review/rescue/transfer） | 官方维护 | 只覆盖 Claude→Codex 委派，非对话 | 低 | 插件两个月未 push；transfer 单向 |
| P3 共享台账（Backlog.md） | 任务=repo 内 .md，双工具 MCP/CLI 接入 | 成品 | 消息层仍缺（需叠 P1） | 低 | 非实时讨论 |
| P4 重框架（cc-connect/CCB/munder-difflin） | IM 群/工作台 | 成品体验 | 会话迁入其框架；部分 WSL/beta | 中-高 | Windows 成熟度；改变日常入口 |
| P5 协议层（A2A/ACP） | 包装双端为标准 agent | 标准 | 两端包装服务 | 高 | 过重，当前无收益 |
| P6 云中继类（Channels/Remote Control/Cloud） | Anthropic/OpenAI 云 | — | — | — | **当前条件下不支持**（网关覆盖/灰度未至） |

### 5.3 最值得先做的快速原型（推荐）

**"直通桥 v0"——一天内可完成的粗糙原型，只回答一个问题：三个目标场景在真实工作流里能否跑通？**

组成（全部用已验证机制）：
1. **约定**：Codex SM 会话命名 `SM`（TUI 内 `/rename SM`）；Claude Developer 会话命名 `DEV`（`claude -n DEV`）。
2. **C→X**：DEV 会话中直接执行 `codex queue --thread SM --message "<问题>（上下文：<文件路径>）"`。
3. **X→C**：DEV 会话装一个 SessionStart hook（`CLAUDE.md` 或 settings 指示 Claude 在会话开始时把 SOCKET/TOKEN 写入 `.agents/bridge/dev-inbox.info`，文件权限限本用户）；给 Codex 的 `.agents/AGENTS.md` 追加一段投递说明+PowerShell 片段（E-H 骨架）。
4. **共享讨论文件**：`IDEO/discussions/`，append-only，每条注明角色与时间。
5. **PO 参与面**：v0 就用两个终端 + 讨论文件；（v1 可选）百行本地网页聚合三路输出（chillacks portal 思路）。

**成功信号**（可观察）：
- 场景 A：DEV 提问→SM 在其运行中会话收到并回答→DEV 收到回答继续工作，全程 PO 零中转；
- 场景 B/C：一轮三消息以上的往返后，讨论文件出现三方一致认可的结论与行动项；
- 定量：一天内 PO"传话次数"降为 0；消息端到端延迟 ≤15 秒（queue 轮询上限 10s + 余量）。

**失败信号**：
- 消息被 hold/丢失（入站审批策略问题）；
- SM/DEV 互相触发造成对话环路或刷屏；
- PO 表示"看两个终端+文件比原来传话更累"（Q5 证伪信号）；
- 管道帧格式/队列行为随版本升级破坏（出现即回退到 `claude -p` 桥并记录）。

---

## 6. 专家讨论输入

### 6.1 DesignMap 第一节修订建议（供讨论，不直接改稿）

1. **Challenge**：基本成立，建议补一句已验证事实——"研究已证实双端存在直达运行中会话的消息通道，挑战重心移至三方共享讨论的形态与 PO 体验"。
2. **Goal**：不变。
3. **Questions 修订**：
   - Q1 → 已回答（已证实），可改写为收敛性问题："直通桥的实时性与稳定性是否满足日常节奏？"（新增，来源：E-C 源码级 10s 轮询 + 未真机验证）
   - Q2 → 保留，聚焦"上下文引用约定"（建议明确为：消息必须携带文件路径+摘要的约定是否足够）
   - Q3 → **升级为当前核心问题**："共享讨论文件 + 双向直通，能否让三方掌握待回应/结论/分歧？"
   - Q4 → 保留（原型观察）
   - Q5 → 保留（价值假设，原型度量）
   - 新增 Q6（来源：基线核查）："PO 是否接受/偏好为协作增加的极小配置成本（hook 落盘、会话命名约定）？"

### 6.2 画 Map 所需事实（参与者/步骤/交互/断点）

- **参与者（左）**：PO（决策/参与）、Codex-SM（流程守护/主持）、Claude-Dev（实现/研究）、共享仓库文件（AGENTS.md/CLAUDE.md/IDEO/*，三方共同读写）。
- **结束状态（右）**：三方在各自会话中完成一轮"提问→讨论→决策→行动落盘"，PO 不再担任传话介质。
- **关键步骤（5-15 步草案）**：会话开启与命名 → hook 落盘桥信息 → Dev 工作中遇疑 → C→X queue 提问（引用文件）→ SM 会话收到（实时/≤10s）→ SM 回答经 X→C 管道回投 → Dev 继续/澄清（多轮）→ 结论 append 到讨论文件 → 行动项写入 Backlog/Sprint 文件 → 各角色接续执行 → Review 时三方同场（PO+SM 终端，Dev 双通道）。
- **断点（最易断的环节）**：①会话名解析失败（重名/改名）；②token 文件缺失或过期（会话重启后 SOCKET 变化）；③入站 hold 审批（策略未设 accept）；④queue→TUI 轮询延迟/会话未开；⑤消息不带上下文指针导致误解；⑥讨论文件并发写冲突（append-only 缓解）；⑦网关过载时段消息堆积。

### 6.3 待 PO 回答的问题

1. Codex 日常入口是否就是终端 TUI？（rollout 证据指向是；影响：无需为协作装 IDE 扩展/App）
2. 是否接受 DEV 会话用 SessionStart hook 把消息管道地址+令牌落盘到 repo 内约定文件（权限限本用户）？若否，Codex→Claude 退用 `claude -p` 桥（略慢、起子进程，但零配置）。
3. 消息延迟容忍：≤15 秒可接受吗？（决定是否需要进一步压 queue 轮询间隔）
4. 三方讨论的统一视图：v0 两终端+共享文件是否够？是否要 v1 本地网页？
5. 是否需要手机/异地参与（Remote Control 路线）？若需要，需解决网关覆盖问题（全局而非项目级配置），涉及认证策略，请 PO 决定是否值得。
6. 是否愿意引入官方 codex-plugin-cc（装在 Claude 侧）作为"委派评审/会话搬运"的补充？
7. 仓库是否加 remote（解锁 GitHub 类共享介质）？当前结论不依赖它。

### 6.4 来源索引（检索日期均为 2026-09-06）

**官方文档（Claude）**（均为 https:// 前缀，检索 2026-09-06）：
- 核心四页（承载主要结论）：`code.claude.com/docs/en/cross-session-messaging`（含 inbox socket 节；Availability 声明 native Windows 需 v2.1.234+）、`code.claude.com/docs/en/channels` 与 `code.claude.com/docs/en/channels-reference`（研究预览声明）、`code.claude.com/docs/en/hooks`（事件×注入语义表；页面基准 v2.1.261）
- 其余：`code.claude.com/docs/en/{hooks-guide, interactive-mode, scheduled-tasks, sessions, agent-view, agent-teams, remote-control, claude-code-on-the-web, headless, cli-reference, settings-reference, errors, changelog}` 与 `code.claude.com/docs/en/agent-sdk/sessions`；changelog 含 2.1.240 条目"Windows: cross-session messaging is now available"
- 版本口径：各页版本标记最高见 v2.1.261（hooks 等），与 installed 2.1.263 的逐条对齐未做（方向一致，无回退证据）

**官方文档（Codex）**：learn.chatgpt.com/docs/ — config-file/config-advanced（notify）、config-sample、hooks、prompting（steer/queue）、developer-commands、non-interactive-mode、mcp-server（弃用声明）、app-server、remote-connections、agent-configuration/subagents、cloud、import、changelog（至 0.153.4/2026-09-04）。注：developers.openai.com/codex 已 308 迁移至 learn.chatgpt.com。

**官方源码**：github.com/openai/codex@`6af3454`（2026-09-06 HEAD）— codex-rs/{cli/src/queue_cmd.rs, tui/src/session_queue_commands.rs, app-server/src/request_processors/thread_queue_processor.rs, ext/queue/src/{service,lib}.rs, state/src/{runtime/queued_items,sqlite}.rs, app-server/README.md（L942-964 queue 语义）, app-server-transport/src/transport/mod.rs, hooks/src/{lib,types,legacy_notify}.rs, rollout/src/{session_index,rollout_file_name}.rs, tui/src/session_archive_commands.rs, mcp-server/src/*（读自 tag rusty-v8-v150.4.0=`12b3e88`）}；删除 commit `531f3836`（2026-09-05，mcp-server 移除）、`5e3a6fe4`（2026-08-20，弃用警告）。

**社区**：github.com/PeterSR/claude-code-socket-transport（帧格式逆向，基于 v2.1.233）；anthropics/claude-code#2929（programmatically drive instances 的 feature request）。

**候选仓库**：cpuchip/chillacks（**深读 @`26c701c`**：hub.mjs/channel.mjs/codex-bridge.mjs/launch-codex.ps1/portal.mjs/tokens.mjs 等 14 文件）、diepquynh/ultracode（**深读 @`1b3fc51`**：mcp/lib/{hub,push}/、hooks/、commands/、docs/hub.md 等 29 处）、openai/codex-plugin-cc（**深读 @`db52e28`**：scripts/、lib/、plugins/codex/、tests/ 等 24 处）、MrLesk/Backlog.md、chenhg5/cc-connect、SeemSeam/claude_codex_bridge、chaitanyagiri/munder-difflin、openclaw/acpx、BloopAI/vibe-kanban（含 vibekanban.com/blog/shutdown、issue #3293）、slopus/happy、alexei-led/ccgram、smtg-ai/claude-squad、awslabs/cli-agent-orchestrator、kingbootoshi/codex-orchestrator、kamrul1157024/helios、simion/termic、21st-dev/1code（archived）、winfunc/opcode（前 getAsterisk/claudia）、RichardAtCT/claude-code-telegram、JessyTsui/Claude-Code-Remote、chenhg5/agencycli、openabdev/openab、a2aproject/A2A、agentclientprotocol/agent-client-protocol、microsoft/agent-host-protocol、langchain-ai/agent-inbox。星数/许可/活跃度均为当日 GitHub API/页面实测。

**资料冲突记录**：
1. ccsock（基于 v2.1.233）称"Native Windows 无跨会话消息"↔ 官方文档/changelog（v2.1.234+ named pipe、2.1.240 宣布 Windows 可用）——采用官方口径，且 E-H 本机实证支持官方口径。
2. Codex 文档仍载 mcp-server 用法 ↔ HEAD 已删除（2026-09-05）——采用源码事实，标注 0.153.4 过渡期可用。
3. Codex 文档 developer-commands 未列 queue/agents 子命令 ↔ 本机 0.153.4 help 存在 + 源码实现完整——采用"代码先行、文档滞后"结论并标注。

---

## 附：给 Codex（Scrum Master）的交接

> **报告位置**：`IDEO/deep-research/Research.md`（含实验记录 `experiments-2026-09-06.md`），分支 `worktree-deep-research-report`。
> **最关键发现**：双端"外部进程→运行中会话"的直达通道均已本机实证——Codex 侧 `codex queue --thread <会话名> --message`（持久化已实证；运行中 TUI 实时/≤10s 消费为源码级结论，真机延迟待一次协同实测）；Claude 侧 inbox 命名管道直投（`\\.\pipe\LOCAL\cc-msg-<hash>` + auth 令牌 + msgV 帧，已实证）或 `claude -p` SendMessage 桥（已实证）。三方共享讨论无现成方案，需自建轻量共享讨论文件层。
> **推荐方向**：P1"原生直通桥"（约百行：会话命名约定 SM/DEV + SessionStart hook 落盘管道信息 + queue/管道双向 + append-only 讨论文件），辅以官方 codex-plugin-cc。最值得先验证的原型见 5.3。
> **待决定事项（PO）**：7 问见 6.3（入口确认、hook 落盘授权、延迟容忍、讨论视图、异地参与、官方插件、是否加 remote）。
> **下一次专家讨论最需要回答**：①queue→运行中 TUI 的真机延迟（需 SM 协同实测一次）；②共享讨论文件的形态是否足以支撑三方 Review（Q3）；③PO 的 Q5 体验如何度量。
