[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$')]
    [string]$ThreadId,

    [ValidateRange(2, 25)]
    [int]$Seconds = 20,

    [switch]$RunP04
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if ($env:CODEX_THREAD_ID -ne $ThreadId) {
    throw 'Run the work tool inside the selected original Codex session.'
}
$probeDirectory = Join-Path ([IO.Path]::GetTempPath()) 'cross-session-agent-messaging/probes'
$null = New-Item -ItemType Directory -Force -Path $probeDirectory
$windowId = [guid]::NewGuid().ToString('N')
$windowPath = Join-Path $probeDirectory ("busy-$ThreadId.json")
$archivePath = Join-Path $probeDirectory ("busy-window-$windowId.json")
$startedAt = [DateTimeOffset]::UtcNow
$window = [ordered]@{
    probe = if ($RunP04) { 'P04' } else { 'P02' }
    windowId = $windowId
    threadId = $ThreadId
    processId = $PID
    state = 'running'
    startedAt = $startedAt.ToString('o')
    plannedEndAt = $startedAt.AddSeconds($Seconds).ToString('o')
    endedAt = $null
}
$window | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $windowPath

# This tool publishes timing only. It never opens a message or sender record.
Start-Sleep -Seconds $Seconds
$window.state = 'completed'
$window.endedAt = [DateTimeOffset]::UtcNow.ToString('o')
$window | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $archivePath
$window | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $windowPath
$window | ConvertTo-Json
