# Build a ClaudeToCodex release ZIP from a Git ref.
# Usage: powershell -NoProfile -File bridge\release\Build-Release.ps1 [-Ref HEAD] [-Version 1.0.0] [-OutDir <dir>]
# Stages INSTALL.md, RELEASE-NOTES.md and bridge/ from the ref, generates manifest.json
# (per-file SHA256, source commit), then compresses the staging tree into
# <OutDir>\claude-to-codex-<Version>.zip with a .sha256 sidecar.
param(
  [string]$Ref = 'HEAD',
  [string]$Version = '1.0.0',
  [string]$OutDir
)
$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if (-not $OutDir) { $OutDir = Join-Path $env:TEMP "claude-to-codex-release-$Version" }

$commit = (git -C $repoRoot rev-parse --verify "$Ref^{commit}" | Out-String).Trim()
if (-not $commit) { throw "Unknown ref: $Ref" }
$commitDate = (git -C $repoRoot show -s --format=%cI $commit | Out-String).Trim()

New-Item -ItemType Directory -Force $OutDir | Out-Null
$stage = Join-Path $OutDir "claude-to-codex-$Version"
$archiveTmp = Join-Path $OutDir 'src-archive.zip'
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
if (Test-Path $archiveTmp) { Remove-Item $archiveTmp -Force }
New-Item -ItemType Directory $stage | Out-Null

git -C $repoRoot archive --format=zip --output="$archiveTmp" $Ref -- INSTALL.md RELEASE-NOTES.md bridge
if ($LASTEXITCODE -ne 0) { throw 'git archive failed' }
Expand-Archive -Path $archiveTmp -DestinationPath $stage
Remove-Item $archiveTmp -Force

$entries = @(Get-ChildItem $stage -Recurse -File | Sort-Object FullName | ForEach-Object {
  $rel = $_.FullName.Substring($stage.Length + 1).Replace('\', '/')
  [ordered]@{
    path   = $rel
    sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    bytes  = $_.Length
  }
})
$manifest = [ordered]@{
  product     = 'ClaudeToCodex'
  version     = $Version
  sourceRef   = $Ref
  sourceCommit = $commit
  commitDate  = $commitDate
  fileCount   = $entries.Count + 1  # + manifest.json itself
  files       = $entries
}
$manifestPath = Join-Path $stage 'manifest.json'
$json = $manifest | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($manifestPath, $json + "`n", (New-Object System.Text.UTF8Encoding($false)))

$zipPath = Join-Path $OutDir "claude-to-codex-$Version.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zipPath
$zipHash = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText((Join-Path $OutDir "claude-to-codex-$Version.zip.sha256"),
  "$zipHash  claude-to-codex-$Version.zip`n", (New-Object System.Text.UTF8Encoding($false)))

Write-Output "PRODUCT=claude-to-codex-$Version"
Write-Output "SOURCE_REF=$Ref"
Write-Output "SOURCE_COMMIT=$commit"
Write-Output "ZIP=$zipPath"
Write-Output "ZIP_SHA256=$zipHash"
Write-Output "MANIFEST_FILES=$($entries.Count + 1) (incl. manifest.json)"
