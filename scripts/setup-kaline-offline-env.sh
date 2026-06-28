#!/usr/bin/env bash
# Normaliza os arquivos .env do repo e de local-server para o modo offline no
# Linux Mint Xfce, sem duplicar variáveis e sem apagar .env existente.
#
# Uso:
#   bash scripts/setup-kaline-offline-env.sh
#
# Comportamento:
#   1. local-server/.envExample -> local-server/.env (se não existir)
#   2. .env.example -> .env (se não existir)
#   3. Garante variáveis offline em ambos os arquivos, substituindo se necessário
#
# Não exige sudo. Não instala pacotes. Não apaga dados. Idempotente.

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# rastreia arquivos alterados para o resumo final
MODIFIED=()

# ----------
# Funções utilitárias
# ----------

# Adiciona ou substitui uma chave=valor em um arquivo .env.
# Preserva comentários e outras linhas. Lida com valores contendo /, : e .
# Uso: set_env_var FILE KEY VALUE
set_env_var() {
  local file="$1" key="$2"
  shift 2
  # Concatena todos os argumentos restantes como valor (preserva espaços em branco).
  local value="$*"
  local anchor="^${key}="

  if [ ! -f "$file" ]; then
    printf '%s=%s\n' "$key" "$value" > "$file"
    MODIFIED+=("$file")
    printf '[OK]    criado %s (chave adicionada: %s)\n' "$file" "$key"
    return 0
  fi

  if grep -q "$anchor" "$file"; then
    local tmp
    tmp="$(mktemp)"
    sed "s|${anchor}.*|${key}=${value}|" "$file" > "$tmp"
    cp "$tmp" "$file"
    rm -f "$tmp"
    if grep -q "${key}=${value}" "$file"; then
      printf '[OK]    atualizado %s -> %s=%s\n' "$file" "$key" "$value"
    else
      printf '[WARN]  linha não sobrescreveu bem em %s -> chave %s (verifique manualmente)\n' "$file" "$key"
    fi
    MODIFIED+=("$file")
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
    MODIFIED+=("$file")
    printf '[OK]    atualizado %s (chave adicionada: %s=%s)\n' "$file" "$key" "$value"
  fi
}

ensure_from_example() {
  local src="$1" dst="$2"
  if [ ! -f "$dst" ] && [ -f "$src" ]; then
    cp "$src" "$dst"
    MODIFIED+=("$dst")
    printf '[OK]    criado %s a partir de %s\n' "$dst" "$src"
  elif [ -f "$dst" ]; then
    printf '[INFO]   %s já existe; não sobrescrevo.\n' "$dst"
  else
    printf '[WARN]   template %s não encontrado; não posso criar %s.\n' "$src" "$dst"
  fi
}

# ----------
# local-server/.env
# ----------

printf '[INFO]   Configurando local-server/.env ...\n'
ensure_from_example "local-server/.env.example" "local-server/.env"

set_env_var "local-server/.env" "KALINE_MODEL_PROVIDER" "ollama"
set_env_var "local-server/.env" "KALINE_MODEL_PRIMARY" "qwen2.5:1.5b"
set_env_var "local-server/.env" "KALINE_MODEL_FALLBACK" "llama3.2:1b"
set_env_var "local-server/.env" "KALINE_MODEL_TIMEOUT_MS" "180000"
set_env_var "local-server/.env" "TTS_PROVIDER" "kokoro-python"
set_env_var "local-server/.env" "KOKORO_PYTHON_ENABLED" "true"
set_env_var "local-server/.env" "KOKORO_PYTHON_BIN" "/home/tonyus/Kaline/motores/kokoro-python-venv/bin/python"
set_env_var "local-server/.env" "KOKORO_PYTHON_BASE_DIR" "/home/tonyus/Kaline/motores/kokoro-python"
set_env_var "local-server/.env" "KOKORO_PYTHON_TIMEOUT_MS" "120000"
set_env_var "local-server/.env" "KALINE_CORS_ALLOWED_ORIGINS" "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"

# ----------
# .env raiz (frontend)
# ----------

printf ''
printf '[INFO]   Configurando .env raiz (frontend/Vite) ...\n'
ensure_from_example ".env.example" ".env"

set_env_var ".env" "VITE_KALINE_RUNTIME_MODE" "offline"
set_env_var ".env" "VITE_KALINE_LOCAL_SERVER_URL" "http://127.0.0.1:64113"

# ----------
# Resumo
# ----------

printf ''
printf '== Setup concluído ==\n'
printf 'Arquivos modificados ou criados:\n'
if [ "${#MODIFIED[@]}" -gt 0 ]; then
  for f in "${MODIFIED[@]}"; do
    printf '  - %s\n' "$f"
  done
else
  printf '  (nenhum arquivo precisou ser alterado; tudo já estava consistente)\n'
fi
printf 'Variáveis verificadas em local-server/.env:\n'
printf '  KALINE_PROVIDER=ollama\n'
printf '  KALINE_MODEL_PRIMARY=qwen2.5:1.5b\n'
printf '  KALINE_MODEL_FALLBACK=llama3.2:1b\n'
printf '  TTS_PROVIDER=kokoro-python\n'
printf '  KOKORO_PYTHON_ENABLED=true\n'
printf '  KOKORO_BIN=.../kokoro-python-venv/bin/python\n'
printf '  KOKORO_PYTHON_BASE_DIR=.../kokoro-python\n'
printf '  KALINE_CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173\n'
printf 'Variáveis verificadas em .env raiz:\n'
printf '  VITE_KALINE_RUNTIME_MODE=offline\n'
printf '  VITE_KALINE_LOCAL_SERVER_URL=http://127.0.0.1:64113\n'
printf ''

exit 0
