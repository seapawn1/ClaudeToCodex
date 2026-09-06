[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$sessionId = $env:CLAUDE_CODE_SESSION_ID
$socket = $env:CLAUDE_CODE_MESSAGING_SOCKET
$token = $env:CLAUDE_CODE_MESSAGING_TOKEN
if (-not $sessionId -or $sessionId -notmatch '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' -or
    -not $socket -or -not $token) {
    throw 'Run this script from the selected Claude Code session tool, with cross-session messaging available.'
}
if (-not $socket.StartsWith('\\.\pipe\')) {
    throw 'This prototype expects a native Windows named pipe.'
}

$directory = Join-Path ([IO.Path]::GetTempPath()) 'cross-session-agent-messaging'
$null = New-Item -ItemType Directory -Force -Path $directory
$endpointPath = Join-Path $directory ("claude-$sessionId.json")
$secureToken = ConvertTo-SecureString -String $token -AsPlainText -Force
try {
    $endpoint = [ordered]@{
        schema = 1
        sessionId = $sessionId
        socket = $socket
        tokenProtected = ConvertFrom-SecureString -SecureString $secureToken
        registeredAt = [DateTimeOffset]::UtcNow.ToString('o')
        cwd = $PWD.Path
    }
    $endpoint | ConvertTo-Json | Set-Content -Encoding UTF8 -LiteralPath $endpointPath
} finally {
    $secureToken.Dispose()
}
Write-Output "REGISTERED_CLAUDE_SESSION=$sessionId"
Write-Output "ENDPOINT_FILE=$endpointPath"
Write-Output 'The token is protected for the current Windows user. No message was sent.'
