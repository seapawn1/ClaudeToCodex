# PO 现场验收启动入口 —— ClaudeToCodex 候选 2
# 用法：在任意 PowerShell 窗口运行  powershell -NoProfile -ExecutionPolicy Bypass -File <本脚本路径>
# 前提：操作员已在真实 CODEX_HOME 安装候选 2 插件（缓存与 ZIP 185da0bf… 逐文件一致）。
# 本脚本只影响自己所在的终端窗口：设定验收隔离的桥数据目录并在全新项目目录启动 Codex，
# 不修改任何全局配置；窗口关闭后环境即消失。

$ErrorActionPreference = 'Stop'

$project = 'D:\ClaudeToCodex-Accept'
$dataDir = Join-Path $env:LOCALAPPDATA 'ClaudeToCodex\bridge-accept-c2'

$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$cliInCache = Join-Path $codexHome 'plugins\cache\claudetocodex-dev\claudetocodex\1.0.0\bridge\cli.mjs'
if (-not (Test-Path $cliInCache)) {
  throw 'claudetocodex 插件尚未安装。请等待操作员完成安装（候选 2，commit b6286c0）后再运行本入口。'
}

New-Item -ItemType Directory -Force $project | Out-Null
Set-Location $project
$env:CTC_BRIDGE_DIR = $dataDir

Write-Host ''
Write-Host '=== ClaudeToCodex 候选 2 现场验收环境 ==='
Write-Host "项目目录（隔离旧 hooks）：$project"
Write-Host "桥数据目录（验收隔离，仅本窗口生效）：$env:CTC_BRIDGE_DIR"
Write-Host 'Codex 登录：按 CLI 实际提示进行（当前 login status 未确认已登录；如提示登录，按指引自行完成）。'
Write-Host ''
Write-Host '进入 Codex 后的步骤：'
Write-Host '  1) /hooks 审核并信任三条 claudetocodex hook（一次性人工授权）'
Write-Host '     ——如宿主提示需重载：退出 Codex，重新运行本入口并选 y 继续同一验收会话'
Write-Host '  2) 对 Codex 说：连接 Claude 会话 <你的 Claude 会话名>'
Write-Host '  3) 自然语言交流（请求、回复、追问、再答）'
Write-Host ''
$ans = Read-Host '继续上一次验收会话？(y=继续[会话选择器] / 直接回车=新会话)'
if ($ans -eq 'y' -or $ans -eq 'Y') {
  codex resume
} else {
  codex
}
Write-Host ''
Write-Host '验收会话已退出。本窗口的隔离环境随之结束，不影响其他终端。'
