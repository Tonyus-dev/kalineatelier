#!/usr/bin/env bash
# Diagnostico completo da Kaline Offline no Linux Mint Xfce.
# Nao instala, nao baixa, nao altera nada - apenas reporta.
#
# Uso:
#   bash scripts/check-kaline-offline.sh
#
# Saida:
#   Blocos organizados por subsistema + contadores OK/WARN/FAIL.
#   exit 1 se FAIL > 0; exit 0 se so WARN.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOCAL_SERVER="${KALINE_LOCAL_URL:-http://127.0.0.1:64113}"
OLLAMA_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
KOKORO_DIR="${KOKORO_PYTHON_BASE_DIR:-$HOME/Kaline/motores/kokoro-python}"
CHAT_TIMEOUT_S="${KALINE_CHAT_TIMEOUT_S:-180}"

OK_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

echo "== Kaline Offline - Diagnostico Linux Mint =="
echo ""

echo "--- Sistema ---"
echo "  user: $(whoami)"
echo "  pwd:  $(pwd)"
echo "  uname: $(uname -a)"
if command -v lsb_release >/dev/null 2>&1; then
  echo "  distro: $(lsb_release -a 2>/dev/null | head -5 | tr '\n' ' ')"
else
  echo "  distro: (lsb_release nao disponivel)"
fi
echo ""

echo "--- Dependencias ---"
for cmd in node npm bun python3 curl file sha256sum ollama; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "  [OK]   $cmd encontrado ($(command -v "$cmd"))"
    OK_COUNT=$((OK_COUNT+1))
  else
    echo "  [WARN] $cmd nao encontrado"
    WARN_COUNT=$((WARN_COUNT+1))
  fi
done
echo ""

echo "--- Portas locais ---"
for entry in "4173:/" "64113:/health" "11434:/"; do
  port="${entry%%:*}"
  path="${entry#*:}"
  if curl -sf --max-time 1 "http://127.0.0.1:${port}${path}" >/dev/null 2>&1; then
    echo "  [OK]   porta $port em uso"
    OK_COUNT=$((OK_COUNT+1))
  elif [ "$port" = "11434" ]; then
    echo "  [WARN] porta $port livre - Ollama pode nao estar rodando"
    WARN_COUNT=$((WARN_COUNT+1))
  else
    echo "  [WARN] porta $port livre"
    WARN_COUNT=$((WARN_COUNT+1))
  fi
done
echo ""

echo "--- Ollama ---"
OLLAMA_UP=false
if command -v ollama >/dev/null 2>&1; then
  if curl -sf --max-time 2 "${OLLAMA_URL}/api/tags" >/dev/null 2>&1; then
    echo "  [OK]   Ollama responde em ${OLLAMA_URL}"
    OK_COUNT=$((OK_COUNT+1))
    OLLAMA_UP=true
    OLLAMA_LIST="$(ollama list 2>/dev/null || echo '')"
    if echo "$OLLAMA_LIST" | grep -q "qwen2.5:1.5b"; then
      echo "  [OK]   qwen2.5:1.5b instalado"
      OK_COUNT=$((OK_COUNT+1))
    else
      echo "  [WARN] qwen2.5:1.5b nao encontrado (rode: ollama pull qwen2.5:1.5b)"
      WARN_COUNT=$((WARN_COUNT+1))
    fi
    if echo "$OLLAMA_LIST" | grep -q "llama3.2:1b"; then
      echo "  [OK]   llama3.2:1b instalado"
      OK_COUNT=$((OK_COUNT+1))
    else
      echo "  [WARN] llama3.2:1b nao encontrado (rode: ollama pull llama3.2:1b)"
      WARN_COUNT=$((WARN_COUNT+1))
    fi
  else
    echo "  [WARN] Ollama instalado, mas nao responde em ${OLLAMA_URL}"
    WARN_COUNT=$((WARN_COUNT+1))
  fi
else
  echo "  [WARN] ollama nao encontrado neste sistema"
  WARN_COUNT=$((WARN_COUNT+1))
fi
echo ""
echo "--- Kokoro/Dora ---"
KOKORO_FILES_OK=true
for f in config.json kokoro-v1_0.pth voices/pf_dora.pt; do
  if [ -f "${KOKORO_DIR}/${f}" ]; then
    echo "  [OK]   arquivo existe: ${f}"
    OK_COUNT=$((OK_COUNT+1))
  else
    echo "  [FAIL] arquivo nao encontrado: ${f}"
    FAIL_COUNT=$((FAIL_COUNT+1))
    KOKORO_FILES_OK=false
  fi
done

if [ "${KOKORO_FILES_OK}" = "true" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL_SHA="$(sha256sum "${KOKORO_DIR}/kokoro-v1_0.pth" | awk '{print $1}')"
    EXPECTED_SHA="496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4"
    if [ "$ACTUAL_SHA" = "$EXPECTED_SHA" ]; then
      echo "  [OK]   SHA256 confere ($ACTUAL_SHA)"
      OK_COUNT=$((OK_COUNT+1))
    else
      echo "  [FAIL] SHA256 diverge (esperado=${EXPECTED_SHA}, obtido=${ACTUAL_SHA})"
      FAIL_COUNT=$((FAIL_COUNT+1))
    fi
  else
    echo "  [WARN] sha256sum nao disponivel; pulei validacao de integridade"
    WARN_COUNT=$((WARN_COUNT+1))
  fi
  if [ -x "${KOKORO_DIR}/../kokoro-python-venv/bin/python" ] || [ -f "${KOKORO_DIR}/../kokoro-python-venv/bin/python" ]; then
    echo "  [OK]   python do venv encontrado"
    OK_COUNT=$((OK_COUNT+1))
  else
    echo "  [FAIL] python do venv nao encontrado em ../kokoro-python-venv/bin/python"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
fi
echo ""
echo "--- TTS ---"
if curl -sf --max-time 2 "${LOCAL_SERVER}/tts/status" >/dev/null 2>&1; then
  TTS_BODY="$(curl -s --max-time 3 "${LOCAL_SERVER}/tts/status")"
  echo "  [OK]   ${LOCAL_SERVER}/tts/status responde"
  OK_COUNT=$((OK_COUNT+1))
  echo "  status: ${TTS_BODY}"
  HDR=$(mktemp) WAV=$(mktemp --suffix=.wav)
  CODE=$(curl -sS -D "$HDR" -o "$WAV" -w '%{http_code}' -H 'Content-Type: application/json' -d '{"text":"Ola. Eu sou a Kaline local.","speed":1}' "${LOCAL_SERVER}/tts/speak" || echo 000)
  if [ "$CODE" = "200" ]; then
    CT=$(grep -i content-type "$HDR" | tr -d '\r\n' | awk '{print $2}')
    echo "  [OK]   /tts/speak content-type=${CT}"
    OK_COUNT=$((OK_COUNT+1))
    if file "$WAV" | grep -q 'WAVE audio'; then
      echo "  [OK]   arquivo e WAVE audio"
      OK_COUNT=$((OK_COUNT+1))
    else
      echo "  [FAIL] arquivo nao e WAVE audio"
      FAIL_COUNT=$((FAIL_COUNT+1))
    fi
    SZ=$(stat -c %s "$WAV" 2>/dev/null || echo 0)
    if [ "$SZ" -gt 10240 ]; then
      echo "  [OK]   tamanho do WAV: ${SZ} bytes"
      OK_COUNT=$((OK_COUNT+1))
    else
      echo "  [FAIL] WAV muito pequeno: ${SZ} bytes"
      FAIL_COUNT=$((FAIL_COUNT+1))
    fi
  else
    echo "  [FAIL] /tts/speak HTTP ${CODE}"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
  rm -f "$HDR" "$WAV"
else
  echo "  [WARN] /tts/status nao respondeu"
  WARN_COUNT=$((WARN_COUNT+1))
fi
echo ""
echo "--- local-server ---"
LOCAL_SERVER_UP=false
if curl -sf --max-time 2 "${LOCAL_SERVER}/health" >/dev/null 2>&1; then
  echo "  [OK]   local-server responde em ${LOCAL_SERVER}"
  OK_COUNT=$((OK_COUNT+1))
  LOCAL_SERVER_UP=true
else
  echo "  [WARN] local-server nao responde"
  WARN_COUNT=$((WARN_COUNT+1))
fi
echo ""
echo "--- Frontend ---"
if curl -sf --max-time 2 "http://127.0.0.1:4173/" >/dev/null 2>&1; then
  echo "  [OK]   Frontend/PWA em http://127.0.0.1:4173"
  OK_COUNT=$((OK_COUNT+1))
else
  echo "  [WARN] Frontend ausente (rodar npm run build + preview)"
  WARN_COUNT=$((WARN_COUNT+1))
fi
echo ""
echo "--- /model/status ---"
if curl -sf --max-time 2 "${LOCAL_SERVER}/model/status" >/dev/null 2>&1; then
  BODY="$(curl -s --max-time 3 "${LOCAL_SERVER}/model/status")"
  echo "  [OK]   /model/status responde"
  OK_COUNT=$((OK_COUNT+1))
  echo "  body: ${BODY}"
else
  echo "  [WARN] /model/status nao respondeu"
  WARN_COUNT=$((WARN_COUNT+1))
fi
echo ""
echo "--- /chat ---"
if [ "${LOCAL_SERVER_UP}" = "false" ]; then
  echo "  [WARN] local-server fora do ar; pulando teste real de /chat (evitando espera de ${CHAT_TIMEOUT_S}s)"
  WARN_COUNT=$((WARN_COUNT+1))
elif [ "${OLLAMA_UP}" = "false" ]; then
  echo "  [WARN] Ollama fora do ar; pulando teste real de /chat (evitando espera de ${CHAT_TIMEOUT_S}s)"
  WARN_COUNT=$((WARN_COUNT+1))
else
  CHAT_CODE="$(curl -sS -o /dev/null -w "%{http_code}" --max-time "${CHAT_TIMEOUT_S}" -X POST "${LOCAL_SERVER}/chat" -H "Content-Type: application/json" -d '{"message":"Responda apenas: ok","threadId":"check-offline"}' || echo 000)"
  if [ "$CHAT_CODE" = "200" ]; then
    echo "  [OK]   POST /chat retornou HTTP 200"
    OK_COUNT=$((OK_COUNT+1))
  elif [ "$CHAT_CODE" = "000" ]; then
    echo "  [FAIL] POST /chat timeout/erro de conexao"
    FAIL_COUNT=$((FAIL_COUNT+1))
  else
    echo "  [FAIL] POST /chat retornou HTTP ${CHAT_CODE}"
    FAIL_COUNT=$((FAIL_COUNT+1))
  fi
fi
echo ""
echo "--- Whisper ---"
WHISPER_ROUTE_DETECTED=false
if [ -f "local-server/.env" ]; then
  if grep -q "WHISPER_ENABLED=true" "local-server/.env" 2>/dev/null; then
    if curl -sf --max-time 2 "${LOCAL_SERVER}/transcribe/status" >/dev/null 2>&1; then
      echo "  [OK]   Whisper: /transcribe/status responde"
      OK_COUNT=$((OK_COUNT+1))
      WHISPER_ROUTE_DETECTED=true
    else
      echo "  [INFO] Whisper: WHISPER_ENABLED=true mas sem /transcribe/status respondendo"
      WARN_COUNT=$((WARN_COUNT+1))
      WHISPER_ROUTE_DETECTED=true
    fi
  fi
fi
if [ "${WHISPER_ROUTE_DETECTED}" = "false" ]; then
  echo "  [INFO] Whisper: sem rota de status detectada; use teste manual de /transcribe/file."
fi
echo ""
echo "== Resultado =="
echo "  OK:   ${OK_COUNT}"
echo "  WARN: ${WARN_COUNT}"
echo "  FAIL: ${FAIL_COUNT}"
echo ""
if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
