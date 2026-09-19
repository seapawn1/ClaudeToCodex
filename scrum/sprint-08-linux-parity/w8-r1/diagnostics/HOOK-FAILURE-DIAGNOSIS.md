# W8 R1 诊断记录：R1-2 会话 "Hook failed (exit 1)" 根因与候选 hook 健康实证

- 日期：2026-09-18 晚（W8 R1 进行中）。执行：Developer（隔离探针 home，不动 R1-2）。

## 现象

R1-2 Codex 会话（cwd＝主仓库 `/home/dell/projects/ClaudeToCodex`）每个 hook 事件报 "Hook failed / hook exited with code 1"，但 SKILL 引导、connect、status、pair 建立全部正常。

## 根因（实证）

**失败的不是候选插件的 hook，而是主树遗留的项目级 hooks**：

- `/home/dell/projects/ClaudeToCodex/.codex/hooks.json`（未跟踪本地产物，Windows 时代 install 生成）三条命令均为 `node "D:\ClaudeToCodex\bridge\cli.mjs" hook` —— **Windows 路径在 Linux 上必然 exit 1**。
- R1-2 会话 cwd 在主仓库 → codex 同时加载项目级 hooks＋插件 hooks → 项目级三条全失败（噪声来源），插件三条正常。
- 处置（PO 2026-09-19 批准）：改名 `hooks.json.windows-leftover` 保留证据；Windows 侧 `D:\ClaudeToCodex` 的 hooks.json 独立不受影响。

## 候选 hook 健康实证（隔离探针，完整复刻）

- 探针 home（独立空 home）＋探针插件（镜像产品 hooks.json 形状）捕获**插件 hook 调用契约**：`plugin-hook-contract-capture.log`——argv 空；stdin＝完整 JSON 事件（session_id/turn_id/transcript_path/cwd/hook_event_name/model/permission_mode/prompt）；env 提供 PLUGIN_ROOT/CLAUDE_PLUGIN_ROOT/PLUGIN_DATA，无 CODEX_THREAD_ID（与 E2 项目级 hook 实证一致）。
- 探针插件加装**包装 hook**（在同一 codex 事件流内调用 R1-2 安装候选的真实 `cli.mjs hook`，捕获 stdout/stderr/exit）：connect 前后全部 **EXIT=0 / stdout `{}` / stderr 空**（`real-exit-*.log`）。
- 结论：候选插件 hook 在 codex 0.154 Linux 下的调用与行为完全正常；exit 1 全部来自遗留项目 hooks。
- 附带实证：插件 hooks 与项目级 hooks 一样需要**交互信任**（探针复装后弹出 "Hooks need review" 对话框）——R1-2 首启时 PO 处理过 Trust-all（"默认就被信任了"的实义）。
- TUI 提交键实测：对话框后直接 `Enter` 可提交；`C-m` 时灵时不灵（时机敏感）——SMOKE §1b 第 3 条维持，补充记录。

## 附带现场事实

- 2026-09-19 PO 重启机器：R1-2 Codex 会话与 Claude 会话（claudetocodex-86, sessionId 0f016e5c…）均终止。R1-2 thread 将以 `codex resume` 恢复（S05-15-2 resume 复用根与 pair）；Claude 侧需新会话＋显式重连；死端点旧 pair（3100b30f…）在新链路验证后按规则 `retire --pairId` 留证。
- 探针诊断痕迹：`/home/dell/projects/ctc-hook-probe-{home,repo,work}`（throwaway；探针会话对 claudetocodex-86 的 pair 属探针线程独立根，留待清理时 retire）。
