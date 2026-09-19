---
name: cross-platform-assumptions-verify-early
description: 平台分支的进程启动/路径假设必须在实现时双平台实测，不能推迟到回归阶段
metadata:
  node_type: memory
  type: project
  modified: 2026-09-19
---

Sprint 08 W3 将 `codex queue` 从 PowerShell 改为 Node `execFile('codex')` 时，我在实现处留了"Windows 侧 npm 可能装 codex.exe，W10 冒烟再验证"的假设；SM 复核（F-1）用只读探针证伪：本机 Windows npm 只有 `.ps1/.cmd` shim，`execFile` 三种方式全部失败（ENOENT/EFTYPE/EINVAL），Windows 全量测试 2 项真实失败。

**Why:** "某平台大概可以"的假设放进代码后，会被同切片的 Linux 全绿掩盖；等到回归阶段才暴露会浪费整个现场轮排期，且违背"回滚决断点要有真实证据"的纪律。

**How to apply:** 凡跨平台分支涉及进程启动、路径解析、PATH 解析语义（execFile/shell/shim）时：①实现时就用最小只读探针在两个平台各测一次（本机 Windows 侧可经 `node.exe`＋`\\wsl.localhost` UNC cwd 直跑工作树脚本，无需 powershell interop）；②不能立即验证的平台行为，在切片结果里写成显式"证明缺口"而不是"应该没问题"；③修复模式优先选恢复该平台已验证的原生机制（如 PowerShell `& codex` 解析），而不是发明新路径。
