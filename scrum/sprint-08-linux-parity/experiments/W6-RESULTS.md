# W6 切片结果：文档六件双平台化（Sprint 08）

- 日期：2026-09-18。执行：Developer。
- 交付物：README.md、INSTALL.md、bridge/docs/USAGE.md、bridge/docs/SMOKE.md（以上含插件树副本同步）、plugins/claudetocodex/skills/claudetocodex/SKILL.md、plugins/claudetocodex/.codex-plugin/plugin.json、RELEASE-NOTES.md 候选条目。

## 各件要点

| 文件 | 变化 |
|---|---|
| SKILL.md | 标题范围双平台；插件根定位 PowerShell＋bash 双段；命令路径统一正斜杠；Boundaries 段改双平台（数据根基址两平台、token 策略差异、原生 Linux 未验证） |
| plugin.json | description 去 Windows-only（"Windows and WSL2/Linux…"）——包内容变化计入 W7a manifest 对照 |
| README | 定位句双平台；已验证环境补 Linux 候选行（WSL2 Ubuntu-24.04 / codex 0.154.0 / claude 2.1.275 / Node v24.14.0，"验收以 Sprint 08 收口证据为准"）；开发验证入口改双平台说明（Test-Acceptance 仍 Windows 侧，W7b 后置如实记录） |
| INSTALL | 前置双平台（同一 OS 用户、PATH 注意事项）；更新保留数据按平台两处路径；排查命令块 PowerShell＋bash 双段 |
| USAGE | 安装前置双平台；数据基址平台化（%LOCALAPPDATA% ↔ ~/.local/share，XDG 空串语义）；§5 已验证范围分平台列版本；未验证边界重写（原生 Linux/macOS/跨侧通信不提供，token 策略差异声明） |
| SMOKE | 前置 1/7/8 双平台化；**新增 §1b Linux 现场程序要点**：环境清洗清单（E2 教训的完整变量表）、首 turn 前置（no rollout found 属预期）、tmux 驱动 C-m 提交键、证据路径 $CODEX_HOME 化与 WSL2 路径注意；证据规则 Codex 路径改 $CODEX_HOME |
| RELEASE-NOTES | 顶部新增"未定版候选：WSL2/Linux 平台对等"条目（状态候选未发布、版本由 PO 决定；主要变化/候选基线/边界） |

## 诚实边界

- 所有"Linux 已验证"表述均绑定"Sprint 08 候选，验收以收口证据为准"口径——文档冻结在 WC（候选安装于 W8/W9 现场轮之前），若 W8/W9/W10 现场证据与文档表述冲突，以证据为准并在 W12 更新。
- crossSessionInbound 体验（W11 PO 动作）与原生 Linux 未验证边界已写入 USAGE/SMOKE。

## 验证

- 双树 diff 字节一致；双树测试 **220/220 / 0 fail / 0 skip**（110×2）。
