#!/usr/bin/env bash
#
# check-kaline-tts.sh — Valida TTS Dora PT-BR offline via kokoro-python.
#
# Uso:
#   bash scripts/check-kaline-tts.sh
#
# Critérios:
#   1. Arquivos locais existem (config.json, kokoro-v1_0.pth, voices/pf_dora.pt)
#   2. SHA256 de kokoro-v1_0.pth confere
#   3. /tts/status retorna status honesto
#   4. /tts/speak retorna WAV real (200, audio/wav, >10KB)
#

set -euo pipefail

BASE_DIR="${KOKORO_PYTHON_BASE_DIR:-$HOME/Kaline/motores/kokoro-python}"
EXPECTED_SHA256="496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4"
LOCAL_SERVER="${KALINE_LOCAL_URL:-http://127.0.0.1:64113}"

PASS=0
FAIL=0

ok() { echo "[OK]  $1"; PASS=$((PASS + 1)); }
bad() { echo "[FAIL] $1"; FAIL=$((FAIL + 1)); }

echo "== Check TTS Dora PT-BR offline (kokoro-python) =="
echo

# 1. Arquivos locais
echo "--- 1. Arquivos locais em ${BASE_DIR} ---"
MISSING=0
for f in config.json kokoro-v1_0.pth voices/pf_dora.pt; do
  if [[ -f "${BASE_DIR}/${f}" ]]; then
    ok "Arquivo existe: ${f}"
  else
    bad "Arquivo não encontrado: ${f}"
    MISSING=1
  fi
done

# 2. SHA256
echo
echo "--- 2. SHA256 de kokoro-v1_0.pth ---"
if [[ "${MISSING}" -eq 0 ]]; then
  ACTUAL=$(sha256sum "${BASE_DIR}/kokoro-v1_0.pth" | awk '{print $1}')
  if [[ "${ACTUAL}" == "${EXPECTED_SHA256}" ]]; then
    ok "SHA256 confere: ${ACTUAL}"
  else
    bad "SHA256 não confere (esperado=${EXPECTED_SHA256}, obtido=${ACTUAL})"
  fi
else
  bad "SHA256 ignorado (faltam arquivos)"
fi

# 3. /tts/status
echo
echo "--- 3. GET /tts/status ---"
HTTP_STATUS=$(curl -sS -o /tmp/kaline-tts-status.json -w "%{http_code}" "${LOCAL_SERVER}/tts/status" || echo "000")
if [[ "${HTTP_STATUS}" == "200" ]]; then
  BODY=$(cat /tmp/kaline-tts-status.json)
  echo "  status: ${BODY}"
  if echo "${BODY}" | grep -q '"ok":[[:space:]]*true'; then
    ok "/tts/status retornou ok=true"
  else
    bad "/tts/status não retornou ok=true"
  fi
else
  bad "/tts/status HTTP ${HTTP_STATUS}"
fi

# 4. /tts/speak
echo
echo "--- 4. POST /tts/speak ---"
HEADERS_FILE=$(mktemp)
WAV_FILE=$(mktemp --suffix=.wav)
HTTP_STATUS=$(curl -sS -D "${HEADERS_FILE}" \
  -o "${WAV_FILE}" \
  -w "%{http_code}" \
  -H "Content-Type: application/json" \
  -d '{"text":"Olá. Eu sou a Kaline local.","speed":1}' \
  "${LOCAL_SERVER}/tts/speak" || echo "000")

if [[ "${HTTP_STATUS}" == "200" ]]; then
  CT=$(grep -i "content-type" "${HEADERS_FILE}" | tr -d '\r' | awk '{print $2}')
  if [[ "${CT}" == *"audio/wav"* ]]; then
    ok "/tts/speak retornou content-type=audio/wav"
  else
    bad "/tts/speak content-type inesperado: ${CT}"
  fi

  if file "${WAV_FILE}" | grep -q "WAVE audio"; then
    ok "Arquivo é WAVE audio"
  else
    bad "Arquivo não é WAVE audio"
  fi

  SIZE=$(stat -c %s "${WAV_FILE}" 2>/dev/null || echo 0)
  if [[ "${SIZE}" -gt 10240 ]]; then
    ok "Tamanho do WAV: ${SIZE} bytes"
  else
    bad "WAV muito pequeno: ${SIZE} bytes (esperado >10KB)"
  fi
else
  echo "  HTTP ${HTTP_STATUS}"
  if [[ -f "${WAV_FILE}" ]]; then
    echo "  body: $(head -c 500 "${WAV_FILE}")"
  fi
  bad "/tts/speak falhou"
fi

rm -f "${HEADERS_FILE}" "${WAV_FILE}" /tmp/kaline-tts-status.json

echo
echo "== Resultado: ${PASS} OK, ${FAIL} FAIL =="
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
exit 0
