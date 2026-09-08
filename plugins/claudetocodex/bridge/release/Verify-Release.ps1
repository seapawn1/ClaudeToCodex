# Verify a ClaudeToCodex release package against its manifest.json.
# Usage: powershell -NoProfile -File bridge\release\Verify-Release.ps1 -Path <extracted-root | zip>
# Recomputes each file's SHA256 and compares with manifest.json; prints version,
# source ref/commit and per-file result. Exit code 1 on any mismatch.
param(
  [Parameter(Mandatory = $true)][string]$Path
)
$ErrorActionPreference = 'Stop'

if ($Path -like '*.zip') {
  $extract = Join-Path $env:TEMP ("ctc-verify-" + [guid]::NewGuid().ToString('N'))
  Expand-Archive -Path $Path -DestinationPath $extract
  $root = $extract
} else {
  $root = (Resolve-Path $Path).Path
}

$manifestPath = Join-Path $root 'manifest.json'
if (-not (Test-Path $manifestPath)) { throw "manifest.json not found under: $root" }
$manifest = Get-Content $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json

Write-Output "PRODUCT=$($manifest.product) VERSION=$($manifest.version)"
Write-Output "SOURCE_REF=$($manifest.sourceRef) COMMIT=$($manifest.sourceCommit)"
Write-Output "DECLARED_FILES=$($manifest.fileCount)"

$bad = 0; $checked = 0
foreach ($f in $manifest.files) {
  $full = Join-Path $root ($f.path -replace '/', '\')
  if (-not (Test-Path $full)) { Write-Output "MISSING $($f.path)"; $bad++; continue }
  $hash = (Get-FileHash $full -Algorithm SHA256).Hash.ToLowerInvariant()
  $checked++
  if ($hash -ne $f.sha256) { Write-Output "MISMATCH $($f.path)"; $bad++ }
}
$extra = @(Get-ChildItem $root -Recurse -File | Where-Object {
  $rel = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
  ($rel -ne 'manifest.json') -and (-not ($manifest.files | Where-Object { $_.path -eq $rel }))
})
foreach ($e in $extra) { Write-Output ("EXTRA " + $e.FullName.Substring($root.Length + 1)); $bad++ }

if ($bad -eq 0) {
  Write-Output "VERIFY=OK checked=$checked extra=0"
} else {
  Write-Output "VERIFY=FAILED bad=$bad checked=$checked extra=$($extra.Count)"
  exit 1
}
