# AC-08-01c/01d 真实宿主证据取得步骤（SM 技术验收轮）

目的：为 `Test-Acceptance.ps1` 的 AC-08-01c（hook 在真实宿主会话内执行）与 AC-08-01d（skill 在真实宿主会话内可用）取得可核对的现场证据，并证明实际执行的是**安装副本**而非开发工作区。

## 步骤

1. **隔离安装（不影响用户全局配置时）**：在临时终端设置 `$env:CODEX_HOME = "<隔离目录>"` 后启动 Codex 会话；需要真实主体验收时可直接用用户 CODEX_HOME，安装位置仍由 plugin 缓存目录区分。
2. **安装候选插件**：
   ```powershell
   codex plugin marketplace add https://github.com/seapawn1/ClaudeToCodex --ref sprint-02-install-package-release
   codex plugin add claudetocodex@claudetocodex-dev
   codex plugin list --json   # 记录 installedPath，下称 <P>，应位于 ...\plugins\cache\claudetocodex-dev\claudetocodex\<版本>\
   ```
3. **人工信任（不可自动化）**：Codex 会话内 `/hooks` 审核并信任三条 claudetocodex hook；完全退出后 `codex resume <threadId>` 重载。
4. **确认执行的是安装副本**：
   - `<P>\hooks\hooks.json` 的命令锚定 `${PLUGIN_ROOT}/bridge/cli.mjs`；hook 进程的 `PLUGIN_ROOT` 即 `<P>`。
   - 连接后让 Claude 会话收一条消息：其回复入口命令应指向 `<P>\bridge\cli.mjs`（安装副本路径），而非任何开发目录——这同时证明 hook 交付与安装副本执行。
5. **触发并采集 hook 执行证据（AC-08-01c）**：
   - Codex 会话内发送任意一条消息给 Claude（或让 Claude 回复一条），hook 在 UserPromptSubmit/PostToolUse/Stop 注入。
   - 证据文件：数据目录（默认 `%LOCALAPPDATA%\ClaudeToCodex\bridge`，或连接所用目录）的 `events.jsonl`，应含 `"type":"context-prepared"` 记录；记录中 `claim` 路径指向该数据目录。
6. **采集 skill 可用性证据（AC-08-01d）**：
   - 在新 Codex 会话中说「连接 Claude 会话」或列出可用 skill；会话记录（transcript/截图文本）中应出现 `claudetocodex` skill 被发现或触发。
7. **复判**：
   ```powershell
   powershell -NoProfile -File bridge\release\Test-Acceptance.ps1 -HookEvidence <events.jsonl> -SkillEvidence <会话记录文件>
   ```
   预期 01c/01d 转 PASS，合计 10 PASS / 0 FAIL / 0 BLOCKED、退出码 0。
   注：harness 只做计数与路径记录；来源真实性、与安装版本的绑定、内容是否为真实运行由 SM 判断。

## 当前证据状态（截至 2026-09-09）

- 已有：隔离 CODEX_HOME 下真实 Codex CLI 的 marketplace add / plugin add / list 安装证据（Test-Acceptance AC-08-01b，缓存含 bridge\cli.mjs、SKILL.md、hooks.json 且无开发目录引用）；全部模拟回归在发布副本上通过。
- 缺口：01c（真实会话内 hook 执行 + 信任流）、01d（真实会话内 skill 发现）——需交互式 Codex 会话与人工 hook 信任，headless 不可判，留待 SM 集中验收按上述步骤补做。
- 边界：Planning 桥（旧 ZIP 时代端点）日志不能代替新安装插件的证据。
