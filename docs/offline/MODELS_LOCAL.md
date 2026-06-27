# Modelos de IA — Kaline Offline v0.2

A Kaline Offline roda com **provider mock por padrão**: nenhuma IA real é consultada,
nenhum token é gasto, nenhuma rede externa é usada. Isso é intencional para que qualquer
pessoa consiga baixar e testar sem custo e sem configuração.

## Pilha oficial local

```txt
Llama 3.2 1B  = modelo principal textual da Kaline (geral, roteador, resumo, raciocínio)
Qwen 2.5 1.5B = fallback textual
Qwen 3.5 2B   = visão/foto principal
Qwen 3.5 0.8B = fallback de visão/foto
Whisper small = escuta/transcrição local
Kokoro 82M    = voz local/TTS
SQLite        = memória local
```

Tudo roda na máquina da pessoa — nada é enviado para fora.

Veja o status real em `GET http://127.0.0.1:64113/model/status`,
`GET http://127.0.0.1:64113/transcribe/status` e
`GET http://127.0.0.1:64113/tts/status`, ou na área de Configurações do Atelier
(cards "IA local — Ollama" e "Whisper — transcrição local").

## Opções de provider (`KALINE_MODEL_PROVIDER`)

### `mock` — padrão

```env
KALINE_MODEL_PROVIDER=mock
```

Sem IA real. As respostas do Chat Kaline são estruturais, indicando claramente que nenhum
modelo foi consultado. Use para testar a navegação, o banco local e a interface. O `mock`
funciona mesmo sem Ollama, Whisper ou Kokoro instalados — inclusive em CI.

### `ollama` — motor local real

```env
OLLAMA_ENABLED=true
KALINE_MODEL_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434

OLLAMA_MODEL_GENERAL=llama3.2:1b
OLLAMA_MODEL_ROUTER=llama3.2:1b
OLLAMA_MODEL_SUMMARY=llama3.2:1b
OLLAMA_MODEL_REASONING=llama3.2:1b

OLLAMA_MODEL_TEXT_FALLBACK=qwen2.5:1.5b

OLLAMA_MODEL_VISION=qwen3.5:2b
OLLAMA_MODEL_VISION_FALLBACK=qwen3.5:0.8b

OLLAMA_REQUEST_TIMEOUT_MS=120000
```

`llama3.2:1b` é o modelo principal textual (geral, roteador, resumo e raciocínio leve).
`qwen2.5:1.5b` é o fallback textual, usado se o modelo principal falhar ou estiver
indisponível. `qwen3.5:2b` é o modelo de visão principal, com `qwen3.5:0.8b` como
fallback de visão. Todos são modelos leves, pensados para rodar bem em máquinas
modestas — você pode trocar por modelos maiores no `.env` se a máquina permitir.

#### 1. Instalar o Ollama

Baixe em [ollama.com](https://ollama.com) e instale normalmente para o seu sistema.

#### 2. Baixar os modelos

```bash
ollama pull llama3.2:1b
ollama pull qwen2.5:1.5b
ollama pull qwen3.5:2b
ollama pull qwen3.5:0.8b
```

#### 3. Testar o modelo direto no Ollama

```bash
ollama run llama3.2:1b
```

Prompt de teste:

```txt
Responda em português: organize minha manhã em três tarefas simples.
```

#### 4. Rodar o local-server

Com o Ollama ativo (`ollama serve`, geralmente automático após a instalação) em
`127.0.0.1:11434`, inicie o `local-server` normalmente. `GET /model/status` deve reportar
`"status": "available"`. Se o Ollama estiver fora do ar, reporta `"unreachable"`; se o
modelo principal não estiver instalado, reporta `"missing_model"`; se `OLLAMA_ENABLED=false`,
reporta `"disabled"`.

### `openrouter` — opcional, consome créditos

```env
KALINE_MODEL_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL_GENERAL=
OPENROUTER_MODEL_CODER=
OPENROUTER_MODEL_SUMMARY=
```

Crie uma conta e uma chave em [openrouter.ai](https://openrouter.ai). **Isso consome
créditos da sua conta** a cada chamada. A chave nunca deve ser commitada — ela vive apenas
em `local-server/.env`, que está no `.gitignore`. Continua documentado como possibilidade
futura/opcional — não é necessário para o fluxo principal da Kaline Offline.

## A Kaline Offline não baixa modelos automaticamente

Em nenhum momento o app dispara `ollama pull` ou qualquer download de modelo por conta
própria. A pessoa decide o que baixar e quando, fora do app.

## Fallback para mock (`KALINE_MODEL_FALLBACK_TO_MOCK`)

```env
KALINE_MODEL_FALLBACK_TO_MOCK=false
```

- `false` (padrão): se `KALINE_MODEL_PROVIDER=ollama` e o Ollama falhar (offline, modelo
  ausente, erro de rede), o Chat Kaline retorna erro claro — nunca finge sucesso.
- `true`: se o Ollama falhar, a resposta cai para o mock, mas o metadado da mensagem
  identifica isso explicitamente (`{"provider": "mock", "fallback": true, "warning": "..."}`).
  Nunca é uma mentira silenciosa.

## Visão local (`POST /model/vision`) — experimental

```env
VISION_ENABLED=true
VISION_EXPERIMENTAL=true
```

Canal MVP de imagem via Ollama. Aceita `imageBase64` (puro ou data URL) e `prompt`,
usa `OLLAMA_MODEL_VISION` (com `OLLAMA_MODEL_VISION_FALLBACK` como fallback declarado),
não salva a imagem em disco. Disponível apenas quando `KALINE_MODEL_PROVIDER=ollama`.

A visão local é **experimental** e não deve ser usada como conclusão final em documentos
sensíveis. `GET /model/status` reporta isso explicitamente no bloco `vision`.

## Domínios críticos exigem fonte confiável

```env
CRITICAL_DOMAIN_REQUIRES_SOURCE=true
```

Modelos locais pequenos (1B–2B) não devem responder, de forma conclusiva, perguntas de
domínios críticos — direito, saúde, medicamentos, finanças, documentos sensíveis e
imagens sensíveis — sem uma fonte ou ferramenta confiável de apoio. Quando não há base
suficiente, a resposta honesta esperada é:

```txt
Este tema exige fonte verificável. Não encontrei base suficiente para responder com segurança.
```

## Transcrição de áudio — Whisper small (whisper.cpp)

```env
WHISPER_ENABLED=true
WHISPER_ENGINE=whisper.cpp
WHISPER_MODEL=small
KALINE_TRANSCRIBE_PROVIDER=whisper_cpp
WHISPER_CPP_BIN=/caminho/para/whisper.cpp/build/bin/whisper-cli
WHISPER_MODEL_PATH=/caminho/para/whisper.cpp/models/ggml-small.bin
WHISPER_LANGUAGE=pt
WHISPER_REQUEST_TIMEOUT_MS=180000
```

#### 1. Compilar/instalar o whisper.cpp

```bash
cd ~/Kaline/motores
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
cmake -B build
cmake --build build --config Release
```

#### 2. Baixar o modelo Small

```bash
bash ./models/download-ggml-model.sh small
ls -lh models/ggml-small.bin
```

#### 3. Testar com o áudio de exemplo

```bash
./build/bin/whisper-cli -m models/ggml-small.bin -f samples/jfk.wav
```

#### 4. Testar com áudio em português

```bash
ffmpeg -f pulse -i default -t 10 -ar 16000 -ac 1 -c:a pcm_s16le teste-kaline.wav
./build/bin/whisper-cli -m models/ggml-small.bin -f teste-kaline.wav -l pt -nt
```

#### 5. Apontar o local-server para o binário e o modelo

Preencha `WHISPER_CPP_BIN` e `WHISPER_MODEL_PATH` em `local-server/.env` com os caminhos
absolutos do seu sistema. `GET /transcribe/status` deve reportar `"status": "available"`.
Se `WHISPER_ENABLED=false`, reporta `"disabled"`; se o binário ou o modelo não forem
encontrados, reporta `"misconfigured"`.

`POST /transcribe/file` aceita upload `multipart/form-data` (campo `file`), salva o áudio
em um arquivo temporário dentro de `local-server/data/tmp`, chama `whisper-cli` via
`execFile` (argumentos em array, nunca shell) e remove o arquivo temporário ao final —
sem manter áudio permanentemente.

## Voz local — Kokoro 82M (TTS)

```env
TTS_PROVIDER=kokoro
KOKORO_ENABLED=true
KOKORO_ENGINE=onnx
KOKORO_MODEL=kokoro-82m
KOKORO_MODEL_PATH=/caminho/para/kokoro/kokoro-v1.0.int8.onnx
KOKORO_VOICES_PATH=/caminho/para/kokoro/voices-v1.0.bin
KOKORO_DEFAULT_VOICE=pf_dora
KOKORO_DEFAULT_LANG=pt-br
KOKORO_DEFAULT_SPEED=1.0
```

Esta fase declara as variáveis e o status de configuração do Kokoro
(`GET /tts/status`); a síntese de voz em si ainda não é chamada por nenhuma rota.
Se `KOKORO_ENABLED=false`, o status é `"disabled"`; se `KOKORO_MODEL_PATH` ou
`KOKORO_VOICES_PATH` não existirem no disco, o status é `"misconfigured"`.

## Outras variáveis relevantes

```env
KALINE_MODEL_TIMEOUT_MS=60000
KALINE_MODEL_MAX_INPUT_CHARS=24000
OLLAMA_REQUEST_TIMEOUT_MS=120000
WHISPER_REQUEST_TIMEOUT_MS=180000
```

## Privacidade

Áudio, imagem, texto, memória, registro vivo e jardim não são enviados para nenhum
serviço externo nesta fase — Ollama, whisper.cpp e Kokoro rodam inteiramente na máquina
local. Logs do `local-server` reportam apenas `provider`, `model`, `durationMs` e
`success`/`error` — nunca o conteúdo bruto enviado ou recebido.
