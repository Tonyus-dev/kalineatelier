#!/usr/bin/env bash
# Reinicia a Kaline Offline no Linux Mint Xfce: para e depois inicia novamente.
#
# Uso:
#   bash scripts/restart-kaline-mint.sh
#
# Argumentos apos o -- sao repassados para start-kaline-mint.sh.
# Ex:
#   bash scripts/restart-kaline-mint.sh --open=none

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[INFO] Parando servicos atuais (se existirem) ..."
bash scripts/stop-kaline-mint.sh || true

echo "[INFO] Aguardando 2s para liberacao de portas ..."
sleep 2

echo "[INFO] Iniciando servicos ..."
exec bash scripts/start-kaline-mint.sh "$@"
