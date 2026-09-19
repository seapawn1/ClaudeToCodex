# Sprint 08 中间产物清理记录

- 执行者：cleanup subagent（Developer 侧）
- 日期：2026-09-19
- 动机：PO 指示 Developer 自行清理中间环境产物；原 SM 提示词作废。
- 范围规则：每项删除前先 `ls` 回显核对；除明确列出的 5 个路径外未动任何东西；验收证据链路径仅做只读存在性确认。

## 已删除（证据已归档进仓库）

| # | 路径 | 删除时间 (CST) | 删除前核对摘要 |
|---|------|----------------|----------------|
| 1 | `/home/dell/projects/ctc-hook-probe-home` | 2026-09-19 18:5x | 隔离探针 HOME：含 `installation_id`、`version.json`、`shell_snapshots/`、`sessions/`、`skills/`、多个 `*_*.sqlite` 状态库、顶层 `capture/`、`plugins/`（下仅 `cache/`）。注：与提示词所述 `plugins/capture` 字面不符——实际为顶层 `capture/` + `plugins/cache`，但整体特征明确为探针 home，判定符合删除条件。 |
| 2 | `/home/dell/projects/ctc-hook-probe-repo` | 2026-09-19 18:5x | 探针仓库：仅 `.git/`、`plugins/probehook/`、`.agents/plugins/`，是 W1 传输层探针用的一次性 git 仓库。 |
| 3 | `/home/dell/projects/ctc-hook-probe-work` | 2026-09-19 18:5x | 空目录（仅 `.`/`..`），符合临时工作目录特征。 |
| 4 | `/home/dell/projects/ctc-s08-r1-work2` | 2026-09-19 18:5x | 空目录（仅 `.`/`..`），符合 W8 R1 临时工作目录特征。 |
| 5 | `/home/dell/projects/ctc-s08-r2-work2` | 2026-09-19 18:5x | 空目录（仅 `.`/`..`），符合 W9 R2 临时工作目录特征。 |

每项删除后均以 `ls -ld <path>` 确认返回 "No such file or directory"。

## 保留项（删除后回_echo 确认）

`ls /home/dell/projects/ | grep ctc-` 剩余：

- `ctc-s08-r1-home` —— 失败证据，保留
- `ctc-s08-r1-home-2` —— W8 R1 安装候选 home，保留
- `ctc-s08-r2-home` —— W9 R2 安装候选 home，保留
- `ctc-sm-c0f8-build-shanghai`、`ctc-sm-c0f8-build-utc`、`ctc-sm-w7a-exact-rebuild`、`ctc-sm-w7a-rebuild`、`ctc-sm-wc-verify-home` —— **不在本次删除清单内，也未列入保护清单**；按"除明确列出外不得动"规则未触碰，留待后续处置决定。

其他保护项均以只读 `ls -ld` 确认存在、未做任何修改：

- `/home/dell/projects/claude-to-codex-release-sprint08`（冻结候选构建产物）
- `/home/dell/.local/share/ClaudeToCodex`（产品数据根，两轮证据）
- `/mnt/d/ctc-s08-win`、`/mnt/d/ClaudeToCodex`、`/mnt/d/sprint08-frozen.bundle`（W10 Windows 回归在用）
- 全部 tmux 会话与仓库内容：未执行任何 tmux 命令、未改动任何仓库文件（本记录文件除外）。

## 异常与偏差

1. `ctc-hook-probe-home` 内部布局与提示词描述略有出入（顶层 `capture/` + `plugins/cache`，非 `plugins/capture`），判定仍符合探针特征，照删并在此记录。
2. 5 个 `ctc-sm-*` 目录存在于 `/home/dell/projects/` 且不在本次清单内，未触碰，需 PO/SM 决定后续是否清理。
3. 无其他异常：所有待删路径内容与探针/临时目录预期一致，所有保护路径在位。
