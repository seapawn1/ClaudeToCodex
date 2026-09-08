[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$EndpointPath,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$')]
    [string]$ReplyThreadId,

    [Parameter(Mandatory = $true)]
    [string]$MessageFile,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$')]
    [string]$MessageId,

    [Parameter(Mandatory = $true)]
    [string]$RecordPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$endpoint = Get-Content -Raw -Encoding UTF8 -LiteralPath $EndpointPath | ConvertFrom-Json
if ($endpoint.schema -ne 1 -or $endpoint.sessionId -notmatch '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' -or
    -not $endpoint.socket.StartsWith('\\.\pipe\') -or -not $endpoint.tokenProtected) {
    throw 'Invalid Claude endpoint registration.'
}

# Ordinary peer messages are fixed to priority=next: the recipient's current output
# finishes completely and the message enters at the next context opportunity. The
# preempting `now` mode stays out of the product path by design.
$priority = 'next'
$message = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $MessageFile).ProviderPath, [Text.Encoding]::UTF8)
if (-not $message.Trim()) { throw 'Bridge message text is empty.' }
$frame = [ordered]@{
    msgV = 1
    msg_id = $MessageId
    type = 'user'
    message = @{ role = 'user'; content = $message }
    priority = $priority
    session_id = $endpoint.sessionId
}
$record = [ordered]@{
    direction = 'codex-to-claude'
    messageId = $MessageId
    priority = $priority
    senderThreadId = $ReplyThreadId
    recipientSessionId = $endpoint.sessionId
    message = $message
    pipeWriteStartedAt = [DateTimeOffset]::UtcNow.ToString('o')
    pipeWriteFinishedAt = $null
    pipeWrite = 'not-completed'
    receipt = 'unverified'
    error = $null
}
$null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $RecordPath)
$record | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $RecordPath
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
    $record | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $RecordPath
}
Write-Output "Pipe send record: $RecordPath"
if ($record.error) { throw "Claude pipe write failed: $($record.error)" }
Write-Output 'Message written to the selected Claude pipe. Actual receipt and reply remain unverified.'
