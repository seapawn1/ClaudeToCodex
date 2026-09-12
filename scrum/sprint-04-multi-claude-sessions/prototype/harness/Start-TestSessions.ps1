[CmdletBinding()]
param(
    # Isolated test locations. Run Set-Up-TestEnv.ps1 first.
    [string]$TestRoot = (Join-Path $env:LOCALAPPDATA 'ClaudeToCodex\s04-test'),
    [string]$BridgeRoot = (Join-Path $env:LOCALAPPDATA 'ClaudeToCodex\s04-test-bridge'),
    [string]$CodexHome = (Join-Path $TestRoot 'codex-home'),
    [string]$CliPath,
    # Copy the daily config.toml (model/provider settings only, no credentials,
    # no trust state) so the test Codex keeps the user's model configuration.
    [switch]$SkipDailyConfigCopy,
    # Launch everything now. Without it the script only prepares the launcher
    # files (SM-reviewable) and prints what it would do.
    [switch]$Launch
)

$ErrorActionPreference = 'Stop'
if (-not $CliPath) { $CliPath = (Resolve-Path (Join-Path $PSScriptRoot '..\bridge\cli.mjs')).ProviderPath }

$hooksFile = Join-Path $TestRoot 'workCodex\.codex\hooks.json'
if (-not (Test-Path $hooksFile)) { throw "Test environment missing ($hooksFile). Run Set-Up-TestEnv.ps1 first." }
if (-not (Test-Path $CodexHome)) { New-Item -ItemType Directory -Force -Path $CodexHome | Out-Null }
if (-not $SkipDailyConfigCopy -and (Test-Path (Join-Path $env:USERPROFILE '.codex\config.toml')) -and -not (Test-Path (Join-Path $CodexHome 'config.toml'))) {
    Copy-Item (Join-Path $env:USERPROFILE '.codex\config.toml') (Join-Path $CodexHome 'config.toml')
    Write-Output 'Copied daily config.toml (settings only) into the isolated CODEX_HOME.'
}
# Auth is deliberately NOT copied: the isolated home either gets a one-time
# `codex login` in the test window, or an explicitly PO-approved credential
# copy. Hook trust is never copied, forged, or bypassed
# (--dangerously-bypass-hook-trust exists and is deliberately not used).

$claudePrompt = '你是 Sprint 04 桥接多配对验证的专用测试会话 __NAME__，仅做本测试。' +
    '收到跨会话桥消息后，按消息内嵌指引用 reply 回复；不要主动发送确认、问候或与本测试无关的消息。其余时间等待即可。'

# The test Codex session gets its whole startup task as the initial prompt, so
# nobody has to paste prompts or copy thread ids (SM review 7690b372-3). The
# prompt lives in a file; a small launcher script reads it and starts codex.
$codexPrompt = @(
    '你是 Sprint 04 桥接多配对验证的专用测试 Codex 会话，只做以下事，不做任何其他工作：'
    "1. 执行 Set-Content -Path .\thread-id.txt -Value `$env:CODEX_THREAD_ID"
    "2. 执行 node `"$CliPath`" sessions，确认 s04-claude-a 与 s04-claude-b 在列，把完整输出追加到 .\connect-log.txt"
    "3. 依次执行 node `"$CliPath`" connect --name s04-claude-a 与 node `"$CliPath`" connect --name s04-claude-b，每条完整输出都追加到 .\connect-log.txt"
    '4. 完成后回复一句完成摘要，然后等待后续指令，不要主动做任何事。'
    '若任何一步失败，把完整报错追加到 .\connect-log.txt 并停下等待。'
) -join "`n"
$promptFile = Join-Path $TestRoot 'workCodex\_initial-prompt.txt'
Set-Content -Encoding UTF8 -LiteralPath $promptFile -Value $codexPrompt
$launchScript = Join-Path $TestRoot 'workCodex\_launch-codex.ps1'
@(
    "`$env:CTC_BRIDGE_DIR = '$BridgeRoot'",
    "`$env:CODEX_HOME = '$CodexHome'",
    "`$prompt = Get-Content -Raw -Encoding UTF8 '$promptFile'",
    'Write-Host "Test Codex starting (CODEX_HOME and CTC_BRIDGE_DIR are scoped to this window only.)"',
    'codex $prompt'
) -join "`n" | Set-Content -Encoding UTF8 -LiteralPath $launchScript

if (-not $Launch) {
    Write-Output 'Prepared (dry run, nothing launched):'
    Write-Output "  Claude A/B prompts + env cleanup: in this script, foreach block"
    Write-Output "  Codex initial prompt: $promptFile"
    Write-Output "  Codex window launcher: $launchScript"
    Write-Output 'Re-run with -Launch to start Claude A/B and open the test Codex window.'
    return
}

foreach ($pair in @(@{ name = 's04-claude-a'; dir = 'workA' }, @{ name = 's04-claude-b'; dir = 'workB' })) {
    # Identity cleanup happens in THIS throwaway script process only: the child
    # must not inherit the parent session's CODEX_THREAD_ID or a stale
    # CLAUDE_CODE_SESSION_ID, so each test Claude establishes its own original
    # session identity (SM review 7690b372-2). The parent session is untouched.
    Remove-Item Env:\CODEX_THREAD_ID -ErrorAction SilentlyContinue
    Remove-Item Env:\CLAUDE_CODE_SESSION_ID -ErrorAction SilentlyContinue
    Push-Location (Join-Path $TestRoot $pair.dir)
    try {
        claude --bg --name $pair.name ($claudePrompt -replace '__NAME__', $pair.name)
    } finally { Pop-Location }
}

# Visible window: the only manual step happens inside it (hook trust).
Start-Process powershell -WorkingDirectory (Join-Path $TestRoot 'workCodex') -ArgumentList '-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $launchScript

Write-Output 'Claude A/B launched in the background (`claude agents` lists ids).'
Write-Output 'Test Codex window opened with the startup task as its initial prompt.'
Write-Output 'Single PO touchpoint: when Codex asks, trust the three prototype hook entries (or via /hooks). No prompt pasting, no id copying.'
Write-Output 'Evidence afterwards: thread-id.txt, connect-log.txt, doctor --json in the test window, bridge events.jsonl.'
