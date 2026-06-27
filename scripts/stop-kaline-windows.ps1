# Para os processos da Kaline Offline iniciados por start-kaline-windows.ps1, usando
# os PIDs salvos em %USERPROFILE%\.kaline\run\. Nunca mata processos genéricos de
# node/bun/npm do usuário que não tenham sido iniciados por este script.
#
# Uso: powershell -File stop-kaline-windows.ps1

function Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Log($msg)  { Write-Host $msg }

$KalineHome = Join-Path $env:USERPROFILE ".kaline"
$RunDir = Join-Path $KalineHome "run"

function Stop-ByPidFile($label, $pidFile) {
    if (-not (Test-Path $pidFile)) {
        Log "$label`: nenhum PID salvo (provavelmente não estava rodando por este script)."
        return
    }
    $procId = Get-Content $pidFile -ErrorAction SilentlyContinue
    $proc = if ($procId) { Get-Process -Id $procId -ErrorAction SilentlyContinue } else { $null }
    if (-not $proc) {
        Log "$label`: processo salvo (PID $procId) já não existe."
        Remove-Item $pidFile -ErrorAction SilentlyContinue
        return
    }
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    Remove-Item $pidFile -ErrorAction SilentlyContinue
    Ok "$label parado (PID $procId)."
}

Stop-ByPidFile "local-server" (Join-Path $RunDir "local-server.pid")
Stop-ByPidFile "PWA" (Join-Path $RunDir "pwa.pid")

Log "Pronto. Janelas nativas (Tauri) abertas separadamente não são encerradas por este script — feche-as normalmente."
