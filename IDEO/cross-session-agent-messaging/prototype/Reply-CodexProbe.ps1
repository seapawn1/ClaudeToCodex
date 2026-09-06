[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$')]
    [string]$ThreadId,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^P05-[0-9a-f]{32}$')]
    [string]$Marker
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$senderId = $env:CLAUDE_CODE_SESSION_ID
if (-not $senderId -or $senderId -notmatch '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') {
    throw 'Run the reply from the selected original Claude Code session.'
}
$message = "P05-REPLY $Marker from Claude session $senderId. " +
    "Please acknowledge once with exactly: P05-ACK $Marker. Do not send another probe or run tools."
$submittedAt = [DateTimeOffset]::UtcNow.ToString('o')
$queueOutput = & codex queue --thread $ThreadId --message $message 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Reply queue submission failed: $($queueOutput | Out-String)"
}
$directory = Join-Path ([IO.Path]::GetTempPath()) 'cross-session-agent-messaging/probes'
$null = New-Item -ItemType Directory -Force -Path $directory
[ordered]@{
    probe = 'P05-claude-reply'
    marker = $Marker
    senderSessionId = $senderId
    recipientThreadId = $ThreadId
    submittedAt = $submittedAt
    queueFinishedAt = [DateTimeOffset]::UtcNow.ToString('o')
    queueOutput = ($queueOutput | Out-String).Trim()
    receipt = 'unverified'
} | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $directory ("$Marker-reply.json"))
Write-Output "P05 reply queued for Codex: $Marker. Receipt is not yet verified."
