[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$')]
    [string]$ThreadId,

    [switch]$DryRun,

    [switch]$DuringTool
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$codexCommand = Get-Command codex -CommandType Application,ExternalScript |
    Select-Object -First 1
if (-not $codexCommand) {
    throw 'Codex CLI was not found on PATH.'
}

if ($DryRun) {
    [ordered]@{
        mode = 'dry-run'
        executable = $codexCommand.Source
        threadId = $ThreadId
        operation = 'codex queue --thread <id> --message <fresh probe>'
        duringTool = [bool]$DuringTool
        sent = $false
    } | ConvertTo-Json
    return
}

$probeDirectory = Join-Path ([IO.Path]::GetTempPath()) 'cross-session-agent-messaging/probes'
$null = New-Item -ItemType Directory -Force -Path $probeDirectory
$busyWindow = $null
if ($DuringTool) {
    $armedAt = [DateTimeOffset]::UtcNow
    $windowPath = Join-Path $probeDirectory ("busy-$ThreadId.json")
    Write-Output 'WAITING_FOR_BUSY_WINDOW: ask the original Codex session to start the busy test.'
    while ([DateTimeOffset]::UtcNow -lt $armedAt.AddMinutes(3)) {
        $candidate = $null
        if (Test-Path -LiteralPath $windowPath) {
            try {
                $candidate = Get-Content -Raw -Encoding UTF8 -LiteralPath $windowPath | ConvertFrom-Json
            } catch {
                # The work tool may still be writing its timing signal.
            }
        }
        if ($candidate -and $candidate.threadId -eq $ThreadId -and $candidate.state -eq 'running' -and
            [DateTimeOffset]::Parse($candidate.startedAt) -gt $armedAt -and
            [DateTimeOffset]::Parse($candidate.plannedEndAt) -gt [DateTimeOffset]::UtcNow.AddSeconds(8)) {
            $busyWindow = $candidate
            break
        }
        Start-Sleep -Milliseconds 200
    }
    if (-not $busyWindow) {
        throw 'No fresh busy window appeared within 3 minutes. No message was sent.'
    }
    Start-Sleep -Seconds 2
}

# Generate the marker only at send time so the recipient cannot know it in advance.
$probeId = if ($DuringTool) { 'P02' } else { 'P01' }
$marker = $probeId + '-' + [guid]::NewGuid().ToString('N')
$message = "Local prototype probe $probeId, sent by a test script, not Claude Code. Marker: $marker. "
if ($DuringTool) {
    $message += 'Let any running tool finish normally. If the busy-test checkpoint is still pending, ' +
        'include this marker there and continue the planned short action. Otherwise reply once with exactly: ' +
        "P02-RECEIVED $marker. Do not read probe files or send another probe."
} else {
    $message += "Please reply once with exactly: P01-RECEIVED $marker. " +
        'Do not run tools, read files, or send another probe.'
}
$recordPath = Join-Path $probeDirectory ($marker + '.json')
$record = [ordered]@{
    probe = if ($DuringTool) { 'P02-codex-tool-queue' } else { 'P01-codex-idle-queue' }
    sender = 'standalone-test-script'
    threadId = $ThreadId
    busyWindow = $busyWindow
    marker = $marker
    message = $message
    submittedAt = [DateTimeOffset]::UtcNow.ToString('o')
    commandFinishedAt = $null
    exitCode = $null
    queueOutput = $null
    error = $null
    delivery = 'unverified'
}
$record | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $recordPath

try {
    $queueOutput = & $codexCommand.Source queue --thread $ThreadId --message $message 2>&1
    $record.exitCode = $LASTEXITCODE
    $record.queueOutput = ($queueOutput | Out-String).Trim()
} catch {
    $record.error = $_.Exception.Message
} finally {
    $record.commandFinishedAt = [DateTimeOffset]::UtcNow.ToString('o')
    $record | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $recordPath
}

Write-Output "Record: $recordPath"
if ($record.error -or $record.exitCode -ne 0) {
    Write-Error "Queue submission failed. See the record. $($record.error) $($record.queueOutput)"
    exit 1
}
Write-Output 'Queue accepted the message. Receipt and processing are not yet verified.'
if ($DuringTool) {
    Write-Output "Marker for later comparison: $marker"
    Write-Output 'Observe the checkpoint, work completion, and any later reply. Do not paste this marker into Codex.'
    Write-Output 'Wait 60 seconds after work completion before reporting observations. Do not interrupt Codex.'
} else {
    Write-Output "Expected reply in the original Codex session: P01-RECEIVED $marker"
    Write-Output 'Observe that session for 60 seconds without typing into it or interrupting it.'
}
