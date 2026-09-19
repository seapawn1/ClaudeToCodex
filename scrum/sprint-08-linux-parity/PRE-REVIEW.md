# Sprint 08 PRE-REVIEW（第一阶段材料，供 SM 审阅；未进入正式 Review 蒸馏）

- 日期：2026-09-19。编制：Developer（按 SM 三段指令执行）。
- 约束遵守：未删除过程材料、未写最终 docs/scrum-sprint 总结、未做 Retro、未打 tag、未发布、未清理 worktree/branch、未修改 runtime/plugin tree。

## 1. Sprint Goal 与最终结论建议

**Goal**：在 WSL2/Linux（同一 OS 用户）交付与 Windows v1.3.0 完整用户能力对等的双向消息桥；Windows 行为保持不变；原生 Linux 不验证。

**建议结论**：**达成（Output Done 达成；Outcome Done 由 PO 口头确认，已代录）**。两轮独立全矩阵 24 PASS＋1 记录形态、Windows 回归自动化层闭合（真实会话冒烟未执行，PARTIAL 结案、PO 接受）、PO 端到端体验通过。

## 2. 交付范围

- **PBI-16 双向通信与到达体验**：统一 Node 传输层（UDS＋命名管道）、POSIX 回复入口、可读到达、三时机收信、失败边界——全部现场两轮验证。
- **PBI-17 多会话与持续使用**：多 pair 按名路由、自动数据根（含让位/resume/跨根诊断）、连续与堆叠投递、状态与生命周期（retire/死端点/旧消息拒绝）。
- **PBI-18 安装分发与使用支持**：标准入口安装（Linux 双轮＋Windows 侧）、SKILL/hooks/CLI/回复指引同源、随版文档（含 Linux SMOKE 程序）、Node Build/Verify＋按源 commit 字节可复现 zip＋manifest 对照。

## 3. 12 项 AC 最终矩阵

| AC | 结论 | 证据层 | 记录位置 | 偏差 |
|---|---|---|---|---|
| S08-16-1 双向往返 | **PASS** | installed candidate＋real session×2 轮 | w8-r1/w9-r2 MATRIX-FINAL（T01/T05：四段往返同 conversationId） | 中文/引号正文含于现场消息；多行沿 S03 基线 |
| S08-16-2 收信时机 | **PASS** | 同上 | 同上（T02/T03/T04 双向三状态；T03CX/T04CX 为等价/复合证据链，时序细节已注记） | Codex 代理倾向后台终端，前台阻塞窗口以 T01CX 边界领取链覆盖 |
| S08-16-3 到达体验 | **PASS** | 同上＋原始记录行号 | 同上（S03-1：rollout 可读头行/正文/尾部 marker；回复入口 POSIX 渲染实证） | — |
| S08-16-4 兼容与失败边界 | **PASS** | fixture＋real session | 同上（长度/空白拒绝＝套件；同轮双 hook＝宿主单注册形态记录；跨轮抑制现场×3；伪造 marker 沿 S03 套件） | S03-2 双注册形态未在 Linux 现场构造（SMOKE 禁止未声明 hook） |
| S08-17-1 多目标协作 | **PASS** | real session×2 轮 | 同上（MT1-3：双 pair、按名路由零误投、回复归属） | — |
| S08-17-2 自动数据根 | **PASS** | real session×2 轮 | 同上（R1/R2/R3/R4：默认根/让位/resume/跨根诊断） | R2 第二轮无重启事件（R1 轮已证） |
| S08-17-3 连续与相近来信 | **PASS** | real session×2 轮 | 同上（R5 计数；S03-4 同窗双槽按序领取） | — |
| S08-17-4 状态与生命周期 | **PASS** | real session×2 轮 | 同上（status 全要素；MT5 retire/死端点/旧消息拒绝） | — |
| S08-18-1 标准安装 | **PASS** | installed candidate×3 | WC-RECORD＋W10-RECORD（Linux R1-2/R2＋Windows 隔离 home，均 27/27 哈希一致） | Windows home 位于 Temp（易失，已注记） |
| S08-18-2 启用与入口一致 | **PASS** | real session | W8 LOG/MATRIX（SKILL 引导自然语言连接；hooks/CLI/回复指引全部来自安装位置） | — |
| S08-18-3 使用支持与兼容入口 | **PASS** | 文档＋real session | W6 交付六件（README/INSTALL/USAGE/SMOKE/SKILL/plugin.json；Linux SMOKE §1b 程序） | 公开安装入口按"候选未发布"口径（B-1 修复） |
| S08-18-4 版本交付证据 | **PASS** | 构建产物 | W7A-RESULTS＋WC-RECORD（zip SHA、manifest schema 对照、字节可复现双 TZ 实测） | plugin.json version 仍 1.3.0（发布版本＝PO 决策） |

## 4. Output Done / Outcome Done

- **Output Done**：达成——冻结候选（c0f8d6e/aaa5edf7…）经两轮现场＋Windows 回归＋文档/构建工具交付。
- **Outcome Done**：达成——PO 口头确认六项（真实协作、零搬运、可理解来信并追问、回复入口可用、无阻塞体验问题[未细述]、协作价值达成）。来源：`w11-experience/PO-OUTCOME-RECORD.md`（代录，如实标注）。

## 5. 候选身份

| 项 | 值 |
|---|---|
| sourceCommit（运行时冻结） | `c0f8d6e84bd53711a89956578a4ef22de8a7e440` |
| candidate ZIP SHA256 | `aaa5edf7cc8c303bb37a4aa022cb66b39968d42fb59fc6f10b3c586e555524d6` |
| Linux R1 installedPath | `/home/dell/projects/ctc-s08-r1-home-2/plugins/cache/claudetocodex-dev/claudetocodex/1.3.0` |
| Linux R2 installedPath | `/home/dell/projects/ctc-s08-r2-home/plugins/cache/claudetocodex-dev/claudetocodex/1.3.0` |
| Windows installedPath | `C:\Users\DELL\AppData\Local\Temp\ctc-w10-home\plugins\cache\claudetocodex-dev\claudetocodex\1.3.0` |

## 6. 重要缺陷、返修与 SM 复核贡献

- F-1 Windows queue 启动（execFile 无法启动 npm shim）→ 内联 powershell `& codex` 修复；F-2 XDG 相对路径；F-5 多活记录策略。SM W1-W5 复核驱动。
- B-1 获取口径矛盾、B-2 SMOKE 残留、B-3/B-4 R1 配置污染（整份复制日常 config）→ 文档修正＋R1 重做为零预置 trust 标准安装；M-1 zip 非字节可复现 → commit 时间戳固定＋跨 TZ 断言；M-2 WC 标识缺失 → WC-RECORD。SM W6-WC 复核驱动，含反证实验（标准安装可行）。
- W1 EOCD 字段偏移、R2 安装套件 git 守卫等自测拦截修复。
- 现场期：主树遗留 Windows 路径项目 hooks 噪声（诊断＋PO 批准处置）；机器重启恢复流；glm 429 退避。

## 7. 仍未覆盖边界

- 原生 Linux（非 WSL2）、macOS、跨 Windows/Linux 侧通信——未验证（文档已声明）。
- Windows 真实会话冒烟（GUI 内 hooks/queue 现场）——未执行，替代证据结案（W10-RECORD PARTIAL）。
- S03-2 双注册同轮 noop 的 Linux 现场形态——按宿主单注册记录；语义由套件＋Windows S03 历史覆盖。
- crossSessionInbound 暂存策略对比体验——未执行（PO 未要求；accept 配置两轮直入已证）。
- W7b（Test-Acceptance Linux 移植）按 PO 决策后置；后置期间以 W5 自动化＋W7a 构建校验＋现场轮映射 AC。

## 8. Product Backlog 建议

- **移入已交付**：PBI-16、PBI-17、PBI-18（Sprint 08 选中项）。
- **保持待办**：Sprint 06（PBI-10+13）、Sprint 07（PBI-12）种子；W7b 移植＋Windows 真实会话冒烟补证（可并入下个 Sprint 或发布前检查单）。
- **PBI-12 增加输入**：建议补「会话内容派生自动改名造成按名歧义/目标漂移」风险条目（W8 现场重启后 86→51 改名即实例；connect 歧义错误已给候选列表缓解）。

## 9. 发布建议

- **建议版本 v1.4.0**（平台能力扩展，次版本号递增；最终由 PO 决策）。
- 支持范围声明：Windows 10+（已验证）＋WSL2 同一 OS 用户（已验证）；**原生 Linux 未验证**，文档已如实标注；公开安装入口随正式 ref 更新（B-1 口径）。
- 发布物：按源 commit 字节可复现构建（Linux/Windows 任意机器同 SHA）；manifest schema 与 1.3.0 一致。

## 10. Retro 原始素材

- **Worked well**：切片序＋候选优先执行序避免了"现场证据先于候选"返工；SM 三轮独立复核（F/B/M 编号）全部实质拦截真缺陷；E1/E2 预研把未知关闭在 HOW 之前；证据分层纪律（wire/接收/面板）让 T03/T04 类时序争议可裁决。
- **Corrected assumptions**：Windows npm shim 可 execFile（错，F-1）；复制日常 config 可作隔离 home 基底（错，B-3/4）；"同输入同字节"＝可复现（错，M-1）；插件 hook 免交互信任（错，探针证伪）；Linux UDS 满 backlog 可制造挂起（错，EAGAIN）。
- **Impediments**：会话 guard 限制 interop（绕道 node.exe/UNC 与脚本文件模式）；TUI 提交键不稳定（C-m 重试循环）；glm 429；机器重启一次。
- **Improvement actions**：跨平台启动/路径假设实现时双平台探针（已入项目记忆）；隔离环境一律零复制标准构建；SM 反证实验模式保留；TUI 驱动层抽成可复用脚本。

## 11. 待删除一次性过程材料清单（仅列清单，不执行）

- `/home/dell/projects/ctc-s08-r1-home`（失败证据，W12 随归档说明删）
- `/home/dell/projects/ctc-s08-r1-home-2`、`ctc-s08-r2-home`（收口后）
- `~/.local/share/ClaudeToCodex`（现场数据根，distill 摘录后）
- tmux 会话（s08r1/s09r2/s11r 系）
- `D:\ctc-s08-win`、`D:\ctc-s08-win` 内 w10 evidence、`/mnt/d/sprint08-frozen.bundle`
- Windows Temp `ctc-w10-home`
- SM 侧 `ctc-sm-*` 五目录（SM 自处）
- 仓库内 scrum/sprint-08-linux-parity/ 过程件按 W12 规则 distill 后离场

## 12. Git 历史追溯点（删除前关键锚）

- 基线 `0d5d36f`；HOW v2.1 `87d9a88`；SM 复核 `cc31809/07deebc/23fbc02`
- **运行时冻结 `c0f8d6e`**；候选 WC `eccf298`
- W8 `4ea0d17→7dea76a`；W9 `a066745`；W10 `a9a2062/0207554/619f5c5`；清理 `2b5bdbe`；W11 预置 `b6647ec`；记忆保全＋本 PRE-REVIEW（见最新提交）
- 合并：`sprint-08-merged` @ `f559a05`（merge-tree 零冲突预验；运行时树与冻结点一致已断言）。**SM 在主检出执行：`git merge --ff-only sprint-08-merged` 即完成并入 sprint-08。**
- 证据文件：w8-r1/、w9-r2/、w10-windows/、w11-experience/、experiments/(E1/E2/W1-W7A/SM-FIXES/WC-RECORD)、CLEANUP-RECORD.md

---

**移交 SM**：本文件＋W10-RECORD 更新＋PO-OUTCOME-RECORD＋合并分支 `sprint-08-merged` 已就绪。SM 审阅通过后进入第二阶段（正式 Review 蒸馏）。
