# Diagnóstico da Kaline Offline no Windows. Só lê e reporta — não instala, não baixa,
# não altera nada.
#
# Uso: powershell -File check-kaline-windows.ps1

function Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green; $script:OkCount++ }
function Warn($msg) { Write-Host "[Atenção] $msg" -ForegroundColor Yellow; $script:WarnCount++ }
function Err($msg)  { Write-Host "[Erro] $msg" -ForegroundColor Red; $script:ErrCount++ }
function Log($msg)  { Write-Host $msg }

$script:OkCount = 0; $script:WarnCount = 0; $script:ErrCount = 0

Log "== Diagnóstico da Kaline Offline (Windows) =="
Log ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
if (-not ((Test-Path (Join-Path $RootDir "local-server")) -and (Test-Path (Join-Path $RootDir "apps\kaline-desktop")))) {
    Err "Repositório da Kaline não encontrado a partir deste diretório."
    Log ""
    Log "$($script:ErrCount) erro(s)."
    exit 1
}
Ok "Repositório encontrado em $RootDir"
Set-Location $RootDir

function Has-Cmd($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

if (Has-Cmd "git") { Ok "git encontrado" } else { Warn "git não encontrado (https://git-scm.com) — atualizar com git pull ficará indisponível" }
if (Has-Cmd "node") { Ok "node encontrado ($(node --version))" } else { Err "node não encontrado (https://nodejs.org)" }
if (Has-Cmd "npm") { Ok "npm encontrado ($(npm --version))" } else { Err "npm não encontrado" }
if (Has-Cmd "bun") { Ok "bun encontrado ($(bun --version))" } else { Err "bun não encontrado (https://bun.sh)" }
if (Has-Cmd "cargo") { Ok "cargo encontrado ($(cargo --version))" } else { Warn "cargo não encontrado — companion Tauri não pode ser buildado (rotas web continuam funcionando)" }

if (Test-Path "local-server\dist\index.js") { Ok "local-server buildado (local-server\dist\index.js)" } else { Warn "local-server ainda não buildado — rode 'cd local-server; npm run build'" }
if (Test-Path "local-server\.env") { Ok "local-server\.env existe" } else { Warn "local-server\.env não existe — copie de local-server\.env.example" }

function Port-InUse($port) {
    try { return Test-NetConnection -ComputerName "127.0.0.1" -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet } catch { return $false }
}
if (Port-InUse 64113) { Ok "Porta 64113 em uso (provavelmente o local-server)" } else { Warn "Porta 64113 livre — local-server não está rodando agora" }

foreach ($route in @("/health", "/model/status", "/transcribe/status", "/tts/status", "/bridge/status", "/meetings")) {
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:64113$route" -TimeoutSec 2 -UseBasicParsing | Out-Null
        Ok "Rota responde: GET $route"
    } catch {
        Warn "Rota não respondeu: GET $route (local-server pode estar parado)"
    }
}

if (Has-Cmd "ollama") {
    Ok "ollama encontrado"
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 -UseBasicParsing | Out-Null
        Ok "Ollama respondendo em 127.0.0.1:11434"
        $models = (ollama list 2>$null | Select-Object -Skip 1 | ForEach-Object { ($_ -split '\s+')[0] })
        foreach ($m in @("llama3.2:1b", "qwen2.5:1.5b", "qwen3.5:2b", "qwen3.5:0.8b")) {
            if ($models -contains $m) { Ok "Modelo Ollama instalado: $m" } else { Warn "Modelo Ollama não encontrado: $m (instale com 'ollama pull $m' se for usar)" }
        }
    } catch {
        Warn "Ollama instalado, mas não respondeu em 127.0.0.1:11434 (está rodando?)"
    }
} else {
    Warn "ollama não encontrado — provider de modelo local ficará indisponível (mock continua funcionando)"
}

if (Test-Path "local-server\.env") {
    $envContent = Get-Content "local-server\.env"
    $whisperBin = ($envContent | Where-Object { $_ -match '^WHISPER_CPP_BIN=' }) -replace '^WHISPER_CPP_BIN=', ''
    $whisperModel = ($envContent | Where-Object { $_ -match '^WHISPER_MODEL_PATH=' }) -replace '^WHISPER_MODEL_PATH=', ''
    if ($whisperBin -and (Test-Path $whisperBin)) { Ok "Binário do Whisper encontrado ($whisperBin)" } else { Warn "Binário do Whisper (whisper-cli) não encontrado — transcrição ficará indisponível" }
    if ($whisperModel -and (Test-Path $whisperModel)) { Ok "Modelo Whisper Small encontrado ($whisperModel)" } else { Warn "Modelo Whisper Small não encontrado — transcrição ficará indisponível" }

    $kokoroModel = ($envContent | Where-Object { $_ -match '^KOKORO_MODEL_PATH=' }) -replace '^KOKORO_MODEL_PATH=', ''
    $kokoroVoices = ($envContent | Where-Object { $_ -match '^KOKORO_VOICES_PATH=' }) -replace '^KOKORO_VOICES_PATH=', ''
    if ($kokoroModel -and (Test-Path $kokoroModel) -and $kokoroVoices -and (Test-Path $kokoroVoices)) {
        Ok "Kokoro configurado (modelo e voices encontrados)"
    } else {
        Warn "Kokoro não encontrado ou incompleto — voz Dora ficará indisponível (fallback do navegador continua)"
    }
} else {
    Warn "Sem local-server\.env — não foi possível checar Whisper/Kokoro"
}

if (Test-Path "apps\kaline-desktop\src-tauri\target\release\kaline-desktop.exe") {
    Ok "Companion Tauri buildado (apps\kaline-desktop\src-tauri\target\release\kaline-desktop.exe)"
} else {
    Warn "Companion Tauri ainda não buildado — Kaline Offline/Janelinha abrirão no navegador como alternativa"
}

$DesktopDir = Join-Path $env:USERPROFILE "Desktop"
$StartMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Kaline"
foreach ($name in @("Kaline Offline", "Kaline Janelinha", "Instalar-Atualizar Kaline", "Verificar Kaline", "Parar Kaline")) {
    if ((Test-Path (Join-Path $DesktopDir "$name.lnk")) -or (Test-Path (Join-Path $StartMenuDir "$name.lnk"))) {
        Ok "Atalho criado: $name"
    } else {
        Warn "Atalho ausente: $name (rode scripts\create-kaline-windows-shortcuts.ps1)"
    }
}

Log ""
Log "Resumo: $($script:OkCount) OK, $($script:WarnCount) em atenção, $($script:ErrCount) erro(s)."
if ($script:ErrCount -gt 0) { exit 1 }
exit 0
