#!/usr/bin/env bash
# Funções compartilhadas pelos scripts scripts/*-kaline-mint*.sh.
# Sem sudo aqui (cada script decide se precisa, explicitamente). Sem rede além do
# que cada script já documenta. Source este arquivo, não execute direto.

KALINE_HOME="${KALINE_HOME:-$HOME/.kaline}"
KALINE_RUN_DIR="$KALINE_HOME/run"
KALINE_BACKUP_DIR="$KALINE_HOME/backups"
KALINE_LOG_DIR="$KALINE_HOME/logs"

kaline_log()  { echo "$*"; }
kaline_ok()   { echo "[OK] $*"; }
kaline_warn() { echo "[Atenção] $*"; }
kaline_err()  { echo "[Erro] $*" >&2; }

# Localiza a raiz do repositório kalineatelier.
# Ordem: diretório atual (e pais) -> candidatos conhecidos -> falha com orientação.
kaline_find_repo_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/package.json" ] && [ -d "$dir/local-server" ] && [ -d "$dir/apps/kaline-desktop" ]; then
      echo "$dir"
      return 0
    fi
    dir="$(dirname "$dir")"
  done

  local candidates=(
    "$HOME/Kaline/kalineatelier"
    "$HOME/kalineatelier"
    "$HOME/Projetos/kalineatelier"
    "$HOME/Downloads/kalineatelier"
  )
  for c in "${candidates[@]}"; do
    if [ -f "$c/package.json" ] && [ -d "$c/local-server" ]; then
      echo "$c"
      return 0
    fi
  done

  return 1
}

# Procura o ícone da maçã/Kaline já existente no repo. Nunca inventa caminho —
# só devolve algo que realmente existe no disco.
kaline_find_icon() {
  local root="$1"
  local dirs=("$root/public" "$root/src/assets" "$root/assets" "$root/docs")
  local terms=("apple" "maca" "maçã" "kaline" "logo" "icon" "wordmark")
  local exts=("png" "webp" "svg" "ico")

  # Preferência forte: a maçã (ka-apple.png), já usada no manifest/Tauri.
  if [ -f "$root/public/ka-apple.png" ]; then
    echo "$root/public/ka-apple.png"
    return 0
  fi

  for d in "${dirs[@]}"; do
    [ -d "$d" ] || continue
    for term in "${terms[@]}"; do
      for ext in "${exts[@]}"; do
        local match
        match="$(find "$d" -maxdepth 2 -iname "*${term}*.${ext}" 2>/dev/null | head -n1)"
        if [ -n "$match" ]; then
          echo "$match"
          return 0
        fi
      done
    done
  done

  return 1
}

kaline_ensure_dirs() {
  mkdir -p "$KALINE_RUN_DIR" "$KALINE_BACKUP_DIR" "$KALINE_LOG_DIR"
}

# Backup com timestamp antes de qualquer alteração em arquivo existente.
kaline_backup_file() {
  local file="$1"
  [ -f "$file" ] || return 0
  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  cp "$file" "${file}.backup-${stamp}"
  echo "${file}.backup-${stamp}"
}

kaline_desktop_dir() {
  if [ -d "$HOME/Área de Trabalho" ]; then
    echo "$HOME/Área de Trabalho"
  elif [ -d "$HOME/Desktop" ]; then
    echo "$HOME/Desktop"
  else
    return 1
  fi
}

kaline_is_xfce() {
  local cur="${XDG_CURRENT_DESKTOP:-}${DESKTOP_SESSION:-}"
  if echo "$cur" | grep -qi "xfce"; then
    return 0
  fi
  if command -v pgrep >/dev/null 2>&1 && pgrep -x xfce4-panel >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

kaline_port_in_use() {
  local port="$1"
  if command -v curl >/dev/null 2>&1; then
    curl -s -o /dev/null --max-time 1 "http://127.0.0.1:${port}/" && return 0
  fi
  (exec 3<>"/dev/tcp/127.0.0.1/${port}") 2>/dev/null && { exec 3>&-; return 0; }
  return 1
}
