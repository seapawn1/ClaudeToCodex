# Sprint 04 / PBI-11 原型设计笔记（多配对扩展）

- 状态：预研稿，2026-09-13。作者：Developer（Claude 会话 6aeef5d8）。
- 基线：已发布 1.0.0（`bridge/` @ main 2b46e77）。本目录为隔离原型，不改产品源码。
- 范围：一个 Codex 原始会话 ↔ 至少两个 Claude 原始会话，配对共存、目标确定、回复归属、重叠来信三态。不含任意规模、广播、并发吞吐、自动启动/恢复。

## 1. 单配对触点清单（1.0.0 实测代码，非假设）

| # | 位置 | 单配对假设 | 多配对影响 |
|---|---|---|---|
| 1 | `store.pair()` / `getPair()` | 数据根下唯一 `pair.json`；不同配对直接抛错拒绝 | 改为配对注册表（每配对一文件），保留"不静默替换"语义 |
| 2 | `store.caller(env)` | 环境变量必须匹配唯一配对的双侧之一 | Codex 侧唯一（本桥数据根服务一个 Codex 会话）；Claude 侧按 claudeId 定位配对 |
| 3 | `store.prepare()` | 隐式读唯一配对 | 显式传入配对：reply 按被回复消息的 pairId 定位；codex 新发送按目标名称定位 |
| 4 | `store.publish()` | `pending/<codexId>` 单槽，占用即抛"wait for it to be consumed" | 改 `pending/<pairId>` 每配对一槽；不同配对互不占用 |
| 5 | `store.take(event)` | 只认唯一配对的 codexId 与唯一槽 | 扫描全部 `pending/<pairId>/`，按消息 createdAt 最旧先取；唤醒文本带 pairId 时优先取该槽 |
| 6 | `handleHook()` | `pair.codexId` 单配对门控；唤醒抑制按唯一 pair.id | 门控改为注册表共享 codexId；唤醒抑制按注册表查 pairId |
| 7 | `cli.mjs connect` | `store.pair()` 一步建唯一配对 | upsert：同 claudeId 更新端点，不同 claudeId 新增共存配对（codexId 必须一致），记录 claudeName 供目标选择 |
| 8 | `cli.mjs send` | 无目标参数 | `send --name <目标>` 必填（reply 不变，按 --to 归属） |
| 9 | `cli.mjs status` | 单配对 + 单待收 | 列出全部配对及各自端点观察、待收槽、最近事件 |

## 2. 已具备的多配对基础（无需改动）

- 消息模型：`pairId` / `conversationId` / `replyTo` / 双侧 sessionId 本来按配对隔离；`validMessage` 按配对校验。
- `endpoints/claude-<sessionId>.json` 按 sessionId 存放，天然多端点；`connect` 合成端点的逻辑与目标数量无关。
- Codex→Claude：每端点独立命名管道 + `priority=next`，无共享资源，无串扰路径。
- 唤醒文本 `[CTC-WAKE <pairId> <messageId>]` 已携带 pairId，天然可区分多配对。
- `receipts/<messageId>.json` 全局按 messageId 去重，重复注入抑制与配对数无关。
- `wire/`、`claims/`、`messages/` 均按 messageId 全局唯一，配对数无关。
- `renderPeer` 的回复入口按 `--to <messageId>` 解析，与配对数无关。

## 3. 设计决策

### D1 配对注册表

- 存储：`pairs/<pairId>.json`，每文件 `{ id, codexId, claudeId, claudeName, endpointPath, createdAt }`，`{ flag: 'wx' }` 写入，沿用现有崩溃安全风格；不用单索引文件（避免写坏全表）。
- 不变量：同一数据根内所有配对 `codexId` 必须一致——本桥目录服务一个 Codex 原始会话；违反即抛错，不猜测。
- 共存上限：原型不设硬上限，但不承诺任意规模（验收最低 2 个）。
- `connect` upsert 语义：同 `{codexId, claudeId}` → 沿用配对、端点路径变化时更新 `endpointPath` 并记 `endpoint-updated` 事件；不同 claudeId → 新配对（事件 `paired`）；不影响其他配对（S04-11-1 连接 B 不拆 A）。
- legacy 继续使用（SM 5a2d818c-2 修订）：同身份重连时对旧 `pair.json` 做**端点显式刷新**——仅更新 endpointPath，id/createdAt 不变，记 `legacy-endpoint-updated` 事件；不新写注册项、不静默替换。
- 退役（retire，S04-11-6 边界）：显式操作，注册文件移入 `pairs-retired/`（留证、不覆盖），事件留痕；**在途约定（SM 8a03ed6b 表述）**：退役不撤销已接纳消息的原收件归属与后续领取资格——take 对在册配对做严格双方校验，对已退役配对按存档身份（双侧 sessionId）校验后仍投递并在收据标注 pairRetired；pairId 无处可查（既不在册也无存档）为诚实未知：不注入、槽内留证、逐次记 unknown-pair-letter 事件；失败保留证据并如实报未知，不承诺"必达"。retire 不因有待收而拒绝；退役后新发/新回复在 prepare 即拒；重复唤醒对已消费的退役信保持抑制。retire/publish 真实交错（staging→retire→迟落槽）有 fixture 复现。
- 迁移：数据根存在旧 `pair.json` 且无 `pairs/` 时只读识别；跨身份新配对可共存。

### D2 目标确定（S04-11-2）

- Codex 新发送：`send --name` 必填。名称在注册表内解析：唯一匹配 → 该配对；无匹配 → 报错并列出可选用目标；多义 → 报错并列出候选与各自 claudeName/sessionId 尾号/项目上下文，要求更精确名称。不猜测、不默认最近使用。
- 名称只是选择依据：投递身份始终是配对的 claudeId + endpoint.sessionId 双重核对（沿用 1.0.0 的 `endpoint.sessionId !== pair.claudeId` 校验），端点失效即失败，不静默改投。

### D3 回复归属（S04-11-3）

- `reply --to <msgId>`：按消息文件定位 `pairId` → 加载该配对 → 校验调用方身份（claude 调用方须等于该配对 claudeId；codex 调用方须等于共享 codexId）。不匹配即报错，正文不落盘。
- 归属链只看被回复消息，与最近发送、当前选择、候选排序无关（代码路径上 `prepare` 不接受"当前目标"默认值即可保证）。

### D4 待收槽与重叠三态（S04-11-5，2026-09-13 按 SM 澄清修订）

- 每配对一槽 `pending/<pairId>/`，槽内仍为"整目录 rename 原子发布"。
- **接纳**：publish 成功把整条消息原子放入该目标的槽。A、B 互不占用，各自 wake 独立入队；Codex 每次钩子事件至多注入一条。可观察：两条正文先后出现在同一 Codex 原始会话，各自 messageId 完整、`context-prepared` 与收据各一次。
- **等待**：仅指已被接纳（在槽内、可被后续处理）但尚未注入的消息——例如它的 wake 先于前一条的消费到达、或尚未有下一次钩子事件。等待是显式可查状态（状态入口可见槽内 messageId），不是丢失。
- **拒绝（未接纳）**：同目标槽已被占用时，第二条 publish 抛错——该消息**未进入投递路径**，不是等待；报错含占用中的 messageId 与下一步（等消费后再发）。另一类拒绝：端点失效/身份不符 → pipe 写入失败，`send-error` 记录原因与下一步，不自动重试、不静默改投。
- 无覆盖（每槽 wx+rename）、无串目标（claim 时按消息 pairId 重验）、无重复注入（全局收据去重）。

### D5 注入顺序的统一对外保证（D4/D5 合并口径）

- **唯一顺序保证**：每条被接纳的消息由它自己的唤醒驱动注入，注入顺序 = 唤醒到达顺序；无唤醒提示的钩子事件（PostToolUse/Stop）按跨目标最旧（createdAt，并列按 slot 名稳定排序）兜底取一条。
- 由此派生：不承诺全局按创建顺序投递（唤醒可乱序），但承诺**不遗留**——任何已被接纳的消息，要么被自己的 wake 注入，要么被任意后续钩子事件（包括指向其他目标的陈旧 wake）按最旧兜底注入；重复 wake 被抑制并如实说明，不重复注入。
- `handleHook`：无配对 → `{}`（同 1.0.0）；`event.session_id` ≠ 共享 codexId 或带 agent_id → `{}`。唤醒文本先经完整 UUID 校验再参与路由：形状匹配但非法（如 36 个连字符）按普通输入处理，可作投递机会但绝不抛错（SM 复审 4d9f6031 修复，回归测试 T13）。
- 上述保证已用三个专门场景验证（见 §4 T5-T7）：唤醒顺序与创建顺序相反、重复唤醒、另一目标仍待收时收到陈旧 wake——均无遗留、无重复。

### D7 隔离自保护（SM 复审 4d9f6031 修复）

- 原型不自行选择数据根：`defaultRoot()` 要求显式 `CTC_BRIDGE_DIR`，且解析后不得等于日常默认桥目录（大小写不敏感），否则抛错拒绝运行——connect/register/pair/status/send/reply/hook 全部入口经构造函数先行受护。
- 与 1.0.0 的差异是有意的：产品版有稳定日常根，原型版宁可拒跑也不碰在用数据。回归测试覆盖"缺失""误指日常目录""合法测试目录"三态（T11 单元 + T12 CLI 层：exit 1 且报错，无任何写入）。

### D6 状态入口

- `status` 输出：配对数组（各含 claudeName、claudeId/codexId、createdAt、endpointPath 是否存在、待收槽无/有及 messageId）+ 最近事件。原型先给结构化输出；可读化呈现属 Sprint 03 / PBI-09 范畴，不在本原型展开。

## 4. 原型验证（fixture 层，已实施：`test/multi.test.mjs`，13/13 通过并复跑稳定，2026-09-13）

| # | 测试 | 覆盖 |
|---|---|---|
| T1 | 配对共存与重连不扰他 | S04-11-1：connect A/B 并存、重复 connect A 幂等、异 codex 拒绝 |
| T2 | 旧 `pair.json` 只读可见并可与新配对共存 | S04-11-7 迁移前置（迁移本身未实测） |
| T3 | 目标名唯一解析、不猜测；caller 恰一原始会话 | S04-11-2 |
| T4 | 回复沿被回复消息归属；B 不能劫持 A 线程 | S04-11-3 |
| T5 | 两目标相近来信均接纳、逐事件注入、收据唯一 | S04-11-5 接纳 |
| T6 | 同槽第二条 publish 被拒（未入槽、不覆盖） | S04-11-5 拒绝（未接纳） |
| T7 | 唤醒顺序与创建顺序相反仍各自送达、不遗留 | S04-11-5 / D5 统一保证（SM 场景一） |
| T8 | 重复唤醒被抑制、不重复注入 | S04-11-5 / D5（SM 场景二） |
| T9 | 陈旧 wake 落到仍待收的最旧目标、无遗留 | S04-11-5 / D5（SM 场景三） |
| T10 | 单目标路径在多配对代码上不回退 | S04-11-7 fixture 前置 |
| T11 | 无/误指日常目录的 `CTC_BRIDGE_DIR` 拒跑（单元） | D7 隔离自保护 |
| T12 | CLI 层拒跑：exit 1 + 报错、无写入 | D7 隔离自保护（CLI 层） |
| T13 | 形状匹配但非法的唤醒文本不抛错、按普通输入处理 | D5 健壮性（SM 复审） |

宿主加载、真实执行与原会话收信三层尚未覆盖，归 W4 真实闭环；fixture 通过不等于收信。

## 5. 未决问题（向 SM/PO 报告后定）

- 专用测试 Codex 会话启动方式（W4 前需明确）。
- 旧 `pair.json` 单配对数据的实测迁移与"继续使用/重建"路径放到 S04-11-7 阶段，原型仅设计。
- `claudeName` 在配对文件内快照化（连接时的名称）；会话改名后名称与身份的关系如何呈现，待 S04-11-2 真实场景定。

## 6. 实测暴露的新缺口（run1，2026-09-13）

- **同名会话替换导致名称路由歧义且无恢复路径**：run1 中测试 Codex 连接了 s04-claude-a/b（旧会话 735205d4/8f1b1e4a）；按 PO 纠正重启 A/B 后（新会话 90cdb961/438a61f5），若再 connect 同名新会话，注册表将出现两条 claudeName 相同的配对，`resolveTarget` 按名称必然歧义，而原型刻意不含生命周期操作（归 PBI-10/13），无法显式退役旧配对。产品必须在 S04-11-6 定义：目标死亡的呈现（状态入口可见 endpoint/alive）、同名重建的显式路径、以及歧义时以 sessionId 尾号等身份信息辅助选择。run1 桥数据已归档（s04-test-bridge.run1-archived）留证。
- **隔离 home 下的 queue 需要 CODEX_HOME 指向**：跨环境向测试 Codex queue 消息时，调用方必须设隔离 CODEX_HOME，否则报 no rollout found——已记入 runbook。
- **测试 Claude 的启动目录按 PO 纠正**：测试对端以 ClaudeToCodex 项目会话身份在 D:\ClaudeToCodex 启动（获得正常项目上下文），需要操作测试文件时再 Set-Location 过去；不再以 AppData 空目录为 cwd。
