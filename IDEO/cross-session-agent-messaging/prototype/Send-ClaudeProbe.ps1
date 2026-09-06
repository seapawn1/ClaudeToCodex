[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EndpointPath,

    [ValidatePattern('^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$')]
    [string]$ReplyThreadId = $env:CODEX_THREAD_ID,

    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $ReplyThreadId) { throw 'Specify the original Codex reply thread.' }
$endpoint = Get-Content -Raw -Encoding UTF8 -LiteralPath $EndpointPath | ConvertFrom-Json
if ($endpoint.schema -ne 1 -or $endpoint.sessionId -notmatch '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' -or
    -not $endpoint.socket.StartsWith('\\.\pipe\') -or -not $endpoint.tokenProtected) {
    throw 'Invalid Claude endpoint registration.'
}
if ($DryRun) {
    [ordered]@{ recipient = $endpoint.sessionId; replyThreadId = $ReplyThreadId; sent = $false } | ConvertTo-Json
    return
}

$marker = 'P05-' + [guid]::NewGuid().ToString('N')
$replyScript = Join-Path $PSScriptRoot 'Reply-CodexProbe.ps1'
$replyCommand = "powershell.exe -NoProfile -File `"$replyScript`" -ThreadId $ReplyThreadId -Marker $marker"
$message = "Codex peer message for the agreed communication prototype. Marker: $marker. " +
    "This message is addressed to your original Claude session $($endpoint.sessionId). " +
    "Please reply once to the original Codex session by running this command from your current session tool:`n" +
    $replyCommand + "`n`nThen report locally that the reply was submitted. " +
    'Do not start another session, edit project files, or send further messages for this probe.'
$frame = [ordered]@{
    msgV = 1
    msg_id = [guid]::NewGuid().ToString()
    type = 'user'
    message = @{ role = 'user'; content = $message }
    priority = 'now'
    session_id = $endpoint.sessionId
}
$directory = Join-Path ([IO.Path]::GetTempPath()) 'cross-session-agent-messaging/probes'
$null = New-Item -ItemType Directory -Force -Path $directory
$recordPath = Join-Path $directory ("$marker-send.json")
$record = [ordered]@{
    probe = 'P05-codex-claude-roundtrip'
    marker = $marker
    senderThreadId = $ReplyThreadId
    recipientSessionId = $endpoint.sessionId
    message = $message
    pipeWriteStartedAt = [DateTimeOffset]::UtcNow.ToString('o')
    pipeWriteFinishedAt = $null
    pipeWrite = 'not-completed'
    receipt = 'unverified'
    error = $null
}
$record | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $recordPath
$secureToken = $null
$tokenPointer = [IntPtr]::Zero
$pipe = $null
$writer = $null
try {
    $secureToken = ConvertTo-SecureString -String $endpoint.tokenProtected
    $tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
    $pipeName = $endpoint.socket.Substring('\\.\pipe\'.Length)
    $pipe = [IO.Pipes.NamedPipeClientStream]::new('.', $pipeName, [IO.Pipes.PipeDirection]::InOut)
    $pipe.Connect(5000)
    $writer = [IO.StreamWriter]::new($pipe, [Text.UTF8Encoding]::new($false), 1024, $true)
    $writer.AutoFlush = $true
    $writer.NewLine = "`n"
    $writer.WriteLine((@{ type = 'auth'; token = $token } | ConvertTo-Json -Compress))
    Start-Sleep -Milliseconds 500
    $writer.WriteLine(($frame | ConvertTo-Json -Depth 5 -Compress))
    $writer.Flush()
    $record.pipeWrite = 'completed'
} catch {
    $record.error = $_.Exception.Message
} finally {
    if ($writer) { $writer.Dispose() }
    if ($pipe) { $pipe.Dispose() }
    if ($tokenPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer) }
    if ($secureToken) { $secureToken.Dispose() }
    $record.pipeWriteFinishedAt = [DateTimeOffset]::UtcNow.ToString('o')
    $record | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $recordPath
}
Write-Output "P05 record: $recordPath"
if ($record.error) { throw "Claude pipe write failed: $($record.error)" }
Write-Output 'P05 message written to the selected Claude pipe. Actual receipt and reply remain unverified.'
