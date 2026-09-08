[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$')]
    [string]$ThreadId,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\[CTC-WAKE [0-9a-fA-F-]{36} [0-9a-fA-F-]{36}\]$')]
    [string]$Wake
)

$ErrorActionPreference = 'Stop'
$output = & codex queue --thread $ThreadId --message $Wake 2>&1
if ($LASTEXITCODE -ne 0) { throw "Bridge queue submission failed: $($output | Out-String)" }
$output
