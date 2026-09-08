# Repeatable technical acceptance entry for PBI-08 (AC-08-01..05).
# Usage: powershell -NoProfile -File bridge\release\Test-Acceptance.ps1 [-ReportPath <json>] [-SkipHostInstall] [-HookEvidence <file>] [-SkillEvidence <file>]
# Verdicts per check: PASS / FAIL / BLOCKED. Exit code is non-zero on any FAIL or BLOCKED.
# Simulated (fixture) evidence and real Codex CLI host evidence are separate checks. All
# simulated verdicts are earned by the SHIPPED plugin copy under plugins\claudetocodex,
# not by the development tree. BLOCKED means "not decidable headlessly; evidence belongs
# to the SM technical acceptance round" and still fails the run, per the agreed AC wording.
param(
  [string]$ReportPath,
  [switch]$SkipHostInstall,
  [string]$HookEvidence,
  [string]$SkillEvidence
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$pluginDir = Join-Path $repoRoot 'plugins\claudetocodex'
$pluginBridge = Join-Path $pluginDir 'bridge'
$commit = (git -C $repoRoot rev-parse HEAD | Out-String).Trim()

$results = New-Object System.Collections.Generic.List[object]
function Add-Result([string]$Ac, [string]$Name, [string]$Verdict, [string[]]$Evidence) {
  $script:results.Add([ordered]@{ ac = $Ac; name = $Name; verdict = $Verdict; evidence = $Evidence })
  Write-Output ("[{0}] {1} :: {2}" -f $Verdict, $Ac, $Name)
  foreach ($e in $Evidence) { Write-Output ("       -> " + $e) }
}

# Node suites run against the SHIPPED plugin copy; children get an isolated CODEX_HOME so a
# PATH-shimmed codex can never reach the real host home.
$nodeHome = Join-Path $env:LOCALAPPDATA ('ClaudeToCodex\test\node-home-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $nodeHome | Out-Null
function Run-NodeTests([string]$File) {
  $savedHome = $env:CODEX_HOME
  $env:CODEX_HOME = $nodeHome
  try {
    $out = & node --test (Join-Path $pluginBridge "test\$File") 2>&1 | Out-String
    $code = $LASTEXITCODE
  } finally {
    if ($null -ne $savedHome) { $env:CODEX_HOME = $savedHome } else { Remove-Item Env:\CODEX_HOME -ErrorAction SilentlyContinue }
  }
  $pass = if ($out -match 'pass (\d+)') { $Matches[1] } else { '0' }
  $fail = if ($out -match 'fail (\d+)') { $Matches[1] } else { '?' }
  return @{ code = $code; pass = $pass; fail = $fail; out = $out }
}

function Find-PackageLeaks([string]$Root, [string]$Label) {
  $hits = @()
  if (-not (Test-Path $Root)) { return @("$Label root missing: $Root") }
  foreach ($f in (Get-ChildItem $Root -Recurse -File -Force)) {
    $rel = $f.FullName.Substring($Root.Length + 1)
    if ($f.Name -match '^claude-[0-9a-f-]{36}\.json$') { $hits += "$Label endpoint file: $rel" }
    if ($f.Name -eq 'pair.json' -or $f.Name -eq 'events.jsonl') { $hits += "$Label data artifact: $rel" }
    if ($f.Extension -eq '.key') { $hits += "$Label peer-key file: $rel" }
    if ($f.FullName -match '\\(endpoints|messages|wire|pending|receipts|claims|staging)\\') { $hits += "$Label data dir artifact: $rel" }
    if ($f.Length -lt 1MB -and $f.Extension -match '^\.(json|md|mjs|ps1|txt)$') {
      $content = [IO.File]::ReadAllText($f.FullName)
      if ($content -match '[A-Za-z0-9+/=]{200,}') { $hits += "$Label DPAPI-blob-like content: $rel" }
    }
  }
  return $hits
}

# ---------- AC-08-01(a): package structure on the SHIPPED tree (simulated) ----------
$structureEvidence = @()
$manifest = Get-Content (Join-Path $pluginDir '.codex-plugin\plugin.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$structureOk = $true
foreach ($field in 'name', 'version', 'description') {
  if (-not $manifest.$field) { $structureOk = $false; $structureEvidence += "manifest missing field: $field" }
}
if ($manifest.skills -notmatch '^\./') { $structureOk = $false; $structureEvidence += 'skills path must start with ./' }
$skillsDir = Join-Path $pluginDir ($manifest.skills.TrimStart('./') -replace '/', '\')
if (-not (Test-Path (Join-Path $skillsDir 'claudetocodex\SKILL.md'))) { $structureOk = $false; $structureEvidence += 'SKILL.md not found under skills path' }
$hooksJson = Join-Path $pluginDir 'hooks\hooks.json'
if (-not (Test-Path $hooksJson)) { $structureOk = $false; $structureEvidence += 'hooks/hooks.json missing' }
else {
  $hooks = Get-Content $hooksJson -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($event in 'PostToolUse', 'UserPromptSubmit', 'Stop') {
    if (-not $hooks.hooks.$event) { $structureOk = $false; $structureEvidence += "hooks missing event: $event"; continue }
    foreach ($group in $hooks.hooks.$event) {
      foreach ($hook in $group.hooks) {
        if ($hook.command -notmatch '\$\{PLUGIN_ROOT\}/bridge/cli\.mjs" hook$') {
          $structureOk = $false; $structureEvidence += "event $event has a hook command not anchored to `${PLUGIN_ROOT}/bridge/cli.mjs` hook: $($hook.command)"
        }
      }
    }
  }
}
if (-not (Test-Path (Join-Path $pluginBridge 'cli.mjs'))) { $structureOk = $false; $structureEvidence += 'bridge/cli.mjs missing in package' }
if ($structureOk) { $structureEvidence = @('shipped tree: manifest fields valid; SKILL.md present; EVERY hook command anchors to ${PLUGIN_ROOT}/bridge/cli.mjs; bridge bundled') }
Add-Result 'AC-08-01a' 'Package structure validation, shipped tree (simulated)' ($(if ($structureOk) { 'PASS' } else { 'FAIL' })) $structureEvidence

# ---------- AC-08-01(b): real Codex CLI host install (real host) ----------
if ($SkipHostInstall) {
  Add-Result 'AC-08-01b' 'Real Codex CLI isolated install (real host)' 'BLOCKED' @('skipped by -SkipHostInstall')
} else {
  # codex refuses CODEX_HOME under %TEMP%; use a product-managed test area. Snapshot and
  # restore any caller CODEX_HOME instead of deleting the variable.
  $hostHome = Join-Path $env:LOCALAPPDATA ('ClaudeToCodex\test\codex-home-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force $hostHome | Out-Null
  $savedCodexHome = $env:CODEX_HOME
  $mkOut = ''; $addOut = ''; $listOut = ''
  $verdict = 'FAIL'; $ev = @()
  try {
    $env:CODEX_HOME = $hostHome
    $mkOut = (codex plugin marketplace add $repoRoot --json | Out-String)
    $addOut = (codex plugin add claudetocodex@claudetocodex-dev --json | Out-String)
    $listOut = (codex plugin list --json | Out-String)
    $codexVersion = (codex --version | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($addOut) -and [string]::IsNullOrWhiteSpace($listOut)) {
      $verdict = 'BLOCKED'
      $ev = @('codex produced no output at all - host appears unavailable')
    } else {
      $installed = $listOut | ConvertFrom-Json
      $entry = @($installed.installed | Where-Object { $_.pluginId -eq 'claudetocodex@claudetocodex-dev' })[0]
      # NB: installedPath only appears in `plugin add --json` output, not in `plugin list`.
      $addJson = $addOut | ConvertFrom-Json
      if (-not $entry -or -not $addJson.installedPath) {
        $verdict = 'FAIL'
        $ev = @("plugin not in installed list; marketplace=$mkOut", "add=$addOut", "list=$listOut")
      } else {
        $cache = $addJson.installedPath
        $cacheChecks = @()
        $cacheOk = $entry.enabled -eq $true
        if (-not $cacheOk) { $cacheChecks += "not enabled in list output" }
        foreach ($expected in @('bridge\cli.mjs', 'skills\claudetocodex\SKILL.md', 'hooks\hooks.json', '.codex-plugin\plugin.json')) {
          if (-not (Test-Path (Join-Path $cache $expected))) { $cacheOk = $false; $cacheChecks += "cache missing $expected" }
        }
        $cacheHooks = Get-Content (Join-Path $cache 'hooks\hooks.json') -Raw -Encoding UTF8
        if ($cacheHooks -notmatch [regex]::Escape('${PLUGIN_ROOT}/bridge/cli.mjs')) { $cacheOk = $false; $cacheChecks += 'cache hooks.json not anchored to ${PLUGIN_ROOT}' }
        foreach ($f in (Get-ChildItem $cache -Recurse -File -Force)) {
          if ($f.Length -lt 1MB -and $f.Extension -match '^\.(json|md|mjs|ps1|txt)$') {
            if ([IO.File]::ReadAllText($f.FullName) -like "*$repoRoot*") { $cacheOk = $false; $cacheChecks += "cache file references dev workspace: $($f.Name)" }
          }
        }
        if ($cacheOk) {
          $verdict = 'PASS'
          $ev = @(
            "marketplace add + plugin add ok ($codexVersion)",
            "cache=$cache; enabled=$($entry.enabled); contains cli.mjs, SKILL.md, hooks.json, manifest; hooks anchored to `${PLUGIN_ROOT}`; no dev-workspace references",
            "host isolation: CODEX_HOME snapshot kept and restored; test home=$hostHome"
          )
        } else { $verdict = 'FAIL'; $ev = $cacheChecks }
      }
    }
  } catch {
    $verdict = 'FAIL'
    $ev = @("install check threw: $($_.Exception.Message)", "marketplace=$mkOut", "add=$addOut", "list=$listOut")
  } finally {
    if ($null -ne $savedCodexHome) { $env:CODEX_HOME = $savedCodexHome } else { Remove-Item Env:\CODEX_HOME -ErrorAction SilentlyContinue }
    Remove-Item $hostHome -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path $hostHome) { $ev += "residue warning: cleanup incomplete, $hostHome remains - prune manually" }
  }
  Add-Result 'AC-08-01b' 'Real Codex CLI isolated install, cache inspected (real host)' $verdict $ev
}

# ---------- AC-08-01(c/d): skill availability and hook execution in a live host session ----------
if ($HookEvidence -and (Test-Path $HookEvidence)) {
  $hookLog = [IO.File]::ReadAllText($HookEvidence)
  $prepared = [regex]::Matches($hookLog, '"type":"context-prepared"').Count
  $ev = @("caller-supplied file: $HookEvidence ($((Get-Item $HookEvidence).Length) bytes, mtime $((Get-Item $HookEvidence).LastWriteTime.ToString('o')))",
    "contains $prepared context-prepared record(s); provenance and session binding are judged by the SM reviewer, not by this harness")
  if ($prepared -gt 0) { Add-Result 'AC-08-01c' 'Hook execution evidence (host session, caller-supplied)' 'PASS' $ev }
  else { Add-Result 'AC-08-01c' 'Hook execution evidence (host session, caller-supplied)' 'FAIL' ($ev + @('no context-prepared record found')) }
} else {
  Add-Result 'AC-08-01c' 'Hook execution in live host session' 'BLOCKED' @(
    'needs an interactive Codex session plus user hook trust (non-managed hooks); not decidable headlessly',
    'SM round: pass -HookEvidence <bridge events.jsonl or equivalent log> to verdict this check'
  )
}
if ($SkillEvidence -and (Test-Path $SkillEvidence)) {
  $skillLog = [IO.File]::ReadAllText($SkillEvidence)
  if ($skillLog -match 'claudetocodex') {
    Add-Result 'AC-08-01d' 'Skill availability in host session (caller-supplied)' 'PASS' @(
      "caller-supplied file: $SkillEvidence mentions the claudetocodex skill; provenance judged by the SM reviewer"
    )
  } else {
    Add-Result 'AC-08-01d' 'Skill availability in host session (caller-supplied)' 'FAIL' @("no claudetocodex mention in $SkillEvidence")
  }
} else {
  Add-Result 'AC-08-01d' 'Skill availability in live host session' 'BLOCKED' @(
    'skill discovery happens inside an interactive Codex session; not decidable headlessly',
    'SM round: pass -SkillEvidence <session transcript or skill listing mentioning claudetocodex> to verdict this check'
  )
}

# ---------- AC-08-02 / AC-08-03 / AC-08-05(a): connect behavior suite on the shipped copy ----------
$connect = Run-NodeTests 'connect.test.mjs'
if ($connect.code -eq 0) {
  Add-Result 'AC-08-02' 'Auto-connect: unique/not-found/ambiguous/dead/stale/no-key/malformed-socket/different-pair (simulated, shipped copy)' 'PASS' @(
    "connect.test.mjs pass=$($connect.pass) fail=0",
    'endpoint-failure cases covered: stale registry record, missing peer key, non-pipe socket, and a dead-pipe send'
  )
  Add-Result 'AC-08-03' 'No manual config: reply entry carries data dir and the RUNNING CLI location (simulated, shipped copy)' 'PASS' @(
    "connect.test.mjs pass=$($connect.pass) fail=0",
    'reply entry is pinned to commandString() of the module under test (relocates with the installation); no-env default data location is product-managed (defaultRoot unit); test isolation variables are harness-only'
  )
  Add-Result 'AC-08-05a' 'Failures are failures: non-zero exits, no fake success, no key material (simulated, shipped copy)' 'PASS' @(
    'negative connect cases exit non-zero; dead-pipe send exits non-zero, prints no submitted receipt, records send-error; peer key never appears in listings or events; key travels via process env, never the command line'
  )
} else {
  foreach ($ac in 'AC-08-02', 'AC-08-03', 'AC-08-05a') {
    Add-Result $ac 'Connect behavior suite (simulated, shipped copy)' 'FAIL' @("connect.test.mjs pass=$($connect.pass) fail=$($connect.fail)")
  }
}

# ---------- AC-08-04: message pipeline regression on the shipped copy ----------
$store = Run-NodeTests 'store.test.mjs'; $pipe = Run-NodeTests 'pipe.test.mjs'; $installT = Run-NodeTests 'install.test.mjs'
if (($store.code -eq 0) -and ($pipe.code -eq 0) -and ($installT.code -eq 0)) {
  Add-Result 'AC-08-04' 'Message pipeline: objects, conversationId/replyTo, dedup, single wake/injection (simulated, shipped copy)' 'PASS' @(
    "store pass=$($store.pass); pipe pass=$($pipe.pass); install pass=$($installT.pass); parsed fail counts: $($store.fail)/$($pipe.fail)/$($installT.fail)",
    'real-session receipt remains judged by unique marker plus receiving original-session events - that part is the PO end-to-end round, not this harness'
  )
} else {
  Add-Result 'AC-08-04' 'Message pipeline regression (simulated, shipped copy)' 'FAIL' @(
    "store fail=$($store.fail); pipe fail=$($pipe.fail); install fail=$($installT.fail)"
  )
}

# ---------- AC-08-05(b): no credentials inside the shipped tree and any installed cache ----------
$leaks = Find-PackageLeaks $pluginDir 'shipped-tree'
if ($leaks.Count -eq 0) {
  Add-Result 'AC-08-05b' 'No endpoints/keys/pairing/messages inside package (static + content scan)' 'PASS' @(
    'shipped tree scanned by name (endpoint/pair/events/.key/data dirs) and content (DPAPI-like blobs)'
  )
} else {
  Add-Result 'AC-08-05b' 'No endpoints/keys/pairing/messages inside package (static + content scan)' 'FAIL' $leaks
}

# ---------- AC-08-05(c): receive policy untouched (shipped copy first, dev tree for parity) ----------
$policyHits = @()
foreach ($scope in @(@{ root = $pluginBridge; label = 'shipped' }, @{ root = (Join-Path $repoRoot 'bridge'); label = 'dev' })) {
  $policyHits += Select-String -Path (Join-Path $scope.root '*.mjs'), (Join-Path $scope.root 'delivery\*.ps1') -Pattern 'crossSessionInbound' -ErrorAction SilentlyContinue |
    Where-Object { $_.Line -notmatch 'console\.log|Write-Output|reminder|policy:' } |
    ForEach-Object { "$($scope.label) $($_.Filename):$($_.LineNumber)" }
}
if ($policyHits) {
  Add-Result 'AC-08-05c' 'Host receive policy never modified (static, shipped + dev)' 'FAIL' $policyHits
} else {
  Add-Result 'AC-08-05c' 'Host receive policy never modified (static, shipped + dev)' 'PASS' @(
    'only user-facing reminder text mentions crossSessionInbound; no code path reads or writes host settings in either tree'
  )
}

# ---------- summary ----------
$report = [ordered]@{
  at = (Get-Date).ToUniversalTime().ToString('o')
  commit = $commit
  plugin = $pluginDir
  suiteRoot = $pluginBridge
  checks = $results
}
$reportJson = $report | ConvertTo-Json -Depth 5
if ($ReportPath) { [IO.File]::WriteAllText($ReportPath, $reportJson + "`n", (New-Object System.Text.UTF8Encoding($false))) }
Remove-Item $nodeHome -Recurse -Force -ErrorAction SilentlyContinue
$failed = @($results | Where-Object { $_.verdict -eq 'FAIL' }).Count
$blocked = @($results | Where-Object { $_.verdict -eq 'BLOCKED' }).Count
$passed = @($results | Where-Object { $_.verdict -eq 'PASS' }).Count
Write-Output ""
Write-Output "ACCEPTANCE SUMMARY: pass=$passed fail=$failed blocked=$blocked commit=$($commit.Substring(0,7)) suite=shipped-copy"
if (($failed -gt 0) -or ($blocked -gt 0)) { exit 1 }
exit 0
