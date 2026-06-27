#!/usr/bin/env bash
# Diagnóstico da Kaline Offline no Linux Mint Xfce. Só lê e reporta — não instala,
# não baixa, não altera nada.
#
# Uso: bash scripts/check-kaline-mint.sh

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/kaline-common.sh
source "$SCRIPT_DIR/lib/kaline-common.sh"

OK_COUNT=0
WARN_COUNT=0
ERR_COUNT=0

check_ok()   { kaline_ok "$1"; OK_COUNT=$((OK_COUNT+1)); }
check_warn() { kaline_warn "$1"; WARN_COUNT=$((WARN_COUNT+1)); }
check_err()  { kaline_err "$1"; ERR_COUNT=$((ERR_COUNT+1)); }

echo "== Diagnóstico da Kaline Offline =="
echo ""

ROOT_DIR="$(kaline_find_repo_root)" || {
  check_err "Repositório da Kaline não encontrado a partir deste diretório."
  echo ""
  echo "$ERR_COUNT erro(s)."
  exit 1
}
check_ok "Repositório encontrado em $ROOT_DIR"
cd "$ROOT_DIR"

command -v bun >/dev/null 2>&1 && check_ok "bun encontrado ($(bun --version))" || check_err "bun não encontrado (https://bun.sh)"
command -v node >/dev/null 2>&1 && check_ok "node encontrado ($(node --version))" || check_err "node não encontrado (https://nodejs.org)"
command -v npm >/dev/null 2>&1 && check_ok "npm encontrado ($(npm --version))" || check_err "npm não encontrado"
command -v cargo >/dev/null 2>&1 && check_ok "cargo encontrado ($(cargo --version))" || check_warn "cargo não encontrado — companion Tauri não pode ser buildado (rotas web continuam funcionando)"
command -v rustup >/dev/null 2>&1 && check_ok "rustup encontrado" || check_warn "rustup não encontrado (opcional se cargo já está instalado de outra forma)"

[ -f "local-server/dist/index.js" ] && check_ok "local-server buildado (local-server/dist/index.js)" || check_warn "local-server ainda não buildado — rode 'cd local-server && npm run build'"

[ -f "local-server/.env" ] && check_ok "local-server/.env existe" || check_warn "local-server/.env não existe — copie de local-server/.env.example"

if kaline_port_in_use 64113; then
  check_ok "Porta 64113 em uso (provavelmente o local-server)"
else
  check_warn "Porta 64113 livre — local-server não está rodando agora"
fi

if command -v curl >/dev/null 2>&1; then
  for route in "/health" "/model/status" "/transcribe/status" "/tts/status" "/bridge/status" "/meetings"; do
    if curl -sf --max-time 2 "http://127.0.0.1:64113${route}" >/dev/null 2>&1; then
      check_ok "Rota responde: GET ${route}"
    else
      check_warn "Rota não respondeu: GET ${route} (local-server pode estar parado)"
    fi
  done
else
  check_warn "curl não encontrado — não foi possível testar as rotas do local-server"
fi

if kaline_port_in_use 4173 && command -v curl >/dev/null 2>&1; then
  CHAT_BODY="$(curl -sf --max-time 3 -L "http://127.0.0.1:4173/chat" 2>/dev/null)"
  if [ -z "$CHAT_BODY" ]; then
    check_warn "Não foi possível obter resposta de http://127.0.0.1:4173/chat (PWA pode estar iniciando ainda)"
  elif echo "$CHAT_BODY" | grep -q "Missing Supabase environment variable"; then
    check_err "/chat retornou erro de variável de ambiente do Supabase — regressão de acoplamento com Supabase"
  elif echo "$CHAT_BODY" | grep -q "TSRSplitComponent"; then
    check_err "/chat retornou 'TSRSplitComponent' — bug conhecido de SSR/code-splitting"
  else
    check_ok "/chat respondeu sem indícios de regressão conhecida"
  fi
fi

if command -v ollama >/dev/null 2>&1; then
  check_ok "ollama encontrado"
  if curl -sf --max-time 2 "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
    check_ok "Ollama respondendo em 127.0.0.1:11434"
    if command -v ollama >/dev/null 2>&1; then
      MODELS="$(ollama list 2>/dev/null | tail -n +2 | awk '{print $1}')"
      for m in "llama3.2:1b" "qwen2.5:1.5b" "qwen3.5:2b" "qwen3.5:0.8b"; do
        if echo "$MODELS" | grep -qx "$m"; then
          check_ok "Modelo Ollama instalado: $m"
        else
          check_warn "Modelo Ollama não encontrado: $m (instale com 'ollama pull $m' se for usar)"
        fi
      done
    fi
  else
    check_warn "Ollama instalado, mas não respondeu em 127.0.0.1:11434 (está rodando?)"
  fi
else
  check_warn "ollama não encontrado — provider de modelo local ficará indisponível (mock continua funcionando)"
fi

if [ -f "local-server/.env" ] && command -v curl >/dev/null 2>&1; then
  ENV_PROVIDER="$(grep -m1 '^KALINE_MODEL_PROVIDER=' local-server/.env | cut -d= -f2-)"
  LIVE_STATUS="$(curl -sf --max-time 2 "http://127.0.0.1:64113/model/status" 2>/dev/null)"
  LIVE_PROVIDER=""
  if [ -n "$LIVE_STATUS" ]; then
    LIVE_PROVIDER="$(echo "$LIVE_STATUS" | grep -o '"provider"[[:space:]]*:[[:space:]]*"[^"]*"' | head -n1 | cut -d'"' -f4)"
  fi
  if [ -n "$ENV_PROVIDER" ] && [ -n "$LIVE_PROVIDER" ]; then
    if [ "$ENV_PROVIDER" = "$LIVE_PROVIDER" ]; then
      check_ok "Provider de modelo consistente: $LIVE_PROVIDER (env e local-server batem)"
    else
      check_err "Provider de modelo divergente: local-server/.env diz '$ENV_PROVIDER', mas o local-server em execução reporta '$LIVE_PROVIDER'. Reinicie o local-server (bash scripts/start-kaline-mint.sh) para aplicar a config nova."
    fi
  else
    check_warn "Não foi possível confirmar o provider de modelo (env ou /model/status indisponível) — pulei a checagem de consistência."
  fi
else
  check_warn "Sem local-server/.env ou curl — não foi possível checar consistência do provider de modelo"
fi

if [ -f "local-server/.env" ]; then
  WHISPER_BIN="$(grep -m1 '^WHISPER_CPP_BIN=' local-server/.env | cut -d= -f2-)"
  WHISPER_MODEL="$(grep -m1 '^WHISPER_MODEL_PATH=' local-server/.env | cut -d= -f2-)"
  [ -n "$WHISPER_BIN" ] && [ -f "$WHISPER_BIN" ] && check_ok "Binário do Whisper encontrado ($WHISPER_BIN)" \
    || check_warn "Binário do Whisper (whisper-cli) não encontrado — transcrição ficará indisponível"
  [ -n "$WHISPER_MODEL" ] && [ -f "$WHISPER_MODEL" ] && check_ok "Modelo Whisper Small encontrado ($WHISPER_MODEL)" \
    || check_warn "Modelo Whisper Small não encontrado — transcrição ficará indisponível"

  KOKORO_MODEL="$(grep -m1 '^KOKORO_MODEL_PATH=' local-server/.env | cut -d= -f2-)"
  KOKORO_VOICES="$(grep -m1 '^KOKORO_VOICES_PATH=' local-server/.env | cut -d= -f2-)"
  [ -n "$KOKORO_MODEL" ] && [ -f "$KOKORO_MODEL" ] && [ -n "$KOKORO_VOICES" ] && [ -f "$KOKORO_VOICES" ] \
    && check_ok "Kokoro configurado (modelo e voices encontrados)" \
    || check_warn "Kokoro não encontrado ou incompleto — voz Dora ficará indisponível (fallback do navegador continua)"
else
  check_warn "Sem local-server/.env — não foi possível checar Whisper/Kokoro"
fi

[ -d "apps/kaline-desktop/src-tauri/target/release" ] && [ -x "apps/kaline-desktop/src-tauri/target/release/kaline-desktop" ] \
  && check_ok "Companion Tauri buildado (apps/kaline-desktop/src-tauri/target/release/kaline-desktop)" \
  || check_warn "Companion Tauri ainda não buildado — Kaline Offline/Janelinha abrirão no navegador como alternativa"

APPS_DIR="$HOME/.local/share/applications"
for id in "dev.tonyus.kaline-offline" "dev.tonyus.kaline-janelinha" "dev.tonyus.kaline-instalar" "dev.tonyus.kaline-verificar" "dev.tonyus.kaline-parar"; do
  if [ -f "$APPS_DIR/${id}.desktop" ]; then
    check_ok "Atalho criado: ${id}.desktop"
  else
    check_warn "Atalho ausente: ${id}.desktop (rode scripts/create-kaline-desktop-launchers.sh)"
  fi
done

if kaline_is_xfce; then
  check_ok "Ambiente Xfce detectado"
  if [ -f "$KALINE_HOME/panel-pin-status.txt" ]; then
    check_ok "Tentativa de fixação no painel já registrada: $(cat "$KALINE_HOME/panel-pin-status.txt")"
  else
    check_warn "Fixação no painel do Xfce ainda não tentada — rode scripts/pin-kaline-to-mint-panel.sh"
  fi
else
  check_warn "Ambiente Xfce não detectado — fixação automática no painel não se aplica neste ambiente"
fi

echo ""
echo "Resumo: $OK_COUNT OK, $WARN_COUNT em atenção, $ERR_COUNT erro(s)."
[ "$ERR_COUNT" -gt 0 ] && exit 1
exit 0
