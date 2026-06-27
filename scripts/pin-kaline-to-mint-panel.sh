#!/usr/bin/env bash
# Tenta fixar o lançador "Kaline Janelinha" no painel do Xfce (Linux Mint), de forma
# segura, aditiva e reversível. Regra de ouro:
#   - NUNCA limpa, reseta ou substitui o painel inteiro.
#   - NUNCA remove plugins existentes do usuário.
#   - SEMPRE faz backup (xfconf-query -lv) antes de qualquer alteração.
#   - Só adiciona um lançador (launcher) novo, apontando pro .desktop já criado por
#     create-kaline-desktop-launchers.sh.
#   - Se não conseguir fazer isso de forma segura e idempotente, desiste e mostra a
#     mensagem de alternativa abaixo, sem tentar nada arriscado.
#
# Uso: bash scripts/pin-kaline-to-mint-panel.sh

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/kaline-common.sh
source "$SCRIPT_DIR/lib/kaline-common.sh"

FALLBACK_MSG() {
  echo ""
  echo "[Atenção] Não foi possível fixar a Kaline Janelinha no painel do Xfce automaticamente."
  echo "Alternativa: clique com o botão direito no painel do Xfce -> Adicionar novo item ->"
  echo "'Lançador' -> e aponte para o atalho 'Kaline Janelinha' em:"
  echo "  $APPS_DIR/dev.tonyus.kaline-janelinha.desktop"
  echo "Ou arraste o atalho do menu de aplicativos até o painel."
}

kaline_ensure_dirs

if ! kaline_is_xfce; then
  kaline_warn "Ambiente Xfce não detectado — fixação automática no painel não se aplica neste ambiente."
  exit 0
fi

if ! command -v xfconf-query >/dev/null 2>&1; then
  kaline_warn "xfconf-query não encontrado — não é possível ler/alterar o painel do Xfce com segurança."
  FALLBACK_MSG
  exit 0
fi

APPS_DIR="$HOME/.local/share/applications"
LAUNCHER_DESKTOP="$APPS_DIR/dev.tonyus.kaline-janelinha.desktop"
if [ ! -f "$LAUNCHER_DESKTOP" ]; then
  kaline_warn "Atalho dev.tonyus.kaline-janelinha.desktop ainda não existe — rode scripts/create-kaline-desktop-launchers.sh primeiro."
  exit 0
fi

if [ -f "$KALINE_HOME/panel-pin-status.txt" ] && grep -q "^ok:" "$KALINE_HOME/panel-pin-status.txt" 2>/dev/null; then
  kaline_ok "Fixação no painel já registrada anteriormente como bem-sucedida (idempotente — nada a fazer)."
  exit 0
fi

# Backup obrigatório de todo o estado do painel ANTES de qualquer leitura/alteração.
BACKUP_FILE="$KALINE_BACKUP_DIR/xfce4-panel-$(date +%Y%m%d-%H%M%S).backup.txt"
if ! xfconf-query -c xfce4-panel -p /panels -lv >"$BACKUP_FILE" 2>/dev/null; then
  kaline_warn "Não foi possível ler a configuração atual do painel (xfconf-query falhou) — abortando com segurança."
  rm -f "$BACKUP_FILE"
  echo "skip: leitura do xfconf falhou em $(date -Iseconds)" >>"$KALINE_HOME/panel-pin-status.txt"
  FALLBACK_MSG
  exit 0
fi
kaline_ok "Backup do estado atual do painel salvo em: $BACKUP_FILE"

# Descobre o painel principal (menor número, geralmente o painel de baixo) e a lista
# atual de plugin-ids dele. Só vamos ANEXAR um novo id no fim dessa lista — nunca
# reescrever os outros ids.
PANEL_IDS="$(xfconf-query -c xfce4-panel -p /panels -v 2>/dev/null | grep -A1 '^/panels/panel-' | grep -v '^/panels/panel-' | head -n1)"
MAIN_PANEL="$(xfconf-query -c xfce4-panel -p /panels 2>/dev/null | grep -o 'panel-[0-9]\+' | sort -u | head -n1)"

if [ -z "$MAIN_PANEL" ]; then
  kaline_warn "Não encontrei um painel Xfce existente para usar como referência — abortando com segurança."
  echo "skip: nenhum painel encontrado em $(date -Iseconds)" >>"$KALINE_HOME/panel-pin-status.txt"
  FALLBACK_MSG
  exit 0
fi

PLUGIN_IDS_PROP="/panels/$MAIN_PANEL/plugin-ids"
EXISTING_IDS="$(xfconf-query -c xfce4-panel -p "$PLUGIN_IDS_PROP" -v 2>/dev/null)"
if [ -z "$EXISTING_IDS" ]; then
  kaline_warn "Não consegui ler a lista de plugins de $PLUGIN_IDS_PROP — abortando com segurança."
  echo "skip: leitura de plugin-ids falhou em $(date -Iseconds)" >>"$KALINE_HOME/panel-pin-status.txt"
  FALLBACK_MSG
  exit 0
fi

# Próximo id de plugin livre (Xfce usa inteiros sequenciais para /plugins/plugin-N).
NEXT_ID=1
while xfconf-query -c xfce4-panel -p "/plugins/plugin-$NEXT_ID" >/dev/null 2>&1; do
  NEXT_ID=$((NEXT_ID + 1))
done

kaline_log "Adicionando lançador da Kaline Janelinha como novo plugin (plugin-$NEXT_ID) no painel $MAIN_PANEL, sem tocar nos plugins existentes ..."

if ! xfconf-query -c xfce4-panel -p "/plugins/plugin-$NEXT_ID" -n -t string -s "launcher" >/dev/null 2>&1; then
  kaline_warn "Não foi possível criar o novo plugin de lançador (permissão ou versão do Xfce) — abortando com segurança."
  echo "skip: criação de plugin-$NEXT_ID falhou em $(date -Iseconds)" >>"$KALINE_HOME/panel-pin-status.txt"
  FALLBACK_MSG
  exit 0
fi

PLUGIN_DIR="$HOME/.config/xfce4/panel/launcher-$NEXT_ID"
mkdir -p "$PLUGIN_DIR"
cp -f "$LAUNCHER_DESKTOP" "$PLUGIN_DIR/" 2>/dev/null

xfconf-query -c xfce4-panel -p "/plugins/plugin-$NEXT_ID/items" -n -t string -s "dev.tonyus.kaline-janelinha.desktop" -a >/dev/null 2>&1 || true

NEW_IDS="$EXISTING_IDS
$NEXT_ID"
if xfconf-query -c xfce4-panel -p "$PLUGIN_IDS_PROP" -n -t int -s "$NEXT_ID" -a >/dev/null 2>&1; then
  kaline_ok "Plugin-$NEXT_ID anexado à lista de plugins do painel $MAIN_PANEL (ids antigos preservados)."
else
  kaline_warn "Não foi possível anexar o novo plugin à lista do painel — o painel pode não mostrar o ícone ainda."
  echo "partial: anexação de plugin-ids falhou em $(date -Iseconds)" >>"$KALINE_HOME/panel-pin-status.txt"
  FALLBACK_MSG
  exit 0
fi

if command -v xfce4-panel >/dev/null 2>&1; then
  kaline_log "Reiniciando o painel do Xfce para aplicar a mudança (xfce4-panel -r) ..."
  xfce4-panel -r >/dev/null 2>&1 || true
fi

echo "ok: plugin-$NEXT_ID adicionado ao $MAIN_PANEL em $(date -Iseconds) (backup: $BACKUP_FILE)" >>"$KALINE_HOME/panel-pin-status.txt"
kaline_ok "Tentativa de fixação no painel concluída. Se o ícone não aparecer, use o painel para reordenar/visualizar (nada foi removido)."
