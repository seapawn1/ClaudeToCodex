[CmdletBinding()]
param(
    # Isolated bridge data root for the Sprint 04 test loop. Never the daily
    # default bridge, never the coordination directory.
    [string]$BridgeRoot = (Join-Path $env:LOCALAPPDATA 'ClaudeToCodex\s04-test-bridge'),

    # Isolated working directories for the test Codex session and Claude A/B.
    [string]$TestRoot = (Join-Path $env:LOCALAPPDATA 'ClaudeToCodex\s04-test'),

    # The prototype CLI inside this worktree. The hook command and reply
    # guidance both point here, so the whole test loop stays on prototype code.
    [string]$CliPath
)

$ErrorActionPreference = 'Stop'
if (-not $CliPath) { $CliPath = (Resolve-Path (Join-Path $PSScriptRoot '..\bridge\cli.mjs')).ProviderPath }

$dailyBridge = Join-Path $env:LOCALAPPDATA 'ClaudeToCodex\bridge'
if ((Resolve-Path $BridgeRoot -ErrorAction SilentlyContinue).ProviderPath -eq (Resolve-Path $dailyBridge -ErrorAction SilentlyContinue).ProviderPath) {
    throw 'Refusing to use the daily default bridge data root.'
}

$hookCommand = "node `"$CliPath`" hook"
$hooks = [ordered]@{
    description = 'Sprint 04 prototype test hooks. Isolated test project only; never install into shared config.'
    hooks = [ordered]@{
        PostToolUse    = @(@{ hooks = @(@{ type = 'command'; command = $hookCommand; timeout = 5; async = $false; additionalContextLimit = 20000 }) })
        UserPromptSubmit = @(@{ hooks = @(@{ type = 'command'; command = $hookCommand; timeout = 5; async = $false; additionalContextLimit = 20000 }) })
        Stop           = @(@{ hooks = @(@{ type = 'command'; command = $hookCommand; timeout = 5; async = $false }) })
    }
}

foreach ($name in 'workCodex', 'workA', 'workB', 'codex-home') {
    New-Item -ItemType Directory -Force -Path (Join-Path $TestRoot $name) | Out-Null
}
$hooksFile = Join-Path $TestRoot 'workCodex\.codex\hooks.json'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $hooksFile) | Out-Null
$hooks | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -LiteralPath $hooksFile

[PSCustomObject]@{
    BridgeRoot = $BridgeRoot
    TestRoot   = $TestRoot
    CodexHome  = Join-Path $TestRoot 'codex-home'
    HooksFile  = $hooksFile
    HookCommand = $hookCommand
    CliPath    = $CliPath
} | Format-List

Write-Output 'Test environment ready. See harness/README.md for the launch runbook.'
Write-Output 'Nothing shared was touched: daily install, caches, marketplace, shared config and the in-use bridge are unchanged.'
