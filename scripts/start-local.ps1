$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw "Python 3.12+ is required. Install Python and rerun this script."
}
if (-not (Test-Path (Join-Path $Root "backend/.venv/Scripts/python.exe"))) {
  python -m venv (Join-Path $Root "backend/.venv")
}
$Python = Join-Path $Root "backend/.venv/Scripts/python.exe"
& $Python -m pip install --upgrade pip
& $Python -m pip install -r (Join-Path $Root "backend/requirements.txt")

# Local-only defaults. Do not change HOST to 0.0.0.0 on an untrusted network.
$env:HOST = "127.0.0.1"
$env:PORT = "8000"
$env:APP_ENV = "development"
$env:CX1_API_TCP = "1"
$env:PYTHONPATH = Join-Path $Root "backend"

Write-Host "Starting API. Logs: backend-api.log"
$Api = Start-Process -FilePath $Python -ArgumentList "backend/runner.py" -WorkingDirectory $Root -RedirectStandardOutput (Join-Path $Root "backend-api.log") -RedirectStandardError (Join-Path $Root "backend-api.err.log") -PassThru -WindowStyle Hidden
$Healthy = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/cx1/health" -TimeoutSec 2 -UseBasicParsing
    if ($r.StatusCode -eq 200) { $Healthy = $true; break }
  } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $Healthy) {
  try { Stop-Process -Id $Api.Id -Force -ErrorAction SilentlyContinue } catch {}
  throw "API failed to start. Inspect backend-api.err.log."
}
Write-Host "API health: http://127.0.0.1:8000/api/cx1/health"
Write-Host "Dashboard:  http://127.0.0.1:8000/dashboard"
Write-Host "Now starting frontend (Ctrl+C stops the frontend; stop API PID $($Api.Id) separately)."
npm run dev
