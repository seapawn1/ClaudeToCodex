[CmdletBinding()]
param(
    [string]$SourceConfig = (Join-Path $env:USERPROFILE '.codex\config.toml'),
    [Parameter(Mandatory = $true)]
    [string]$TargetConfig,
    # Model/provider settings only. Daily hooks, plugins, marketplaces,
    # mcp_servers, projects and hooks.state trust hashes are deliberately NOT
    # carried into the isolated CODEX_HOME (SM review e1f9350c).
    [string[]]$TopLevelKeys = @(
        'model', 'model_provider', 'model_reasoning_effort', 'disable_response_storage',
        'approval_policy', 'sandbox_mode', 'model_context_window', 'model_auto_compact_token_limit'
    )
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $SourceConfig)) { throw "Source config not found: $SourceConfig" }

$lines = Get-Content $SourceConfig
$topLevel = [ordered]@{}
$sections = @{}
$current = $null
foreach ($line in $lines) {
    if ($line -match '^\s*\[+([^\]]+)\]+\s*(#.*)?$') {
        $current = $Matches[1]
        if (-not $sections.ContainsKey($current)) { $sections[$current] = New-Object System.Collections.Generic.List[string] }
        continue
    }
    if ($null -eq $current) {
        if ($line -match '^\s*([A-Za-z0-9_.-]+)\s*=') { $topLevel[$Matches[1]] = $line }
    } else {
        $sections[$current].Add($line)
    }
}

$providerKey = 'custom'
foreach ($key in $TopLevelKeys) {
    if ($key -eq 'model_provider' -and $topLevel.Contains($key)) {
        if ($topLevel[$key] -match '=\s*"?([A-Za-z0-9_.-]+)"?') { $providerKey = $Matches[1] }
    }
}
$providerTable = "model_providers.$providerKey"
if (-not $sections.ContainsKey($providerTable)) { throw "Provider table [$providerTable] not found in the daily config." }

$out = New-Object System.Collections.Generic.List[string]
$out.Add('# Sprint 04 isolated test config. Generated from the daily config by')
$out.Add('# Copy-ModelConfig.ps1: model/provider settings only. No hooks, plugins,')
$out.Add('# marketplaces, mcp_servers, projects or trust state are carried over.')
foreach ($key in $TopLevelKeys) {
    if ($topLevel.Contains($key)) { $out.Add($topLevel[$key].Trim()) }
}
$out.Add('')
$out.Add("[$providerTable]")
foreach ($line in $sections[$providerTable]) { if ($line.Trim()) { $out.Add($line) } }

$targetDir = Split-Path -Parent $TargetConfig
if ($targetDir) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
[IO.File]::WriteAllText($TargetConfig, ($out -join "`r`n") + "`r`n", (New-Object Text.UTF8Encoding $false))

# Masked summary for evidence: values of credential-like keys are never shown.
$mask = { param($k, $v) if ($k -match 'token|secret|key|auth|password') { "$k = <redacted>" } else { $v } }
'included top-level keys:'
foreach ($key in $TopLevelKeys) {
    if ($topLevel.Contains($key)) { $raw = $topLevel[$key].Trim(); $k = ($raw -split '=')[0].Trim(); & $mask $k $raw }
}
"included table: [$providerTable] (keys: $((($sections[$providerTable] | Where-Object { $_ -match '^\s*[A-Za-z0-9_.-]+\s*=' }) | ForEach-Object { ($_.Trim() -split '=')[0].Trim() }) -join ', '))"
'excluded daily sections: ' + ((($sections.Keys | Where-Object { $_ -ne $providerTable }) | ForEach-Object { "[$_]" }) -join ' ')
Write-Output "written: $TargetConfig"
