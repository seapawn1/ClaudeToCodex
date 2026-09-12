[CmdletBinding()]
param(
    [string]$BridgeRoot = (Join-Path $env:LOCALAPPDATA 'ClaudeToCodex\s04-test-bridge'),
    # Each run snapshots into its own timestamped folder so nothing is overwritten.
    [string]$EvidenceRoot = (Join-Path $env:LOCALAPPDATA 'ClaudeToCodex\s04-test\evidence'),
    # The prototype CLI (must be run with CTC_BRIDGE_DIR set by the caller for
    # status; this script sets it for the child process only).
    [string]$CliPath = (Resolve-Path (Join-Path $PSScriptRoot '..\bridge\cli.mjs')).ProviderPath
)

$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bundle = Join-Path $EvidenceRoot "run-$stamp"
New-Item -ItemType Directory -Force -Path $bundle | Out-Null

# Layer: actual execution - bridge runtime state, copied (not moved).
foreach ($name in 'events.jsonl') {
    if (Test-Path (Join-Path $BridgeRoot $name)) { Copy-Item (Join-Path $BridgeRoot $name) $bundle }
}
foreach ($dir in 'messages', 'pending', 'receipts', 'claims', 'wire', 'pairs') {
    $src = Join-Path $BridgeRoot $dir
    if (Test-Path $src) { Copy-Item $src -Destination $bundle -Recurse }
}

# Layer: bridge status as the product sees it (child env only).
$env:CTC_BRIDGE_DIR = $BridgeRoot
try {
    node $CliPath status *> (Join-Path $bundle 'status.txt')
} finally { Remove-Item Env:\CTC_BRIDGE_DIR -ErrorAction SilentlyContinue }

# Layer: session inventory (ids and names only; no transcript content).
claude agents > (Join-Path $bundle 'claude-agents.txt') 2>$null

Write-Output "Evidence bundle: $bundle"
Write-Output 'Manual layers NOT covered here (collect separately, judged on their own):'
Write-Output '  - host load: doctor --json inside the test Codex window'
Write-Output '  - original-session receipt: full bodies seen in Claude A/B logs and the test Codex transcript'
