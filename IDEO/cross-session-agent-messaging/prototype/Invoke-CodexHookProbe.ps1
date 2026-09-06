[CmdletBinding()]
param([switch]$RunP03)

$ErrorActionPreference = 'Stop'
if (-not $RunP03 -or -not $env:CODEX_THREAD_ID) {
    throw 'Use -RunP03 inside the original Codex session.'
}
$probeStartedAt = [DateTimeOffset]::UtcNow
Start-Sleep -Seconds 2
[ordered]@{
    probe = 'P03-work-tool'
    threadId = $env:CODEX_THREAD_ID
    startedAt = $probeStartedAt.ToString('o')
    endedAt = [DateTimeOffset]::UtcNow.ToString('o')
} | ConvertTo-Json
