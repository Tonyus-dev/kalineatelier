# Instalador da Kaline Offline para Windows.
#
# Este script NÃO É a Kaline (não é a IA) — só prepara o sistema operacional:
# verifica ferramentas, instala dependências do projeto, configura .env,
# builda o local-server/companion e cria atalhos. A Kaline em si só conversa
# com http://127.0.0.1:64113 — nunca 0.0.0.0, nunca porta pública.
#
# Uso: duplo clique em install-kaline-windows.bat, ou:
#   powershell -ExecutionPolicy Bypass -File install-kaline-windows.ps1

$ErrorActionPreference = "Continue"

function Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[Atenção] $msg" -ForegroundColor Yellow }
function Err($msg)  { Write-Host "[Erro] $msg" -ForegroundColor Red }
function Log($msg)  { Write-Host $msg }

$TotalSteps = 10
function Step($n, $msg) { Log ""; Log "[$n/$TotalSteps] $msg" }

$DefaultRoot = Join-Path $env:USERPROFILE "Kaline\kalineatelier"

function Find-RepoRoot {
    $dir = Get-Location
    while ($dir -ne $null -and $dir.Path -ne $dir.Drive.Root) {
        if ((Test-Path (Join-Path $dir "package.json")) -and (Test-Path (Join-Path $dir "local-server")) -and (Test-Path (Join-Path $dir "apps\kaline-desktop"))) {
            return $dir.Path
        }
        $dir = Split-Path $dir -Parent | Get-Item -ErrorAction SilentlyContinue
    }
    foreach ($c in @($DefaultRoot, (Join-Path $env:USERPROFILE "kalineatelier"))) {
        if ((Test-Path (Join-Path $c "package.json")) -and (Test-Path (Join-Path $c "local-server"))) {
            return $c
        }
    }
    return $null
}

# [1/10] Localizar repositório -------------------------------------------------
Step 1 "Localizando o repositório da Kaline Offline ..."
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
if (-not ((Test-Path (Join-Path $RootDir "local-server")) -and (Test-Path (Join-Path $RootDir "apps\kaline-desktop")))) {
    $RootDir = Find-RepoRoot
}
if (-not $RootDir) {
    Err "Repositório não encontrado. Baixe-o em $DefaultRoot (ex.: git clone <url> `"$DefaultRoot`") e rode este script de dentro da pasta."
    exit 1
}
Set-Location $RootDir
Ok "Repositório em $RootDir"

# [2/10] Verificar ferramentas --------------------------------------------------
Step 2 "Verificando git/node/npm/bun/ollama/cargo ..."
function Has-Cmd($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }
$missingCore = @()
foreach ($tool in @("git", "node", "npm", "bun")) {
    if (Has-Cmd $tool) { Ok "$tool encontrado" } else { Warn "$tool não encontrado"; $missingCore += $tool }
}
if (Has-Cmd "ollama") { Ok "ollama encontrado" } else { Warn "ollama não encontrado (https://ollama.com) — provider local ficará indisponível" }
if (Has-Cmd "cargo") { Ok "cargo encontrado" } else { Warn "cargo/rustup não encontrado (https://rustup.rs) — companion Tauri ficará indisponível (fallback no navegador)" }
if ($missingCore.Count -gt 0) {
    Err "Ferramentas essenciais faltando: $($missingCore -join ', '). Instale-as e rode este script de novo."
    Log "git: https://git-scm.com  node/npm: https://nodejs.org  bun: https://bun.sh"
    exit 1
}

# [3/10] Instalar dependências do projeto --------------------------------------
Step 3 "Instalando dependências do projeto (bun install) ..."
bun install
if ($LASTEXITCODE -ne 0) { Err "bun install falhou."; exit 1 }

Log "Buildando local-server (npm install && npm run build) ..."
Push-Location local-server
npm install
$lsInstallOk = ($LASTEXITCODE -eq 0)
if ($lsInstallOk) { npm run build }
Pop-Location
if ($lsInstallOk -and $LASTEXITCODE -eq 0) { Ok "local-server buildado." } else { Warn "Build do local-server falhou — rode manualmente depois: cd local-server; npm install; npm run build" }

# [4/10] Companion Tauri (opcional) --------------------------------------------
Step 4 "Buildando companion Tauri (apps\kaline-desktop) ..."
if (Has-Cmd "cargo") {
    Push-Location apps\kaline-desktop
    npm install
    if ($LASTEXITCODE -eq 0) { npm run tauri build }
    Pop-Location
    if ($LASTEXITCODE -eq 0) { Ok "Companion Tauri buildado." } else { Warn "Build do Tauri falhou — Kaline Offline/Janelinha abrirão no navegador como alternativa honesta." }
} else {
    Warn "Sem cargo/rustup — pulando build do companion Tauri (fallback no navegador)."
}

# [5/10] Configurar .env -------------------------------------------------------
Step 5 "Configurando local-server\.env ..."
$EnvFile = "local-server\.env"
if (-not (Test-Path $EnvFile)) {
    Copy-Item "local-server\.env.example" $EnvFile
    Ok "$EnvFile criado a partir de .env.example."
} else {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $EnvFile "$EnvFile.backup-$stamp"
    Ok "$EnvFile já existia — backup salvo em $EnvFile.backup-$stamp"
}
function Ensure-EnvKv($key, $val) {
    $content = Get-Content $EnvFile -ErrorAction SilentlyContinue
    if ($content -match "^$key=") {
        $content = $content -replace "^$key=.*", "$key=$val"
        Set-Content $EnvFile $content
    } else {
        Add-Content $EnvFile "$key=$val"
    }
}
Ensure-EnvKv "KALINE_LOCAL_HOST" "127.0.0.1"
Ensure-EnvKv "KALINE_LOCAL_PORT" "64113"
Ensure-EnvKv "OLLAMA_BASE_URL" "http://127.0.0.1:11434"
Ensure-EnvKv "TTS_PROVIDER" "kokoro"
Ensure-EnvKv "KOKORO_DEFAULT_VOICE" "pf_dora"
Ensure-EnvKv "KOKORO_DEFAULT_LANG" "pt-br"
Ok ".env com host/porta loopback e voz Dora garantidos."
Log "KALINE_BRIDGE_SHARED_KEY é gerada automaticamente no primeiro start do local-server (sem precisar editar $EnvFile)."

# [6/10] Ollama e modelos -------------------------------------------------------
Step 6 "Verificando Ollama e modelos ..."
if (Has-Cmd "ollama") {
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 -UseBasicParsing | Out-Null
        $models = (ollama list 2>$null | Select-Object -Skip 1 | ForEach-Object { ($_ -split '\s+')[0] })
        foreach ($m in @("llama3.2:1b", "qwen2.5:1.5b", "qwen3.5:2b", "qwen3.5:0.8b")) {
            if ($models -contains $m) {
                Ok "Modelo já instalado: $m"
            } else {
                $resp = Read-Host "Modelo $m não encontrado. Deseja baixar agora com 'ollama pull $m'? [s/N]"
                if ($resp -match '^[sS]$') { ollama pull $m } else { Warn "Pulando $m — instale depois com 'ollama pull $m' se for usar." }
            }
        }
    } catch {
        Warn "Ollama instalado, mas não respondeu em 127.0.0.1:11434 (inicie o serviço se for usar modelos locais)."
    }
} else {
    Warn "ollama não encontrado — provider local ficará indisponível; o mock continua funcionando."
}

# [7/10] Whisper ----------------------------------------------------------------
Step 7 "Verificando Whisper (transcrição local) ..."
$WhisperDir = "$env:USERPROFILE\Kaline\motores\whisper.cpp"
$whisperBinCands = @(
    "$WhisperDir\build\bin\Release\whisper-cli.exe",
    "$WhisperDir\build\bin\whisper-cli.exe"
)
$whisperModelCand = "$WhisperDir\models\ggml-small.bin"
$whisperBinFound = $whisperBinCands | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not ($whisperBinFound -and (Test-Path $whisperModelCand))) {
    if ((Has-Cmd "git") -and (Has-Cmd "cmake")) {
        $resp = Read-Host "Whisper não encontrado. Baixar e compilar whisper.cpp + modelo small (~500MB) agora em $WhisperDir? [s/N]"
        if ($resp -match '^[sS]$') {
            New-Item -ItemType Directory -Force -Path (Split-Path $WhisperDir -Parent) | Out-Null
            if (-not (Test-Path $WhisperDir)) {
                git clone --depth 1 https://github.com/ggerganov/whisper.cpp $WhisperDir
                if ($LASTEXITCODE -ne 0) { Warn "Falha ao clonar whisper.cpp." }
            }
            if (Test-Path $WhisperDir) {
                Push-Location $WhisperDir
                cmake -B build
                if ($LASTEXITCODE -eq 0) { cmake --build build --config Release }
                if ($LASTEXITCODE -ne 0) { Warn "Falha ao compilar whisper.cpp — verifique se o Visual Studio Build Tools/cmake estão instalados." }
                bash ./models/download-ggml-model.sh small 2>$null
                if ($LASTEXITCODE -ne 0) {
                    try {
                        Invoke-WebRequest -Uri "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin" -OutFile "models\ggml-small.bin" -UseBasicParsing
                    } catch { Warn "Falha ao baixar o modelo ggml-small.bin." }
                }
                Pop-Location
                $whisperBinFound = $whisperBinCands | Where-Object { Test-Path $_ } | Select-Object -First 1
                if ($whisperBinFound -and (Test-Path $whisperModelCand)) {
                    Ensure-EnvKv "WHISPER_ENABLED" "true"
                    Ensure-EnvKv "WHISPER_ENGINE" "whisper.cpp"
                    Ensure-EnvKv "WHISPER_CPP_BIN" $whisperBinFound
                    Ensure-EnvKv "WHISPER_LANGUAGE" "pt"
                    Ensure-EnvKv "WHISPER_MODEL" "small"
                    Ensure-EnvKv "WHISPER_MODEL_PATH" $whisperModelCand
                    Ok "Whisper compilado e configurado em $EnvFile."
                } else {
                    Warn "Build do Whisper não produziu binário/modelo esperados — configure manualmente depois (ver docs\offline\MODELS_LOCAL.md)."
                }
            }
        } else {
            Warn "Pulando Whisper — instale depois manualmente (ver docs\offline\MODELS_LOCAL.md) se for usar transcrição."
        }
    } else {
        Warn "git/cmake não encontrados — pulando build automático do Whisper. Instale manualmente depois (ver docs\offline\MODELS_LOCAL.md)."
    }
}

if ($whisperBinFound) {
    Ensure-EnvKv "WHISPER_ENABLED" "true"
    Ensure-EnvKv "WHISPER_ENGINE" "whisper.cpp"
    Ensure-EnvKv "WHISPER_CPP_BIN" $whisperBinFound
    Ensure-EnvKv "WHISPER_LANGUAGE" "pt"
}
if (Test-Path $whisperModelCand) {
    Ensure-EnvKv "WHISPER_MODEL" "small"
    Ensure-EnvKv "WHISPER_MODEL_PATH" $whisperModelCand
}
if ($whisperBinFound -and (Test-Path $whisperModelCand)) {
    Ok "Whisper detectado e configurado em $EnvFile."
} else {
    Warn "Binário/modelo do Whisper não encontrado — transcrição ficará indisponível até configurar manualmente."
}

# [8/10] Kokoro/Dora -------------------------------------------------------------
Step 8 "Verificando Kokoro/Dora (voz local) ..."
$KokoroDir = "$env:USERPROFILE\Kaline\motores\kokoro"
$kokoroModelCand = "$KokoroDir\kokoro-v1.0.int8.onnx"
$kokoroVoicesCand = "$KokoroDir\voices-v1.0.bin"
$KokoroModelUrl = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx"
$KokoroVoicesUrl = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"

if (-not ((Test-Path $kokoroModelCand) -and (Test-Path $kokoroVoicesCand))) {
    $resp = Read-Host "Kokoro não encontrado. Baixar modelo + voices (~150MB) agora em $KokoroDir? [s/N]"
    if ($resp -match '^[sS]$') {
        New-Item -ItemType Directory -Force -Path $KokoroDir | Out-Null
        $okDl = $true
        try { Invoke-WebRequest -Uri $KokoroModelUrl -OutFile $kokoroModelCand -UseBasicParsing } catch { Warn "Falha ao baixar o modelo Kokoro."; $okDl = $false }
        try { Invoke-WebRequest -Uri $KokoroVoicesUrl -OutFile $kokoroVoicesCand -UseBasicParsing } catch { Warn "Falha ao baixar as voices do Kokoro."; $okDl = $false }
        if ($okDl -and (Test-Path $kokoroModelCand) -and (Test-Path $kokoroVoicesCand)) {
            Ensure-EnvKv "KOKORO_MODEL_PATH" $kokoroModelCand
            Ensure-EnvKv "KOKORO_VOICES_PATH" $kokoroVoicesCand
            Ok "Kokoro baixado e configurado em $EnvFile."
        } else {
            Remove-Item -Force -ErrorAction SilentlyContinue $kokoroModelCand, $kokoroVoicesCand
            Warn "Download do Kokoro incompleto — configure manualmente depois (ver docs\offline\MODELS_LOCAL.md)."
        }
    } else {
        Warn "Pulando Kokoro — instale depois manualmente (ver docs\offline\MODELS_LOCAL.md) se for usar voz local."
    }
}

if (Test-Path $kokoroModelCand) { Ensure-EnvKv "KOKORO_MODEL_PATH" $kokoroModelCand }
if (Test-Path $kokoroVoicesCand) { Ensure-EnvKv "KOKORO_VOICES_PATH" $kokoroVoicesCand }
if ((Test-Path $kokoroModelCand) -and (Test-Path $kokoroVoicesCand)) {
    Ok "Kokoro detectado e configurado em $EnvFile."
} else {
    Warn "Modelo/voices do Kokoro não encontrados — /tts/status ficará 'misconfigured' até configurar manualmente (não quebra o build)."
}

# [9/10] Atalhos -----------------------------------------------------------------
Step 9 "Criando atalhos na Área de Trabalho e no Menu Iniciar ..."
& "$ScriptDir\create-kaline-windows-shortcuts.ps1"

# [10/10] Diagnóstico final -------------------------------------------------------
Step 10 "Rodando diagnóstico final ..."
& "$ScriptDir\check-kaline-windows.ps1"

Log ""
Ok "Instalação concluída."
Log "Para abrir a Kaline Offline agora: powershell -File scripts\start-kaline-windows.ps1"
Log "A API local roda em http://127.0.0.1:64113 (nunca exposta fora deste computador)."
Log "Use os atalhos: Kaline Offline, Kaline Janelinha, Instalar/Atualizar Kaline, Verificar Kaline, Parar Kaline."
