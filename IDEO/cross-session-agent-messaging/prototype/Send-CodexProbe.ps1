[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$')]
    [string]$ThreadId,

    [switch]$DryRun,

    [switch]$DuringTool,

    [switch]$ViaHook
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$codexCommand = $null
if (-not $ViaHook) {
    $codexCommand = Get-Command codex -CommandType Application,ExternalScript |
        Select-Object -First 1
    if (-not $codexCommand) {
        throw 'Codex CLI was not found on PATH.'
    }
}
$waitForTool = $DuringTool -or $ViaHook
$probeId = if ($ViaHook) { 'P04' } elseif ($DuringTool) { 'P02' } else { 'P01' }

if ($DryRun) {
    [ordered]@{
        mode = 'dry-run'
        executable = if ($ViaHook) { $PSCommandPath } else { $codexCommand.Source }
        threadId = $ThreadId
        operation = if ($ViaHook) { 'write one P04 inbox message after a fresh busy window' } else { 'codex queue --thread <id> --message <fresh probe>' }
        duringTool = [bool]$waitForTool
        probe = $probeId
        sent = $false
    } | ConvertTo-Json
    return
}

$probeDirectory = Join-Path ([IO.Path]::GetTempPath()) 'cross-session-agent-messaging/probes'
$null = New-Item -ItemType Directory -Force -Path $probeDirectory
$inboxPath = Join-Path $probeDirectory ("P04-inbox-$ThreadId.json")
if ($ViaHook -and (Test-Path -LiteralPath $inboxPath)) {
    throw 'A previous P04 message is still pending. Inspect it before starting another run.'
}
$busyWindow = $null
if ($waitForTool) {
    $armedAt = [DateTimeOffset]::UtcNow
    $windowPath = Join-Path $probeDirectory ("busy-$ThreadId.json")
    $probeRoute = if ($ViaHook) { 'file + Hook' } else { 'queue' }
    Write-Output "WAITING_FOR_BUSY_WINDOW: sender=$probeId, route=$probeRoute. Start the matching test in Codex."
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
            $windowProbe = if ($candidate.PSObject.Properties['probe']) { $candidate.probe } else { 'unknown' }
            if ($windowProbe -ne $probeId) {
                throw "Probe mismatch: sender=$probeId, work window=$windowProbe. No message was sent. Use -ViaHook for P04."
            }
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
$marker = $probeId + '-' + [guid]::NewGuid().ToString('N')
$message = "Local prototype probe $probeId, sent by a test script, not Claude Code. Marker: $marker. "
if ($ViaHook) {
    $message += 'This note was written from the other terminal while your work tool was running. ' +
        "At the pending checkpoint, report P04-CHECKPOINT: $marker, then complete the planned short action. " +
        'Do not read probe records to obtain this marker or send another probe.'
} elseif ($DuringTool) {
    $message += 'Let any running tool finish normally. If the busy-test checkpoint is still pending, ' +
        'include this marker there and continue the planned short action. Otherwise reply once with exactly: ' +
        "P02-RECEIVED $marker. Do not read probe files or send another probe."
} else {
    $message += "Please reply once with exactly: P01-RECEIVED $marker. " +
        'Do not run tools, read files, or send another probe.'
}
$recordPath = Join-Path $probeDirectory ($marker + '.json')
$record = [ordered]@{
    probe = if ($ViaHook) { 'P04-external-hook' } elseif ($DuringTool) { 'P02-codex-tool-queue' } else { 'P01-codex-idle-queue' }
    sender = 'standalone-test-script'
    threadId = $ThreadId
    busyWindow = $busyWindow
    marker = $marker
    message = $message
    submittedAt = [DateTimeOffset]::UtcNow.ToString('o')
    commandFinishedAt = $null
    exitCode = $null
    queueOutput = $null
    inboxPath = if ($ViaHook) { $inboxPath } else { $null }
    error = $null
    delivery = 'unverified'
}
$record | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 -LiteralPath $recordPath

try {
    if ($ViaHook) {
        $note = [ordered]@{
            probe = 'P04'
            threadId = $ThreadId
            windowId = $busyWindow.windowId
            marker = $marker
            message = $message
            writtenAt = [DateTimeOffset]::UtcNow.ToString('o')
        }
        $stagingPath = Join-Path $probeDirectory ("$marker.pending.tmp")
        [IO.File]::WriteAllText($stagingPath, ($note | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
        # Publish a complete file atomically; never overwrite another pending message.
        [IO.File]::Move($stagingPath, $inboxPath)
        $record.exitCode = 0
    } else {
        $queueOutput = & $codexCommand.Source queue --thread $ThreadId --message $message 2>&1
        $record.exitCode = $LASTEXITCODE
        $record.queueOutput = ($queueOutput | Out-String).Trim()
    }
} catch {
    $record.error = $_.Exception.Message
} finally {
    $record.commandFinishedAt = [DateTimeOffset]::UtcNow.ToString('o')
    $record | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 -LiteralPath $recordPath
}

Write-Output "Record: $recordPath"
if ($record.error -or $record.exitCode -ne 0) {
    Write-Error "Probe submission failed. See the record. $($record.error) $($record.queueOutput)"
    exit 1
}
if ($ViaHook) {
    Write-Output 'P04 inbox file published. Hook consumption and model receipt are not yet verified.'
    Write-Output "Marker for later comparison: $marker"
    Write-Output 'Observe P04-CHECKPOINT and P04-WORK-DONE. Do not paste the marker into Codex.'
} elseif ($DuringTool) {
    Write-Output 'Queue accepted the message. Receipt and processing are not yet verified.'
    Write-Output "Marker for later comparison: $marker"
    Write-Output 'Observe the checkpoint, work completion, and any later reply. Do not paste this marker into Codex.'
    Write-Output 'Wait 60 seconds after work completion before reporting observations. Do not interrupt Codex.'
} else {
    Write-Output 'Queue accepted the message. Receipt and processing are not yet verified.'
    Write-Output "Expected reply in the original Codex session: P01-RECEIVED $marker"
    Write-Output 'Observe that session for 60 seconds without typing into it or interrupting it.'
}
