---
name: verify-instructions-before-handoff
description: 给 PO 的操作指令必须先自己端到端跑通一遍（含语法/前置/版本三查），未经实测的指令不得交付
metadata:
  node_type: memory
  type: project
  modified: 2026-09-19
---

Sprint 08 W10 Windows 冒烟：我给 PO 的启动指令连续翻车三次——①`set` 是 cmd 语法在 PowerShell 失效；②漏了 `--profile glm`；③候选临时 home 里根本没放 glm 模型配置（PO 第一次退回日常终端的真正根因）。外加我一次"CONFIRMED"确认来自写错的检查命令（find 静默失败仍走通 && 链），误报环境正确。PO 原话："笨死了，哥们，记住这个教训好吗？"

**Why:** 指令在我语境里"看起来对"和在对方平台真实可跑是两回事；每一次翻车消耗的是 PO 的时间与信任，且错误结论可能流进验收链（本次就误同步过一次 SM）。

**How to apply:** 凡给 PO/SM 的手动操作指令（尤其跨平台/带环境变量/带前置条件）：①**先自己无头跑通**（如经 node.exe spawn cmd 实测 env 传播、模型可用、会话落点）；②检查命令的成败判定必须验证退出码与输出实体，绝不打印未经证实的 CONFIRMED；③指令内嵌版本/环境自检步骤（如 bat 里 dir 插件目录）；④涉及"必须从某窗口启动"的强约束时，配套远端实时盯原始记录（sessions 落点）作为第二道闸。关联：[[cross-platform-assumptions-verify-early]]。
