#!/usr/bin/env bash
# Para os processos da Kaline Offline no Linux Mint Xfce.
#
# Encerra local-server e PWA (pelos PIDs salvos em ~/.kaline/run/).
# Por padrão, NUNCA mata Ollama — use a flag --with-ollama para isso.
#
# Uso:
#   bash scripts/stop-kaline-mint.sh [--with-ollama]
#
# Nunca mata processos genéricos de node/bun do usuário que não tenham sido
# iniciados por start-kaline-mint.sh. Não apaga .env, não apaga SQLite.

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/kaline-common.sh
source "$SCRIPT_DIR/lib/kaline-common.sh"

kaline_ensure_dirs

WITH_OLLAMA=false
for arg in "$@"; do
  case "$arg" in
    --with-ollama) WITH_OLLAMA=true ;;
    -h|--help)
      echo "Uso: bash scripts/stop-kaline-mint.sh [--with-ollama]"
      echo ""
      echo "Para local-server e PWA da Kaline Offline."
      echo "Ollama so e parado com --with-ollama."
      exit 0
      ;;
    *)
      echo "[WARN] Argumento desconhecido: $arg (ignorado)"
      ;;
  esac
done

stop_by_pidfile() {
  local label="$1" pid_file="$2"
  if [ ! -f "$pid_file" ]; then
    echo "[INFO]  $label: nenhum PID salvo (provavelmente nao estava rodando por este script)."
    return 0
  fi
  local pid
  pid="$(cat "$pid_file" 2>/dev/null)"
  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    echo "[INFO]  $label: processo salvo (PID $pid) ja nao existe."
    rm -f "$pid_file"
    return 0
  fi
  # PID iniciado com setsid: o grupo de processos tem o mesmo id do PID lider.
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    echo "[WARN]  $label (PID $pid) nao parou com SIGTERM; forcando SIGKILL."
    kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  fi
  rm -f "$pid_file"
  echo "[OK]    $label parado (PID $pid)."
}

stop_by_pidfile "local-server" "$KALINE_RUN_DIR/local-server.pid"
stop_by_pidfile "PWA"          "$KALINE_RUN_DIR/pwa.pid"

if [ "$WITH_OLLAMA" = true ]; then
  echo "[INFO]  --with-ollama detectado: tentando parar ollama ..."
  if command -v ollama >/dev/null 2>&1; then
    if curl -sf --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
      systemctl --user stop ollama 2>/dev/null || ollama serve --quit 2>/dev/null || true
    fi
  fi
  echo "[OK]    Ollama: parado (ou ja estava parado)."
else
  echo "[INFO]  Ollama nao sera parado (para parar, use --with-ollama)."
fi

echo "[OK]    Pronto. Janelas nativas (Tauri) abertas separadamente nao sao encerradas por este script — feche-as normalmente."
