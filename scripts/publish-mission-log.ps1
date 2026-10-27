<#
.SYNOPSIS
Publishes the protected Mission Log (public/assets/data/mission-log.enc.json) without exposing the passphrase.

.DESCRIPTION
The one-time local handoff for scripts/publish-protected-mission-log.mjs. The passphrase is read with
Read-Host -AsSecureString and converted to plain text only inside the environment of the node child
process (System.Diagnostics.ProcessStartInfo). It is never set in this PowerShell session, echoed,
logged or passed as an argument, and the unmanaged copy is zeroed after the child starts.

The publisher refuses to write when the passphrase cannot decrypt the current archive, so a mistyped
passphrase cannot silently change it. -RotatePassphrase changes the passphrase deliberately and asks
for the new one twice; browsers linked with a passkey then report PK-ARCHIVE until they are linked
again with the new passphrase (docs/research-passkey.md). -CheckLeaks also scans src/, public/ and dist/ in memory for entry labels and
long body sentences and reports only file paths and entry ids.

Only success or failure and the entry count are printed (plus leak-check paths and entry ids).

.EXAMPLE
powershell -NoProfile -File scripts\publish-mission-log.ps1

.EXAMPLE
powershell -NoProfile -File scripts\publish-mission-log.ps1 -CheckLeaks -Node 'C:\Program Files\nodejs\node.exe'

.EXAMPLE
powershell -NoProfile -File scripts\publish-mission-log.ps1 -RotatePassphrase
#>
[CmdletBinding()]
param(
  # Change the archive passphrase on purpose (prompts twice for the new one).
  [switch]$RotatePassphrase,
  # Scan src/, public/ and dist/ for Mission Log plaintext before writing.
  [switch]$CheckLeaks,
  # Path to node.exe when node is not on PATH.
  [string]$Node,
  # For synthetic tests only; the owner should let the script prompt.
  [securestring]$Passphrase
)

Set-StrictMode -Version 3
$ErrorActionPreference = 'Stop'
$marshal = [System.Runtime.InteropServices.Marshal]

function Stop-Publish([string]$Message) {
  Write-Host "Mission Log publish failed: $Message"
  exit 1
}

# Compares two SecureStrings through zeroed BSTRs, without creating managed copies.
function Test-SecureStringEqual([securestring]$First, [securestring]$Second) {
  if ($First.Length -ne $Second.Length) { return $false }
  $a = [IntPtr]::Zero
  $b = [IntPtr]::Zero
  try {
    $a = $marshal::SecureStringToBSTR($First)
    $b = $marshal::SecureStringToBSTR($Second)
    $same = $true
    for ($offset = 0; $offset -lt $First.Length * 2; $offset += 2) {
      if ($marshal::ReadInt16($a, $offset) -ne $marshal::ReadInt16($b, $offset)) { $same = $false }
    }
    return $same
  } finally {
    if ($a -ne [IntPtr]::Zero) { $marshal::ZeroFreeBSTR($a) }
    if ($b -ne [IntPtr]::Zero) { $marshal::ZeroFreeBSTR($b) }
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$publisher = Join-Path $PSScriptRoot 'publish-protected-mission-log.mjs'
if (-not (Test-Path -LiteralPath $publisher -PathType Leaf)) { Stop-Publish "publisher script not found at $publisher." }

# Locate node before asking for the passphrase.
if ($Node) {
  if (-not (Test-Path -LiteralPath $Node -PathType Leaf)) { Stop-Publish "node was not found at '$Node'." }
  $nodePath = (Resolve-Path -LiteralPath $Node).ProviderPath
} else {
  $command = Get-Command node -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $command) {
    Stop-Publish "node was not found on PATH. Install Node.js 22 or later (see .nvmrc) or pass -Node 'C:\path\to\node.exe'."
  }
  $nodePath = $command.Path
}
if (Test-Path Env:MISSION_LOG_PASSPHRASE) {
  Write-Host 'Warning: MISSION_LOG_PASSPHRASE is set in this PowerShell session and was ignored; remove it with Remove-Item Env:MISSION_LOG_PASSPHRASE.'
}

if ($Passphrase) {
  $secret = $Passphrase.Copy()
} elseif ($RotatePassphrase) {
  $secret = Read-Host -AsSecureString 'New Mission Log passphrase'
  $confirmation = Read-Host -AsSecureString 'Repeat the new Mission Log passphrase'
  try {
    $matching = Test-SecureStringEqual $secret $confirmation
  } finally {
    $confirmation.Dispose()
  }
  if (-not $matching) {
    $secret.Dispose()
    Stop-Publish 'the two new passphrases do not match. Nothing was written.'
  }
} else {
  $secret = Read-Host -AsSecureString 'Mission Log passphrase'
}
if ($secret.Length -lt 16) {
  $secret.Dispose()
  Stop-Publish 'the passphrase must contain at least 16 characters. Nothing was written.'
}

$arguments = '"{0}"' -f $publisher
if ($RotatePassphrase) { $arguments += ' --rotate-passphrase' }
if ($CheckLeaks) { $arguments += ' --check-leaks' }

$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $nodePath
$startInfo.Arguments = $arguments
$startInfo.WorkingDirectory = $repoRoot
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.StandardOutputEncoding = [System.Text.Encoding]::UTF8
$startInfo.StandardErrorEncoding = [System.Text.Encoding]::UTF8

$bstr = [IntPtr]::Zero
$process = $null
try {
  $bstr = $marshal::SecureStringToBSTR($secret)
  # The only plain-text copy lives in the child's environment block; it is removed again once node has started.
  $startInfo.EnvironmentVariables['MISSION_LOG_PASSPHRASE'] = $marshal::PtrToStringBSTR($bstr)
  $process = [System.Diagnostics.Process]::Start($startInfo)
} catch {
  $process = $null
} finally {
  if ($bstr -ne [IntPtr]::Zero) { $marshal::ZeroFreeBSTR($bstr) }
  $startInfo.EnvironmentVariables.Remove('MISSION_LOG_PASSPHRASE')
  $secret.Dispose()
}
if (-not $process) { Stop-Publish "node could not be started from $nodePath." }

$stdoutTask = $process.StandardOutput.ReadToEndAsync()
$stderrTask = $process.StandardError.ReadToEndAsync()
$process.WaitForExit()
$stdout = $stdoutTask.Result
$stderr = $stderrTask.Result
$exitCode = $process.ExitCode
$process.Dispose()

# The publisher's own messages contain no passphrase or entry text; stack traces are not relayed.
$leakLines = @(($stdout + "`n" + $stderr) -split '\r?\n' | Where-Object { $_ -like 'Leak check:*' })
if ($exitCode -eq 0) {
  $published = [regex]::Match($stdout, 'Published (\d+) Mission Log entr(?:y|ies) .*\((.+); round-trip decrypt verified\)')
  $count = if ($published.Success) { $published.Groups[1].Value } else { 'an unknown number of' }
  $noun = if ($count -eq '1') { 'entry' } else { 'entries' }
  $mode = if ($published.Success) { " ($($published.Groups[2].Value))" } else { '' }
  Write-Host "Mission Log publish succeeded: $count $noun encrypted$mode; round-trip decrypt verified."
  foreach ($line in $leakLines) { Write-Host $line }
  exit 0
}
foreach ($line in $leakLines) { Write-Host $line }
$errorLine = @($stderr -split '\r?\n' | Where-Object { $_ -match '^\w*Error: ' } | Select-Object -First 1)
$reason = if ($errorLine.Count) { $errorLine[0] -replace '^\w*Error: ', '' } else { "the publisher exited with code $exitCode." }
Stop-Publish $reason
