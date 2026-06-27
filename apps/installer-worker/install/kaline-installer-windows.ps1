# Bootstrap público da Kaline Offline para Windows.
#
# Este arquivo NÃO é o instalador real — é só um bootstrap pequeno, baixado
# pelo portal público (Cloudflare Worker). Ele apenas localiza ou clona o
# repositório Tonyus-dev/kalineatelier e chama o instalador real em
# scripts\install-kaline-windows.ps1. Toda a lógica de instalação
# (dependências, .env, Ollama, Whisper, Kokoro, atalhos) vive lá, não aqui.
#
# Não exige administrador. Não pede token. Não lê nada fora do listado abaixo.
#
# Uso: duplo clique em kaline-installer-windows.bat, ou:
#   powershell -ExecutionPolicy Bypass -File kaline-installer-windows.ps1

$ErrorActionPreference = "Continue"

function Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[Atenção] $msg" -ForegroundColor Yellow }
function Err($msg)  { Write-Host "[Erro] $msg" -ForegroundColor Red }
function Log($msg)  { Write-Host $msg }

function Has-Cmd($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

$Repo = "Tonyus-dev/kalineatelier"
$Candidates = @(
    (Join-Path $env:USERPROFILE "Kaline\kalineatelier"),
    (Join-Path $env:USERPROFILE "kalineatelier"),
    (Join-Path $env:USERPROFILE "Downloads\kalineatelier")
)

Log "== Bootstrap da Kaline Offline (Windows) =="
Log "Este script só localiza/clona o repositório e chama o instalador real."
Log ""

# [1/4] Verificar GitHub CLI ----------------------------------------------------
Log "[1/4] Verificando GitHub CLI (gh) ..."
if (Has-Cmd "gh") {
    Ok "gh encontrado: $(gh --version | Select-Object -First 1)"
} else {
    Warn "gh (GitHub CLI) não encontrado."
    Log "Instale com: winget install --id GitHub.cli"
    Log "(ou veja https://github.com/cli/cli#installation)"
    Log "Depois rode este script de novo."
    exit 1
}

gh auth status *> $null
if ($LASTEXITCODE -eq 0) {
    Ok "gh já autenticado."
} else {
    Warn "gh está instalado, mas não autenticado."
    Log "Rode em outro terminal: gh auth login"
    Log "Nunca cole tokens neste site nem em scripts — use sempre 'gh auth login' interativo."
    $resp = Read-Host "Já autenticou e quer continuar agora? [s/N]"
    if ($resp -notmatch '^[sS]$') {
        Log "Saindo. Rode este script de novo após 'gh auth login'."
        exit 1
    }
}

# [2/4] Localizar ou clonar o repositório ---------------------------------------
Log ""
Log "[2/4] Localizando o repositório da Kaline Offline ..."
$RootDir = $null
foreach ($c in $Candidates) {
    if ((Test-Path (Join-Path $c "package.json")) -and (Test-Path (Join-Path $c "scripts"))) {
        $RootDir = $c
        break
    }
}

if ($RootDir) {
    Ok "Repositório encontrado em $RootDir"
    $resp = Read-Host "Atualizar com 'git pull' agora? [s/N]"
    if ($resp -match '^[sS]$') {
        Push-Location $RootDir
        git pull
        if ($LASTEXITCODE -ne 0) { Warn "git pull falhou — seguindo com a cópia local existente." }
        Pop-Location
    }
} else {
    Warn "Repositório não encontrado em nenhum dos caminhos conhecidos:"
    foreach ($c in $Candidates) { Log "  - $c" }
    $resp = Read-Host "Clonar $Repo em %USERPROFILE%\Kaline\kalineatelier agora? [s/N]"
    if ($resp -match '^[sS]$') {
        New-Item -ItemType Directory -Force (Join-Path $env:USERPROFILE "Kaline") | Out-Null
        Set-Location (Join-Path $env:USERPROFILE "Kaline")
        gh repo clone $Repo
        if ($LASTEXITCODE -eq 0) {
            $RootDir = Join-Path $env:USERPROFILE "Kaline\kalineatelier"
            Ok "Repositório clonado em $RootDir"
        } else {
            Err "Falha ao clonar $Repo. Verifique sua conexão e se você tem acesso ao repositório (gh auth status)."
            exit 1
        }
    } else {
        Log "Saindo sem clonar. Baixe o repositório manualmente e rode este script de dentro dele, se preferir."
        exit 1
    }
}

# [3/4] Entrar no repositório ----------------------------------------------------
Log ""
Log "[3/4] Entrando no repositório ..."
Set-Location $RootDir
Ok "Em $RootDir"

# [4/4] Chamar o instalador real --------------------------------------------------
Log ""
Log "[4/4] Chamando o instalador real (scripts\install-kaline-windows.ps1) ..."
$RealInstaller = Join-Path $RootDir "scripts\install-kaline-windows.ps1"
if (-not (Test-Path $RealInstaller)) {
    Err "scripts\install-kaline-windows.ps1 não encontrado em $RootDir."
    Err "Este bootstrap não duplica a lógica de instalação — sem esse arquivo, não há como continuar."
    exit 1
}

powershell -ExecutionPolicy Bypass -File $RealInstaller
exit $LASTEXITCODE
