$ErrorActionPreference='Stop'
$labDirectory=$PSScriptRoot
$labUrl='http://127.0.0.1:8848/'
$labHealth=$null
try { $labHealth=Invoke-RestMethod -Uri ($labUrl+'api/health') -TimeoutSec 2 } catch {}
if ($labHealth -and $labHealth.app -ne 'wheel-motor-fluid-lab') { throw 'El puerto 8848 pertenece a otra aplicación.' }
if (-not $labHealth) {
 $labNode=Get-Command node -ErrorAction Stop
 $labRuntime=Join-Path $labDirectory 'runtime'
 New-Item -ItemType Directory -Path $labRuntime -Force | Out-Null
 $labProcess=Start-Process -FilePath $labNode.Source -ArgumentList 'server.mjs' -WorkingDirectory $labDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $labRuntime 'server.log') -RedirectStandardError (Join-Path $labRuntime 'server-error.log') -PassThru
 $labProcess.Id | Set-Content -LiteralPath (Join-Path $labRuntime 'server.pid')
 for ($labAttempt=0;$labAttempt -lt 15;$labAttempt++) {
  try { $labHealth=Invoke-RestMethod -Uri ($labUrl+'api/health') -TimeoutSec 2; break } catch { Start-Sleep -Milliseconds 200 }
 }
 if (-not $labHealth) { throw 'No se pudo iniciar la simulación. Revisa runtime/server-error.log.' }
}
Start-Process $labUrl
Write-Host ('Simulación disponible: '+$labUrl)
