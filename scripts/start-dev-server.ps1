$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot\..
$logPath = Join-Path (Get-Location) 'vite-dev.log'
$errPath = Join-Path (Get-Location) 'vite-dev-error.log'
if (Test-Path $logPath) {
  Remove-Item -LiteralPath $logPath -Force
}
if (Test-Path $errPath) {
  Remove-Item -LiteralPath $errPath -Force
}
Start-Process -FilePath 'npm.cmd' `
  -ArgumentList 'run dev -- --host 127.0.0.1 --port 5173' `
  -WorkingDirectory (Get-Location).Path `
  -RedirectStandardOutput $logPath `
  -RedirectStandardError $errPath `
  -WindowStyle Hidden
Start-Sleep -Seconds 5
Get-Content -LiteralPath $logPath -ErrorAction SilentlyContinue
Get-Content -LiteralPath $errPath -ErrorAction SilentlyContinue
