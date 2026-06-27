#!/usr/bin/env bash
# Instalador clicável da Kaline Offline para Linux Mint Xfce.
#
# Este script NÃO É a Kaline (não é a IA) — é só um instalador de sistema operacional.
# Ele só prepara dependências, configura .env, builda o local-server e o companion
# Tauri, e cria atalhos. A Kaline em si só conversa com http://127.0.0.1:64113.
#
# Nunca usa 0.0.0.0, nunca abre porta pública, nunca manda áudio para a nuvem,
# nunca baixa modelos grandes sem confirmação, nunca sobrescreve .env sem backup.
#
# Uso: bash scripts/install-kaline-mint.sh
#      (ou dois cliques em install-kaline-mint.desktop)

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/kaline-common.sh
source "$SCRIPT_DIR/lib/kaline-common.sh"

TOTAL_STEPS=10
step() { kaline_log ""; kaline_log "[$1/$TOTAL_STEPS] $2"; }

kaline_ensure_dirs

# [1/10] Localizar o repositório ---------------------------------------------
step 1 "Localizando o repositório da Kaline Offline ..."
ROOT_DIR="$(kaline_find_repo_root)" || true
if [ -z "${ROOT_DIR:-}" ]; then
  kaline_warn "Repositório não encontrado nos caminhos conhecidos."
  if command -v gh >/dev/null 2>&1; then
    if gh auth status >/dev/null 2>&1; then
      read -r -p "Clonar Tonyus-dev/kalineatelier em $HOME/Kaline/kalineatelier agora? [s/N] " resp
      if [[ "$resp" =~ ^[sS]$ ]]; then
        mkdir -p "$HOME/Kaline"
        gh repo clone Tonyus-dev/kalineatelier "$HOME/Kaline/kalineatelier" && ROOT_DIR="$HOME/Kaline/kalineatelier"
      fi
    else
      kaline_warn "gh está instalado, mas não autenticado. Rode 'gh auth login' (lembre-se: o repo pode não ser público)."
    fi
  else
    kaline_warn "gh (GitHub CLI) não encontrado — não é possível oferecer clone automático."
  fi
fi
if [ -z "${ROOT_DIR:-}" ]; then
  kaline_err "Não foi possível localizar nem clonar o repositório. Rode este script de dentro da pasta do repo."
  exit 1
fi
cd "$ROOT_DIR"
kaline_ok "Repositório em $ROOT_DIR"

# [2/10] Dependências de sistema (apt) ----------------------------------------
step 2 "Verificando dependências de sistema ..."
CORE_PKGS=(curl git build-essential)
TAURI_PKGS=(libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev)
if command -v apt-get >/dev/null 2>&1; then
  MISSING=()
  for p in "${CORE_PKGS[@]}"; do dpkg -s "$p" >/dev/null 2>&1 || MISSING+=("$p"); done
  if [ "${#MISSING[@]}" -gt 0 ]; then
    kaline_log "Pacotes essenciais faltando: ${MISSING[*]} (será necessário sudo)."
    sudo apt-get update && sudo apt-get install -y "${MISSING[@]}" \
      || kaline_warn "Não foi possível instalar pacotes essenciais automaticamente — instale manualmente: ${MISSING[*]}"
  else
    kaline_ok "Pacotes essenciais já presentes."
  fi
  MISSING_TAURI=()
  for p in "${TAURI_PKGS[@]}"; do dpkg -s "$p" >/dev/null 2>&1 || MISSING_TAURI+=("$p"); done
  if [ "${#MISSING_TAURI[@]}" -gt 0 ]; then
    kaline_log "Pacotes do Tauri faltando: ${MISSING_TAURI[*]}."
    if ! sudo apt-get install -y "${MISSING_TAURI[@]}" 2>/dev/null; then
      kaline_warn "libwebkit2gtk-4.1-dev pode não existir nesta versão do Mint; tentando libwebkit2gtk-4.0-dev como alternativa."
      sudo apt-get install -y libwebkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev \
        || kaline_warn "Não foi possível instalar dependências do Tauri — o companion nativo pode não buildar (rotas web continuam funcionando)."
    fi
  else
    kaline_ok "Dependências do Tauri já presentes."
  fi
else
  kaline_warn "apt-get não encontrado — pulei a instalação automática de dependências de sistema."
fi

# [3/10] Ferramentas de linguagem (bun/node/npm/cargo/rustup) -----------------
step 3 "Verificando bun/node/npm/cargo/rustup ..."
command -v bun >/dev/null 2>&1 && kaline_ok "bun: $(bun --version)" || kaline_err "bun não encontrado — instale em https://bun.sh antes de continuar."
command -v node >/dev/null 2>&1 && kaline_ok "node: $(node --version)" || kaline_err "node não encontrado — instale em https://nodejs.org antes de continuar."
command -v npm >/dev/null 2>&1 && kaline_ok "npm: $(npm --version)" || kaline_err "npm não encontrado."
command -v cargo >/dev/null 2>&1 && kaline_ok "cargo: $(cargo --version)" || kaline_warn "cargo não encontrado — companion Tauri ficará indisponível (fallback no navegador)."
if ! command -v bun >/dev/null 2>&1 || ! command -v node >/dev/null 2>&1; then
  kaline_err "Dependências essenciais faltando (bun/node). Instale-as e rode este script de novo."
  exit 1
fi

# [4/10] Instalar dependências do projeto -------------------------------------
step 4 "Instalando dependências do projeto (bun install) ..."
bun install || { kaline_err "bun install falhou."; exit 1; }

kaline_log "Buildando local-server (npm install && npm run build) ..."
(cd local-server && npm install && npm run build) \
  && kaline_ok "local-server buildado." \
  || kaline_warn "Build do local-server falhou — rode manualmente depois: cd local-server && npm install && npm run build"

if command -v cargo >/dev/null 2>&1; then
  kaline_log "Buildando companion Tauri (apps/kaline-desktop) — pode levar alguns minutos ..."
  (cd apps/kaline-desktop && npm install && npm run tauri build) \
    && kaline_ok "Companion Tauri buildado." \
    || kaline_warn "Build do companion Tauri falhou — Kaline Offline/Janelinha abrirão no navegador como alternativa honesta."
else
  kaline_warn "Sem cargo — pulando build do companion Tauri (fallback no navegador)."
fi

# [5/10] Configurar .env ------------------------------------------------------
step 5 "Configurando local-server/.env ..."
ENV_FILE="local-server/.env"
if [ ! -f "$ENV_FILE" ]; then
  cp local-server/.env.example "$ENV_FILE"
  kaline_ok "$ENV_FILE criado a partir de .env.example."
else
  backup="$(kaline_backup_file "$ENV_FILE")"
  kaline_ok "$ENV_FILE já existia — backup salvo em $backup"
fi
ensure_env_kv() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >>"$ENV_FILE"
  fi
}
ensure_env_kv "KALINE_LOCAL_HOST" "127.0.0.1"
ensure_env_kv "KALINE_LOCAL_PORT" "64113"
ensure_env_kv "OLLAMA_BASE_URL" "http://127.0.0.1:11434"
ensure_env_kv "TTS_PROVIDER" "kokoro"
ensure_env_kv "KOKORO_DEFAULT_VOICE" "pf_dora"
ensure_env_kv "KOKORO_DEFAULT_LANG" "pt-br"
kaline_ok ".env com host/porta loopback e voz Dora garantidos."
kaline_log "KALINE_BRIDGE_SHARED_KEY é gerada automaticamente no primeiro start do local-server (sem precisar editar $ENV_FILE)."

# [6/10] Verificar Ollama e modelos --------------------------------------------
step 6 "Verificando Ollama e modelos ..."
if command -v ollama >/dev/null 2>&1; then
  kaline_ok "ollama encontrado."
  if curl -sf --max-time 2 "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
    MODELS="$(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}')"
    for m in "llama3.2:1b" "qwen2.5:1.5b" "qwen3.5:2b" "qwen3.5:0.8b"; do
      if echo "$MODELS" | grep -qx "$m"; then
        kaline_ok "Modelo já instalado: $m"
      else
        read -r -p "Modelo $m não encontrado. Deseja baixar agora com 'ollama pull $m'? [s/N] " resp
        if [[ "$resp" =~ ^[sS]$ ]]; then
          ollama pull "$m" || kaline_warn "Falha ao baixar $m."
        else
          kaline_warn "Pulando $m — instale depois com 'ollama pull $m' se for usar."
        fi
      fi
    done
  else
    kaline_warn "Ollama instalado, mas não respondeu em 127.0.0.1:11434 (inicie o serviço se for usar modelos locais)."
  fi
else
  kaline_warn "ollama não encontrado — provider local ficará indisponível (https://ollama.com); o mock continua funcionando."
fi

# [7/10] Verificar/instalar Whisper ---------------------------------------------
step 7 "Verificando Whisper (transcrição local) ..."
WHISPER_DIR="$HOME/Kaline/motores/whisper.cpp"
for cand_bin in "$WHISPER_DIR/build/bin/whisper-cli" "$HOME/whisper.cpp/build/bin/whisper-cli"; do
  if [ -f "$cand_bin" ]; then
    ensure_env_kv "WHISPER_ENABLED" "true"
    ensure_env_kv "WHISPER_ENGINE" "whisper.cpp"
    ensure_env_kv "WHISPER_CPP_BIN" "$cand_bin"
    ensure_env_kv "WHISPER_LANGUAGE" "pt"
    WHISPER_BIN_FOUND="$cand_bin"
    break
  fi
done
for cand_model in "$WHISPER_DIR/models/ggml-small.bin" "$HOME/whisper.cpp/models/ggml-small.bin"; do
  if [ -f "$cand_model" ]; then
    ensure_env_kv "WHISPER_MODEL" "small"
    ensure_env_kv "WHISPER_MODEL_PATH" "$cand_model"
    WHISPER_MODEL_FOUND="$cand_model"
    break
  fi
done
if [ -n "${WHISPER_BIN_FOUND:-}" ] && [ -n "${WHISPER_MODEL_FOUND:-}" ]; then
  kaline_ok "Whisper detectado e configurado em $ENV_FILE."
elif command -v git >/dev/null 2>&1 && command -v cmake >/dev/null 2>&1; then
  read -r -p "Whisper não encontrado. Baixar e compilar whisper.cpp + modelo small (~500MB) agora em $WHISPER_DIR? [s/N] " resp
  if [[ "$resp" =~ ^[sS]$ ]]; then
    mkdir -p "$HOME/Kaline/motores"
    if [ ! -d "$WHISPER_DIR" ]; then
      git clone --depth 1 https://github.com/ggerganov/whisper.cpp "$WHISPER_DIR" || kaline_warn "Falha ao clonar whisper.cpp."
    fi
    if [ -d "$WHISPER_DIR" ]; then
      (cd "$WHISPER_DIR" && cmake -B build && cmake --build build --config Release) \
        || kaline_warn "Falha ao compilar whisper.cpp — verifique se cmake/g++ estão instalados."
      (cd "$WHISPER_DIR" && bash ./models/download-ggml-model.sh small) \
        || kaline_warn "Falha ao baixar o modelo ggml-small.bin."
      cand_bin="$WHISPER_DIR/build/bin/whisper-cli"
      cand_model="$WHISPER_DIR/models/ggml-small.bin"
      if [ -f "$cand_bin" ] && [ -f "$cand_model" ]; then
        ensure_env_kv "WHISPER_ENABLED" "true"
        ensure_env_kv "WHISPER_ENGINE" "whisper.cpp"
        ensure_env_kv "WHISPER_CPP_BIN" "$cand_bin"
        ensure_env_kv "WHISPER_LANGUAGE" "pt"
        ensure_env_kv "WHISPER_MODEL" "small"
        ensure_env_kv "WHISPER_MODEL_PATH" "$cand_model"
        kaline_ok "Whisper compilado e configurado em $ENV_FILE."
      else
        kaline_warn "Build do Whisper não produziu binário/modelo esperados — configure manualmente depois (ver docs/offline/MODELS_LOCAL.md)."
      fi
    fi
  else
    kaline_warn "Pulando Whisper — instale depois manualmente (ver docs/offline/MODELS_LOCAL.md) se for usar transcrição."
  fi
else
  kaline_warn "Binário/modelo do Whisper não encontrado e cmake/git ausentes para compilar automaticamente — instale manualmente (ver docs/offline/MODELS_LOCAL.md)."
fi

# [8/10] Verificar/baixar Kokoro/Dora --------------------------------------------
step 8 "Verificando Kokoro/Dora (voz local) ..."
KOKORO_DIR="$HOME/Kaline/motores/kokoro"
KOKORO_MODEL_URL="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx"
KOKORO_VOICES_URL="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"
for cand_model in "$KOKORO_DIR/kokoro-v1.0.int8.onnx" "$HOME/kokoro/kokoro-v1.0.int8.onnx"; do
  if [ -f "$cand_model" ]; then
    ensure_env_kv "KOKORO_MODEL_PATH" "$cand_model"
    KOKORO_MODEL_FOUND="$cand_model"
    break
  fi
done
for cand_voices in "$KOKORO_DIR/voices-v1.0.bin" "$HOME/kokoro/voices-v1.0.bin"; do
  if [ -f "$cand_voices" ]; then
    ensure_env_kv "KOKORO_VOICES_PATH" "$cand_voices"
    KOKORO_VOICES_FOUND="$cand_voices"
    break
  fi
done
if [ -n "${KOKORO_MODEL_FOUND:-}" ] && [ -n "${KOKORO_VOICES_FOUND:-}" ]; then
  kaline_ok "Kokoro detectado e configurado em $ENV_FILE."
elif command -v curl >/dev/null 2>&1; then
  read -r -p "Kokoro não encontrado. Baixar modelo + voices (~150MB) agora em $KOKORO_DIR? [s/N] " resp
  if [[ "$resp" =~ ^[sS]$ ]]; then
    mkdir -p "$KOKORO_DIR"
    ok_dl=true
    curl -fSL --max-time 300 -o "$KOKORO_DIR/kokoro-v1.0.int8.onnx" "$KOKORO_MODEL_URL" || { kaline_warn "Falha ao baixar o modelo Kokoro."; ok_dl=false; }
    curl -fSL --max-time 300 -o "$KOKORO_DIR/voices-v1.0.bin" "$KOKORO_VOICES_URL" || { kaline_warn "Falha ao baixar as voices do Kokoro."; ok_dl=false; }
    if [ "$ok_dl" = true ] && [ -s "$KOKORO_DIR/kokoro-v1.0.int8.onnx" ] && [ -s "$KOKORO_DIR/voices-v1.0.bin" ]; then
      ensure_env_kv "KOKORO_MODEL_PATH" "$KOKORO_DIR/kokoro-v1.0.int8.onnx"
      ensure_env_kv "KOKORO_VOICES_PATH" "$KOKORO_DIR/voices-v1.0.bin"
      kaline_ok "Kokoro baixado e configurado em $ENV_FILE."
    else
      rm -f "$KOKORO_DIR/kokoro-v1.0.int8.onnx" "$KOKORO_DIR/voices-v1.0.bin"
      kaline_warn "Download do Kokoro incompleto — configure manualmente depois (ver docs/offline/MODELS_LOCAL.md)."
    fi
  else
    kaline_warn "Pulando Kokoro — instale depois manualmente (ver docs/offline/MODELS_LOCAL.md) se for usar voz local."
  fi
else
  kaline_warn "Modelo/voices do Kokoro não encontrados e curl ausente para baixar automaticamente — instale manualmente (ver docs/offline/MODELS_LOCAL.md)."
fi

# [9/10] Atalhos e painel -------------------------------------------------------
step 9 "Criando atalhos e tentando fixar a Kaline Janelinha no painel do Xfce ..."
KALINE_REPO_ROOT="$ROOT_DIR" bash "$SCRIPT_DIR/create-kaline-desktop-launchers.sh"
bash "$SCRIPT_DIR/pin-kaline-to-mint-panel.sh"

# [10/10] Diagnóstico final ------------------------------------------------------
step 10 "Rodando diagnóstico final ..."
bash "$SCRIPT_DIR/check-kaline-mint.sh" || true

echo ""
kaline_ok "Instalação concluída."
kaline_log "Para abrir a Kaline Offline agora: bash scripts/start-kaline-mint.sh"
kaline_log "A API local roda em http://127.0.0.1:64113 (nunca exposta fora deste computador)."
kaline_log "Use os atalhos no menu de aplicativos: Kaline Offline, Kaline Janelinha, Verificar Kaline, Parar Kaline."
