#!/usr/bin/env bash
# Para os processos da Kaline Offline iniciados por start-kaline-mint.sh, usando os
# PIDs salvos em ~/.kaline/run/. Nunca mata processos genéricos de node/bun do
# usuário que não tenham sido iniciados por este script.
#
# Uso: bash scripts/stop-kaline-mint.sh

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/kaline-common.sh
source "$SCRIPT_DIR/lib/kaline-common.sh"

kaline_ensure_dirs

stop_by_pidfile() {
  local label="$1" pid_file="$2"
  if [ ! -f "$pid_file" ]; then
    kaline_log "$label: nenhum PID salvo (provavelmente não estava rodando por este script)."
    return 0
  fi
  local pid
  pid="$(cat "$pid_file" 2>/dev/null)"
  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    kaline_log "$label: processo salvo (PID $pid) já não existe."
    rm -f "$pid_file"
    return 0
  fi
  # PID foi iniciado com setsid: o grupo de processos tem o mesmo id do PID líder.
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  fi
  rm -f "$pid_file"
  kaline_ok "$label parado (PID $pid)."
}

stop_by_pidfile "local-server" "$KALINE_RUN_DIR/local-server.pid"
stop_by_pidfile "PWA"          "$KALINE_RUN_DIR/pwa.pid"

kaline_log "Pronto. Janelas nativas (Tauri) abertas separadamente não são encerradas por este script — feche-as normalmente."
