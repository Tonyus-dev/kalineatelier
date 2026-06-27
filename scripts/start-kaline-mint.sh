#!/usr/bin/env bash
# Inicia a Kaline Offline no Linux Mint Xfce: local-server (127.0.0.1:64113) +
# PWA (preview estático em 127.0.0.1:4173, com fallback pro dev server do Vite),
# e abre a janela pedida (app completo ou janelinha).
#
# Nunca expõe nada em 0.0.0.0 nem em outra interface além de 127.0.0.1.
#
# Uso:
#   bash scripts/start-kaline-mint.sh                  # sobe tudo e abre o app completo
#   bash scripts/start-kaline-mint.sh --open=janelinha  # sobe tudo e abre a janelinha
#   bash scripts/start-kaline-mint.sh --open=none       # só sobe os serviços, sem abrir janela

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/kaline-common.sh
source "$SCRIPT_DIR/lib/kaline-common.sh"

ROOT_DIR="$(kaline_find_repo_root)" || { kaline_err "Repositório da Kaline não encontrado."; exit 1; }
cd "$ROOT_DIR"
kaline_ensure_dirs

OPEN_TARGET="main"
for arg in "$@"; do
  case "$arg" in
    --open=*) OPEN_TARGET="${arg#--open=}" ;;
  esac
done

LOCAL_SERVER_PID_FILE="$KALINE_RUN_DIR/local-server.pid"
PWA_PID_FILE="$KALINE_RUN_DIR/pwa.pid"

pid_is_running() {
  local pid_file="$1"
  [ -f "$pid_file" ] || return 1
  local pid
  pid="$(cat "$pid_file" 2>/dev/null)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

LOCAL_SERVER_ENV_STAMP="$KALINE_RUN_DIR/local-server.env.stamp"

stop_local_server() {
  local pid
  pid="$(cat "$LOCAL_SERVER_PID_FILE" 2>/dev/null)"
  [ -n "$pid" ] || return 0
  kaline_log "Reiniciando local-server (PID $pid) para aplicar mudanças em local-server/.env ..."
  kill "$pid" 2>/dev/null
  local waited=0
  while kill -0 "$pid" 2>/dev/null && [ "$waited" -lt 5 ]; do
    sleep 1
    waited=$((waited+1))
  done
  if kill -0 "$pid" 2>/dev/null; then
    kaline_warn "local-server (PID $pid) não parou a tempo — forçando com kill -9."
    kill -9 "$pid" 2>/dev/null
  fi
  rm -f "$LOCAL_SERVER_PID_FILE"
}

start_local_server() {
  if pid_is_running "$LOCAL_SERVER_PID_FILE"; then
    if [ -f "local-server/.env" ] && [ -f "$LOCAL_SERVER_ENV_STAMP" ] && [ "local-server/.env" -ot "$LOCAL_SERVER_ENV_STAMP" ]; then
      kaline_ok "local-server já está rodando (PID $(cat "$LOCAL_SERVER_PID_FILE"))."
      return 0
    fi
    stop_local_server
  fi
  if kaline_port_in_use 64113; then
    kaline_warn "Porta 64113 já está em uso por outro processo (não iniciado por este script)."
    return 0
  fi
  [ -f "local-server/.env" ] || cp local-server/.env.example local-server/.env
  kaline_log "Iniciando local-server em http://127.0.0.1:64113 (log: $KALINE_LOG_DIR/local-server.log) ..."
  local run_script="start"
  [ -f "local-server/dist/index.js" ] || run_script="dev"
  (cd local-server && setsid nohup npm run "$run_script" >"$KALINE_LOG_DIR/local-server.log" 2>&1 &
   echo $! > "$LOCAL_SERVER_PID_FILE")
  sleep 2
  touch "$LOCAL_SERVER_ENV_STAMP"
  kaline_ok "local-server iniciado."
}

start_pwa() {
  if pid_is_running "$PWA_PID_FILE"; then
    kaline_ok "PWA já está rodando (PID $(cat "$PWA_PID_FILE"))."
    return 0
  fi
  if kaline_port_in_use 4173; then
    kaline_warn "Porta 4173 já está em uso por outro processo (não iniciado por este script)."
    return 0
  fi
  if [ ! -d "dist" ]; then
    kaline_warn "dist/ não existe ainda — tentando 'bun run build' antes de iniciar a PWA ..."
    if bun run build; then
      kaline_ok "Frontend buildado em dist/."
    else
      kaline_warn "'bun run build' falhou."
    fi
  fi
  if [ -d "dist" ]; then
    kaline_log "Iniciando PWA (bun run preview) em http://127.0.0.1:4173 (log: $KALINE_LOG_DIR/pwa.log) ..."
    (setsid nohup bun run preview --port 4173 --host 127.0.0.1 >"$KALINE_LOG_DIR/pwa.log" 2>&1 &
     echo $! > "$PWA_PID_FILE")
  else
    kaline_warn "dist/ continua ausente após tentativa de build — usando 'bun run dev' como último recurso (NÃO recomendado para testes equivalentes a produção; rotas SSR e variáveis de build podem se comportar diferente)."
    (setsid nohup bun run dev --port 4173 --host 127.0.0.1 >"$KALINE_LOG_DIR/pwa.log" 2>&1 &
     echo $! > "$PWA_PID_FILE")
  fi
  sleep 2
  kaline_ok "PWA iniciada."
}

start_local_server
start_pwa

APP_URL="${KALINE_DESKTOP_APP_URL:-http://127.0.0.1:4173}"
TAURI_BIN="$ROOT_DIR/apps/kaline-desktop/src-tauri/target/release/kaline-desktop"

open_window() {
  local target="$1"
  if [ -x "$TAURI_BIN" ]; then
    if [ "$target" = "janelinha" ]; then
      KALINE_DESKTOP_APP_URL="$APP_URL" nohup "$TAURI_BIN" --janelinha >/dev/null 2>&1 &
    else
      KALINE_DESKTOP_APP_URL="$APP_URL" nohup "$TAURI_BIN" >/dev/null 2>&1 &
    fi
    disown
    kaline_ok "Janela nativa ($target) aberta via companion Tauri."
    return 0
  fi

  kaline_warn "Companion Tauri ainda não foi buildado; abrindo no navegador como alternativa honesta."
  local url="$APP_URL/chat"
  [ "$target" = "janelinha" ] && url="$APP_URL/janelinha"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 &
  else
    kaline_warn "xdg-open não encontrado; abra manualmente: $url"
  fi
}

case "$OPEN_TARGET" in
  main) open_window "main" ;;
  janelinha) open_window "janelinha" ;;
  none) kaline_log "Serviços iniciados; nenhuma janela aberta (--open=none)." ;;
  *) kaline_warn "Valor inválido para --open: $OPEN_TARGET (use main, janelinha ou none)." ;;
esac

kaline_log ""
kaline_log "Kaline Offline disponível em: $APP_URL"
kaline_log "local-server (API): http://127.0.0.1:64113"
