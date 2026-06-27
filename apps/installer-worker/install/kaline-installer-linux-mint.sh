#!/usr/bin/env bash
# Bootstrap público da Kaline Offline para Linux Mint Xfce.
#
# Este arquivo NÃO é o instalador real — é só um bootstrap pequeno, baixado
# pelo portal público (Cloudflare Worker). Ele apenas localiza ou clona o
# repositório Tonyus-dev/kalineatelier e chama o instalador real em
# scripts/install-kaline-mint.sh. Toda a lógica de instalação (dependências,
# .env, Ollama, Whisper, Kokoro, atalhos, painel) vive lá, não aqui.
#
# Não exige root. Não pede token. Não lê nada fora do que está listado abaixo.
#
# Uso: bash kaline-installer-linux-mint.sh
#      (ou dois cliques em kaline-installer-linux-mint.desktop)

set -uo pipefail

log()  { echo "$*"; }
ok()   { echo "[OK] $*"; }
warn() { echo "[Atenção] $*"; }
err()  { echo "[Erro] $*" >&2; }

REPO="Tonyus-dev/kalineatelier"
CANDIDATES=(
  "$HOME/Kaline/kalineatelier"
  "$HOME/kalineatelier"
  "$HOME/Downloads/kalineatelier"
)

log "== Bootstrap da Kaline Offline (Linux Mint Xfce) =="
log "Este script só localiza/clona o repositório e chama o instalador real."
log ""

# [1/4] Verificar GitHub CLI -------------------------------------------------
log "[1/4] Verificando GitHub CLI (gh) ..."
if command -v gh >/dev/null 2>&1; then
  ok "gh encontrado: $(gh --version | head -n1)"
else
  warn "gh (GitHub CLI) não encontrado."
  log "Instale com: sudo apt install gh"
  log "(ou veja https://github.com/cli/cli#installation para outras distros)"
  log "Depois rode este script de novo."
  exit 1
fi

if gh auth status >/dev/null 2>&1; then
  ok "gh já autenticado."
else
  warn "gh está instalado, mas não autenticado."
  log "Rode em outro terminal: gh auth login"
  log "Nunca cole tokens neste site nem em scripts — use sempre 'gh auth login' interativo."
  read -r -p "Já autenticou e quer continuar agora? [s/N] " resp
  if [[ ! "$resp" =~ ^[sS]$ ]]; then
    log "Saindo. Rode este script de novo após 'gh auth login'."
    exit 1
  fi
fi

# [2/4] Localizar ou clonar o repositório ------------------------------------
log ""
log "[2/4] Localizando o repositório da Kaline Offline ..."
ROOT_DIR=""
for c in "${CANDIDATES[@]}"; do
  if [ -f "$c/package.json" ] && [ -d "$c/scripts" ]; then
    ROOT_DIR="$c"
    break
  fi
done

if [ -n "$ROOT_DIR" ]; then
  ok "Repositório encontrado em $ROOT_DIR"
  read -r -p "Atualizar com 'git pull' agora? [s/N] " resp
  if [[ "$resp" =~ ^[sS]$ ]]; then
    (cd "$ROOT_DIR" && git pull) || warn "git pull falhou — seguindo com a cópia local existente."
  fi
else
  warn "Repositório não encontrado em nenhum dos caminhos conhecidos:"
  for c in "${CANDIDATES[@]}"; do log "  - $c"; done
  read -r -p "Clonar $REPO em ~/Kaline/kalineatelier agora? [s/N] " resp
  if [[ "$resp" =~ ^[sS]$ ]]; then
    mkdir -p "$HOME/Kaline"
    cd "$HOME/Kaline" || exit 1
    if gh repo clone "$REPO"; then
      ROOT_DIR="$HOME/Kaline/kalineatelier"
      ok "Repositório clonado em $ROOT_DIR"
    else
      err "Falha ao clonar $REPO. Verifique sua conexão e se você tem acesso ao repositório (gh auth status)."
      exit 1
    fi
  else
    log "Saindo sem clonar. Baixe o repositório manualmente e rode este script de dentro dele, se preferir."
    exit 1
  fi
fi

# [3/4] Entrar no repositório -------------------------------------------------
log ""
log "[3/4] Entrando no repositório ..."
cd "$ROOT_DIR" || { err "Não foi possível entrar em $ROOT_DIR."; exit 1; }
ok "Em $ROOT_DIR"

# [4/4] Chamar o instalador real ----------------------------------------------
log ""
log "[4/4] Chamando o instalador real (scripts/install-kaline-mint.sh) ..."
if [ ! -f "scripts/install-kaline-mint.sh" ]; then
  err "scripts/install-kaline-mint.sh não encontrado em $ROOT_DIR."
  err "Este bootstrap não duplica a lógica de instalação — sem esse arquivo, não há como continuar."
  exit 1
fi

exec bash scripts/install-kaline-mint.sh
