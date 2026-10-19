<#
Starts FiveUsers locally in two windows: API on http://127.0.0.1:7860 and web on http://localhost:3000.

  .\scripts\dev.ps1            # live: keys and model IDs from .env
  .\scripts\dev.ps1 -DryRun    # no keys needed: scripted personas, no model calls, no credits

The built-in sample sites are at http://localhost:3000/samples/signup/index.html (also checkout, booking).
Close the two windows (or Ctrl+C in each) to stop.
#>
param([switch]$DryRun)

$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path $root "api"
$web = Join-Path $root "web"

# Local only: let the test browser open localhost so the sample sites can be tested.
$apiEnv = "`$env:ALLOW_PRIVATE_URLS='true'; `$env:ALLOWED_ORIGINS='http://localhost:3000,http://127.0.0.1:3000'"
if ($DryRun) {
    $apiEnv += "; `$env:DRY_RUN='true'; `$env:RATE_LIMIT_PER_HOUR='100'; `$env:RATE_LIMIT_PER_DAY='500'"
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "$apiEnv; Set-Location '$api'; .\.venv\Scripts\python -m app"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:NEXT_PUBLIC_API_URL='http://127.0.0.1:7860'; Set-Location '$web'; npm run dev"

Write-Host ""
Write-Host "API     http://127.0.0.1:7860/health"
Write-Host "Web     http://localhost:3000"
Write-Host "Sample  http://localhost:3000/samples/signup/index.html"
if ($DryRun) { Write-Host "Mode    dry run (no model calls)" }
