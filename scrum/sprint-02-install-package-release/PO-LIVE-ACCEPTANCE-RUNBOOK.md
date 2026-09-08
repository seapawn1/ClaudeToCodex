# 候选 2 现场验收运行手册（PO 参与版）

目标：一轮真实使用，**共同操作、分别据实确认**——SM 记录技术检查结果（AC），PO 表达实际体验并决定是否接受（DoD）；同一轮证据支持两种结论，不拆分为两轮重复使用。缺证据或发现问题据实保留，不自动宣布 Done。Review/Retro 后正式发布，顺序不变。

## 环境隔离设计（操作员准备，PO 零配置）

| 污染源 | 隔离方式 |
|---|---|
| Planning 桥旧 hooks（`D:\ClaudeToCodex\.codex\hooks.json`） | 验收 Codex 会话在**全新项目目录** `D:\ClaudeToCodex-Accept` 启动——项目级 hooks 按项目目录加载，旧 hooks 不出现 |
| 默认数据目录与既有配对（Planning pair `8e053501…`） | 启动终端由**操作员**预设 `$env:CTC_BRIDGE_DIR = "$env:LOCALAPPDATA\ClaudeToCodex\bridge-accept-c2"`（隔离数据目录；这是文档化的隔离机制，PO 不设置任何环境变量） |
| 隔离宿主未登录模型账户（上轮受阻原因） | 使用 **PO 真实 CODEX_HOME** 启动真会话（登录状态未确认：实测 `codex login status` 未显示已登录；PO 按 CLI 实际提示自行登录，操作员不复制凭据、不改模型配置）——插件安装进真实缓存，hook 信任发生在真实会话 |

## 操作员准备（SM 或 Developer，一次性）

```powershell
New-Item -ItemType Directory -Force D:\ClaudeToCodex-Accept | Out-Null
cd D:\ClaudeToCodex-Accept
$env:CTC_BRIDGE_DIR = "$env:LOCALAPPDATA\ClaudeToCodex\bridge-accept-c2"
codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref sprint-02-install-package-release
codex plugin add claudetocodex@claudetocodex-dev
# 绑定核对：安装目录与候选 2 ZIP 逐文件一致（SHA256 185da0bf…6cb5e6b，固定 commit b6286c0）
```

**PO 的启动入口**：在 PowerShell 中运行 `& "D:\ClaudeToCodex\scrum\sprint-02-install-package-release\po-acceptance-c2\Start-AcceptCodex.ps1"`（本机执行策略 RemoteSigned 允许本地脚本，无需额外参数）——它校验插件已装、进入隔离项目目录、仅在该窗口设定验收数据目录并启动 Codex；支持 `codex resume` 会话选择器继续上次验收会话（信任 hooks 后如宿主要求重载：退出后重跑入口选 y 即可）；PO 无需手配任何环境变量或 ID。脚本为 UTF-8 带 BOM（PS 5.1 兼容，ParseFile 0 错误）。

## PO 的最少人工步骤（仅登录/授权/自然语言）

1. 在准备好的终端启动 Codex 会话；如 CLI 提示登录，按指引自行完成（实测当前 login status 未确认已登录——不作为已确认事实）。
2. `/hooks`：审核并**信任三条 `claudetocodex` hook**（一次性人工授权，产品不代改）。
3. 使用**已运行且可辨认的 Claude 会话**即可——本轮可直接选用现有 Developer 会话（名称含 `[developer]-[sprint-02]`），无需另开；如另开新会话也支持。
4. 回到 Codex 会话说：「**连接 Claude 会话 <该会话名的唯一片段>**」。
5. 按**正常方式**自然语言交流一轮真实协作：Codex 发请求 → Claude 回复 → Codex 追问 → Claude 再答。**不要求 PO 输入或重复任何测试标记**——关联由底层自动字段（messageId / pairId / conversationId / replyTo）、验收数据目录与时间窗建立，并核对接收方原始会话中的完整消息；若技术取证还需正文唯一标记，由操作员在取证环节处理，不作为 PO 的使用要求。Claude 侧按消息随附回复入口响应（入口自带本次验收的数据目录与安装路径）；业务主题建议用 1.0.0 首次使用/发布说明核查。

PO 全程不执行 register/pair、不复制任何 ID、不设置环境变量。

## 证据采集与绑定（操作员）

- **AC-08-01c hook 执行**：Claude→Codex 方向的回复会触发 Codex 会话内插件 hooks；`%LOCALAPPDATA%\ClaudeToCodex\bridge-accept-c2\events.jsonl` 中的 `context-prepared` 记录是线索起点，但**不能仅凭该文件**：须与真实宿主执行事件、原始收信会话记录、消息内唯一标记三方绑定核对（pairId=本次新 pair、时间在本轮内、标记与往返内容对应）。
- **隔离范围的限定**：本轮桥数据目录由操作员显式指定，属验收隔离；它用于验证真实 hook 执行与对话，**不单独作为默认数据目录零配置行为的证据**（该行为另有 defaultRoot 单测与无预设环境用例覆盖）。
- **AC-08-01d skill 可用**：Codex 会话记录中 claudetocodex skill 被发现/触发连接的片段。
- **候选绑定**：安装缓存目录（用户 CODEX_HOME 下 `plugins\cache\claudetocodex-dev\claudetocodex\1.0.0`）与候选 2 ZIP 的逐文件一致性 + ZIP SHA256。
- 复判（仓库运行）：`powershell -NoProfile -File bridge\release\Test-Acceptance.ps1 -HookEvidence <bridge-accept-c2\events.jsonl> -SkillEvidence <会话记录文件>`，两证齐全预期 10/0/0、退出 0。
- 全部过程资料归档至本 Sprint 文件夹（如 `po-acceptance-c2/`）。

## 回答 PO 的三个问题（口径）

1. **为何 hook 项未通过**：当前未取得真实执行证据——上轮隔离宿主未登录模型账户且 hooks 未信任，尚未观察到这一项实际运行后的结果，不能据此断言存在或不存在缺陷；产品按设计保留人工信任，SM 未代信任、未绕过。
2. **PO 能否参与**：能，且这正是下一步——同一轮真实使用同时产出技术证据与体验反馈。
3. **如何继续发布**：本轮 → AC 复判（SM 定稿技术验收）→ PO 确认 DoD → Sprint Review → Retro → 正式发布同一份候选 2 资产（不重建）。
