#!/usr/bin/env bash
# Cria atalho .desktop da Kaline Offline para Linux Mint Xfce (sem sudo).
#
# Uso:
#   bash scripts/create-kaline-xfce-shortcuts.sh
#
# Resultado:
#   ~/.local/share/applications/kaline-offline.desktop
#   Opcionalmente copia para ~/Desktop ou ~/Area de Trabalho.
#
# Idempotente: nao falha se o atalho ja existir (sobrescreve).

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APPS_DIR="$HOME/.local/share/applications"
mkdir -p "$APPS_DIR"

DESKTOP_FILE="$APPS_DIR/kaline-offline.desktop"

cat > "$DESKTOP_FILE" <<'EOF'
[Desktop Entry]
Type=Application
Name=Kaline Offline
Comment=Iniciar Kaline Offline local
Exec=bash -lc 'cd ~/Kaline/kalineatelier && bash scripts/start-kaline-mint.sh --open=none'
Terminal=true
Categories=Utility;Development;
EOF

chmod +x "$DESKTOP_FILE"
echo "[OK] Atalho criado: $DESKTOP_FILE"

# Atalho para a Area de Trabalho (opcional)
COPIED=false
for d in "$HOME/Desktop" "$HOME/Área de Trabalho"; do
  if [ -d "$d" ]; then
    cp -f "$DESKTOP_FILE" "$d/"
    chmod +x "$d/kaline-offline.desktop"
    echo "[OK] Atalho copiado para: $d"
    COPIED=true
  fi
done

if [ "$COPIED" = false ]; then
  echo "[INFO] Nenhuma pasta de Area de Trabalho encontrada (~/Desktop ou ~/Area de Trabalho); atalho ficou apenas no menu de aplicativos."
fi

echo "[INFO] Para aparecer no menu do Xfce, atualize com: update-desktop-database ~/.local/share/applications 2>/dev/null || true"
