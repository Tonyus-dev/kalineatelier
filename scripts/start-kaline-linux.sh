#!/usr/bin/env bash
# Inicia a Kaline Offline localmente (Linux/macOS). Não usa sudo, não instala
# pacotes de sistema. Mostra as URLs finais e segue rodando até Ctrl+C.

set -uo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Kaline Offline — inicialização local =="

if ! command -v node >/dev/null 2>&1; then
  echo "[ERRO] Node.js não encontrado. Instale em https://nodejs.org e rode este script novamente."
  exit 1
fi
echo "[OK] Node: $(node --version)"

if ! command -v bun >/dev/null 2>&1; then
  echo "[ERRO] bun não encontrado. Instale em https://bun.sh e rode este script novamente."
  exit 1
fi
echo "[OK] bun: $(bun --version)"

if [ ! -f "local-server/.env" ]; then
  echo "[INFO] local-server/.env não existe. Copiando de local-server/.env.example..."
  cp local-server/.env.example local-server/.env
fi

if [ ! -d "local-server/node_modules" ]; then
  echo "[INFO] Instalando dependências do local-server (npm install)..."
  (cd local-server && npm install)
fi

if [ ! -d "node_modules" ]; then
  echo "[INFO] Instalando dependências do frontend (bun install)..."
  bun install
fi

echo ""
echo "== Iniciando local-server em http://127.0.0.1:4517 (logs em local-server.log) =="
(cd local-server && npm run dev > ../local-server.log 2>&1 &)
LOCAL_SERVER_PID=$!

sleep 2

echo "== Iniciando frontend (Vite) — URL real aparecerá no terminal abaixo =="
echo "== Acesse depois em algo como http://localhost:5173/atelier =="
echo "== Pressione Ctrl+C para encerrar o frontend (local-server continua em background; finalize com: pkill -f 'tsx watch') =="
echo ""

bun run dev
