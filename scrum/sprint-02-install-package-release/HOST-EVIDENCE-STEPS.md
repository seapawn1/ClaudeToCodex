# AC-08-01c/01d 真实宿主证据取得步骤（SM 技术验收轮）

目的：为 `Test-Acceptance.ps1` 的 AC-08-01c（hook 在真实宿主会话内**执行**）与 AC-08-01d（skill 在真实宿主会话内可用）取得可核对的现场证据。三层证据必须区分，不得互相替代：

1. **安装位置**：插件缓存目录存在且内容与候选一致（文件级，不证明任何执行）。
2. **宿主加载**：宿主 API 原始响应显示 skill 被发现、hooks 定义被加载、`PLUGIN_ROOT` 正确展开（加载级，仍不证明 hook 已运行——未信任时 trustStatus=untrusted）。
3. **真实 hook 执行**：hook 命令在宿主会话事件中实际运行并交付消息（执行级）。注意：Claude 收到的消息里回复入口指向安装路径**只证明发送端 renderPeer 生成了该路径**（发送端本就运行安装副本时可生成它），不构成 hook 执行证据；hook 执行证据以宿主事件与数据目录 `events.jsonl` 的 `context-prepared` 记录为准，并与会话/版本绑定核对。

## 步骤

1. **隔离安装（不影响用户全局配置时）**：在临时终端设置 `$env:CODEX_HOME = "<隔离目录>"` 后启动 Codex 会话；需要真实主体验收时可直接用用户 CODEX_HOME，安装位置仍由插件缓存目录区分。
2. **安装候选插件**：
   ```powershell
   codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref sprint-02-install-package-release
   codex plugin add claudetocodex@claudetocodex-dev
   # 安装位置从缓存布局求解（0.153.4 的 plugin list 不含安装路径；add 输出才含）：
   $ch = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
   $P = Get-ChildItem (Join-Path $ch 'plugins\cache\*\claudetocodex\*') -Directory |
        Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty FullName
   ```
   记录 `$P`，并核对 `$P` 内容与候选 ZIP 一致（安装位置层证据）。
3. **人工信任（不可自动化）**：Codex 会话内 `/hooks` 审核并信任三条 claudetocodex hook（信任前 trustStatus=untrusted，hook 不会执行）；完全退出后 `codex resume <threadId>` 重载。
4. **采集宿主加载证据（AC-08-01d 与加载层）**：新会话中列出/触发 skill，保存宿主 API 原始响应（skill 发现、hooks 定义加载、`PLUGIN_ROOT` 展开、trustStatus）为 `-SkillEvidence` 输入。
5. **采集真实执行证据（AC-08-01c，执行层）**：在已信任的会话内发送一条带唯一标记的消息给 Claude（或触发任一 hook 事件）；证据文件为数据目录（默认 `%LOCALAPPDATA%\ClaudeToCodex\bridge`，或连接所用目录）的 `events.jsonl`，须含 `"type":"context-prepared"` 记录。核对该记录与本次会话/安装版本的绑定（pairId、时间、claim 路径）。
6. **复判（注意运行方式与预期值不同）**：
   ```powershell
   # 仓库运行（含 01b 宿主安装检查）：两份证据齐全时预期 10 PASS / 0 FAIL / 0 BLOCKED，退出码 0
   powershell -NoProfile -File bridge\release\Test-Acceptance.ps1 -HookEvidence <events.jsonl> -SkillEvidence <宿主响应文件>
   # 包内运行（-PluginDir <解压目录>）：01b 按口径始终 BLOCKED（包不含 marketplace 根），
   # 两份证据齐全时预期 9 PASS / 0 FAIL / 1 BLOCKED，退出码 1——这不是失败，是包内运行的正确预期
   powershell -NoProfile -File <解压>\bridge\release\Test-Acceptance.ps1 -PluginDir <解压目录> -HookEvidence <events.jsonl> -SkillEvidence <宿主响应文件>
   ```
   注：harness 只做计数与路径记录；来源真实性、与安装版本的绑定、内容是否为真实运行由 SM 判断。

## 当前证据状态（截至 2026-09-09）

- 已有：隔离 CODEX_HOME 下真实 Codex CLI 的安装/清单核对（01b）；全部模拟回归在发布副本通过；SM 已取得候选 1 的宿主加载层证据（skill 发现、新线程加载 3 条 hooks、PLUGIN_ROOT 展开，宿主 API 原始响应），hooks trustStatus=untrusted。
- 缺口：hook 实际执行（需人工信任后触发）与候选 2 安装下的同项绑定复验——留待 SM 集中验收补做。
- 边界：Planning 桥（旧 ZIP 时代端点）日志不能代替新安装插件的证据。
