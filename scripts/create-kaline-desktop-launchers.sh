#!/usr/bin/env bash
# Cria os atalhos .desktop da Kaline Offline em ~/.local/share/applications/ e,
# se existir uma pasta de Área de Trabalho, copia os atalhos pra lá também.
#
# Não exige sudo (atalhos são só do usuário atual). Não remove atalhos de
# terceiros: só cria/atualiza os 5 atalhos com prefixo "dev.tonyus.kaline-".
#
# Uso: bash scripts/create-kaline-desktop-launchers.sh

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/kaline-common.sh
source "$SCRIPT_DIR/lib/kaline-common.sh"

ROOT_DIR="${KALINE_REPO_ROOT:-}"
if [ -z "$ROOT_DIR" ]; then
  ROOT_DIR="$(kaline_find_repo_root)" || {
    kaline_err "Não encontrei o repositório da Kaline Offline. Rode este script de dentro do repo."
    exit 1
  }
fi

APPS_DIR="$HOME/.local/share/applications"
mkdir -p "$APPS_DIR"

ICON_PATH="$(kaline_find_icon "$ROOT_DIR")" || true
if [ -z "$ICON_PATH" ]; then
  kaline_warn "Ícone da maçã não encontrado; usando ícone fallback (utilities-terminal)."
  ICON_PATH="utilities-terminal"
fi

write_desktop_entry() {
  local id="$1" name="$2" comment="$3" exec_line="$4" terminal="$5"
  local path="$APPS_DIR/${id}.desktop"
  cat > "$path" <<EOF
[Desktop Entry]
Type=Application
Name=${name}
Comment=${comment}
Exec=${exec_line}
Icon=${ICON_PATH}
Terminal=${terminal}
Categories=Utility;
StartupWMClass=kaline-desktop
EOF
  chmod +x "$path"
  echo "$path"
}

kaline_log "Criando atalhos em $APPS_DIR ..."

p1="$(write_desktop_entry "dev.tonyus.kaline-offline" "Kaline Offline" \
  "Abre a Kaline Offline completa." \
  "bash -lc '\"$ROOT_DIR/scripts/start-kaline-mint.sh\" --open=main'" "false")"

p2="$(write_desktop_entry "dev.tonyus.kaline-janelinha" "Kaline Janelinha" \
  "Abre a janelinha flutuante para falar com a Kaline e gravar reuniões." \
  "bash -lc '\"$ROOT_DIR/scripts/start-kaline-mint.sh\" --open=janelinha'" "false")"

p3="$(write_desktop_entry "dev.tonyus.kaline-instalar" "Instalar/Atualizar Kaline" \
  "Instala ou atualiza a Kaline Offline neste computador." \
  "bash -lc 'cd \"$ROOT_DIR\" && bash scripts/install-kaline-mint.sh; echo; read -p \"Pressione Enter para fechar...\"'" "true")"

p4="$(write_desktop_entry "dev.tonyus.kaline-verificar" "Verificar Kaline" \
  "Roda o diagnóstico da Kaline Offline." \
  "bash -lc 'cd \"$ROOT_DIR\" && bash scripts/check-kaline-mint.sh; echo; read -p \"Pressione Enter para fechar...\"'" "true")"

p5="$(write_desktop_entry "dev.tonyus.kaline-parar" "Parar Kaline" \
  "Para os processos locais da Kaline Offline." \
  "bash -lc 'cd \"$ROOT_DIR\" && bash scripts/stop-kaline-mint.sh; echo; read -p \"Pressione Enter para fechar...\"'" "true")"

for p in "$p1" "$p2" "$p3" "$p4" "$p5"; do
  kaline_ok "Atalho criado: $p"
done

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPS_DIR" >/dev/null 2>&1 || true
fi

DESKTOP_DIR="$(kaline_desktop_dir)" || true
if [ -n "${DESKTOP_DIR:-}" ]; then
  kaline_log "Copiando atalhos para a Área de Trabalho ($DESKTOP_DIR) ..."
  for p in "$p1" "$p2" "$p3" "$p4" "$p5"; do
    cp -f "$p" "$DESKTOP_DIR/" 2>/dev/null && chmod +x "$DESKTOP_DIR/$(basename "$p")" || true
  done
  kaline_ok "Atalhos copiados para a Área de Trabalho."
else
  kaline_warn "Nenhuma pasta de Área de Trabalho encontrada (~/Área de Trabalho ou ~/Desktop); atalhos ficaram só no menu de aplicativos."
fi
