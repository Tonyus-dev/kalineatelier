# Inicia a Kaline Offline no Windows: local-server (127.0.0.1:64113) + PWA
# (preview estático em 127.0.0.1:4173, com fallback pro dev server do Vite), e abre
# a janela pedida.
#
# Nunca expõe nada em 0.0.0.0 nem em outra interface além de 127.0.0.1.
#
# Uso:
#   powershell -File start-kaline-windows.ps1               # abre o app completo
#   powershell -File start-kaline-windows.ps1 -Open janelinha
#   powershell -File start-kaline-windows.ps1 -Open none

param([string]$Open = "main")

function Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[Atenção] $msg" -ForegroundColor Yellow }
function Log($msg)  { Write-Host $msg }

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

$KalineHome = Join-Path $env:USERPROFILE ".kaline"
$RunDir = Join-Path $KalineHome "run"
$LogDir = Join-Path $KalineHome "logs"
New-Item -ItemType Directory -Force -Path $RunDir, $LogDir | Out-Null

$LocalServerPidFile = Join-Path $RunDir "local-server.pid"
$PwaPidFile = Join-Path $RunDir "pwa.pid"

function Port-InUse($port) {
    try {
        $conn = Test-NetConnection -ComputerName "127.0.0.1" -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet
        return $conn
    } catch { return $false }
}

function Pid-IsRunning($pidFile) {
    if (-not (Test-Path $pidFile)) { return $false }
    $procId = Get-Content $pidFile -ErrorAction SilentlyContinue
    if (-not $procId) { return $false }
    return [bool](Get-Process -Id $procId -ErrorAction SilentlyContinue)
}

function Start-LocalServer {
    if (Pid-IsRunning $LocalServerPidFile) { Ok "local-server já está rodando (PID $(Get-Content $LocalServerPidFile))."; return }
    if (Port-InUse 64113) { Warn "Porta 64113 já está em uso por outro processo (não iniciado por este script)."; return }
    if (-not (Test-Path "local-server\.env")) { Copy-Item "local-server\.env.example" "local-server\.env" }
    $runScript = if (Test-Path "local-server\dist\index.js") { "start" } else { "dev" }
    Log "Iniciando local-server em http://127.0.0.1:64113 (log: $LogDir\local-server.log) ..."
    $proc = Start-Process -FilePath "npm" -ArgumentList "run", $runScript -WorkingDirectory "local-server" `
        -RedirectStandardOutput "$LogDir\local-server.log" -RedirectStandardError "$LogDir\local-server.err.log" `
        -WindowStyle Hidden -PassThru
    Set-Content $LocalServerPidFile $proc.Id
    Start-Sleep -Seconds 2
    Ok "local-server iniciado (PID $($proc.Id))."
}

function Start-Pwa {
    if (Pid-IsRunning $PwaPidFile) { Ok "PWA já está rodando (PID $(Get-Content $PwaPidFile))."; return }
    if (Port-InUse 4173) { Warn "Porta 4173 já está em uso por outro processo (não iniciado por este script)."; return }
    $runArgs = if (Test-Path "dist") { @("run", "preview", "--port", "4173", "--host", "127.0.0.1") } else { @("run", "dev", "--port", "4173", "--host", "127.0.0.1") }
    Log "Iniciando PWA (bun) em http://127.0.0.1:4173 (log: $LogDir\pwa.log) ..."
    $proc = Start-Process -FilePath "bun" -ArgumentList $runArgs `
        -RedirectStandardOutput "$LogDir\pwa.log" -RedirectStandardError "$LogDir\pwa.err.log" `
        -WindowStyle Hidden -PassThru
    Set-Content $PwaPidFile $proc.Id
    Start-Sleep -Seconds 2
    Ok "PWA iniciada (PID $($proc.Id))."
}

Start-LocalServer
Start-Pwa

$AppUrl = if ($env:KALINE_DESKTOP_APP_URL) { $env:KALINE_DESKTOP_APP_URL } else { "http://127.0.0.1:4173" }
$TauriBin = Join-Path $RootDir "apps\kaline-desktop\src-tauri\target\release\kaline-desktop.exe"

function Open-Window($target) {
    if (Test-Path $TauriBin) {
        $env:KALINE_DESKTOP_APP_URL = $AppUrl
        if ($target -eq "janelinha") { Start-Process -FilePath $TauriBin -ArgumentList "--janelinha" } else { Start-Process -FilePath $TauriBin }
        Ok "Janela nativa ($target) aberta via companion Tauri."
        return
    }
    Warn "Companion Tauri ainda não foi buildado; abrindo no navegador como alternativa honesta."
    $url = if ($target -eq "janelinha") { "$AppUrl/janelinha" } else { "$AppUrl/chat" }
    Start-Process $url
}

switch ($Open) {
    "main"       { Open-Window "main" }
    "janelinha"  { Open-Window "janelinha" }
    "none"       { Log "Serviços iniciados; nenhuma janela aberta (-Open none)." }
    default      { Warn "Valor inválido para -Open: $Open (use main, janelinha ou none)." }
}

Log ""
Log "Kaline Offline disponível em: $AppUrl"
Log "local-server (API): http://127.0.0.1:64113"
