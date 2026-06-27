# Modelos de IA — Kaline Offline v0.2

A Kaline Offline roda com **provider mock por padrão**: nenhuma IA real é consultada,
nenhum token é gasto, nenhuma rede externa é usada. Isso é intencional para que qualquer
pessoa consiga baixar e testar sem custo e sem configuração.

A partir desta fase (PR 6), a Kaline Offline também sabe falar de verdade com motores
locais reais: **Ollama + Qwen3.5 4B** para texto/resumo/raciocínio leve/visão, e
**whisper.cpp + ggml-small** para transcrição de áudio. Tudo roda na máquina da pessoa —
nada é enviado para fora.

Veja o status real em `GET http://127.0.0.1:64113/model/status` e
`GET http://127.0.0.1:64113/transcribe/status`, ou na área de Configurações do Atelier
(cards "IA local — Ollama" e "Whisper — transcrição local").

## Opções de provider (`KALINE_MODEL_PROVIDER`)

### `mock` — padrão

```env
KALINE_MODEL_PROVIDER=mock
```

Sem IA real. As respostas do Chat Kaline são estruturais, indicando claramente que nenhum
modelo foi consultado. Use para testar a navegação, o banco local e a interface.

### `ollama` — motor local real

```env
KALINE_MODEL_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL_GENERAL=qwen3.5:4b
OLLAMA_MODEL_SUMMARY=qwen3.5:4b
OLLAMA_MODEL_CODER=qwen3.5:4b
OLLAMA_MODEL_VISION=qwen3.5:4b
OLLAMA_REQUEST_TIMEOUT_MS=120000
```

#### 1. Instalar o Ollama

Baixe em [ollama.com](https://ollama.com) e instale normalmente para o seu sistema.

#### 2. Baixar o modelo principal

```bash
ollama pull qwen3.5:4b
```

Esse mesmo modelo é usado para texto geral, resumo, raciocínio leve e visão
(`OLLAMA_MODEL_GENERAL`, `OLLAMA_MODEL_SUMMARY`, `OLLAMA_MODEL_VISION`). O campo
`OLLAMA_MODEL_CODER` aponta para o mesmo modelo apenas para não deixar buraco caso alguma
área interna da Kaline chame esse papel — o trabalho de código pesado continua fora da
Kaline, em ferramentas como VS Code/Codex/Claude/Cline.

#### 3. Testar o modelo direto no Ollama

```bash
ollama run qwen3.5:4b
```

Prompt de teste:

```txt
Responda em português: organize minha manhã em três tarefas simples.
```

#### 4. Rodar o local-server

Com o Ollama ativo (`ollama serve`, geralmente automático após a instalação) em
`127.0.0.1:11434`, inicie o `local-server` normalmente. `GET /model/status` deve reportar
`"available": true`.

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

## Visão local (`POST /model/vision`)

Canal MVP de imagem via Ollama. Aceita `imageBase64` (puro ou data URL) e `prompt`,
usa `OLLAMA_MODEL_VISION`, não salva a imagem em disco. Disponível apenas quando
`KALINE_MODEL_PROVIDER=ollama`.

## Transcrição de áudio — whisper.cpp + ggml-small

```env
KALINE_TRANSCRIBE_PROVIDER=whisper_cpp
WHISPER_CPP_BIN=/caminho/para/whisper.cpp/build/bin/whisper-cli
WHISPER_CPP_MODEL=/caminho/para/whisper.cpp/models/ggml-small.bin
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

Preencha `WHISPER_CPP_BIN` e `WHISPER_CPP_MODEL` em `local-server/.env` com os caminhos
absolutos do seu sistema. `GET /transcribe/status` deve reportar `"available": true`.

`POST /transcribe/file` aceita upload `multipart/form-data` (campo `file`), salva o áudio
em um arquivo temporário dentro de `local-server/data/tmp`, chama `whisper-cli` via
`execFile` (argumentos em array, nunca shell) e remove o arquivo temporário ao final —
sem manter áudio permanentemente.

## Outras variáveis relevantes

```env
KALINE_MODEL_TIMEOUT_MS=60000
KALINE_MODEL_MAX_INPUT_CHARS=24000
OLLAMA_REQUEST_TIMEOUT_MS=120000
WHISPER_REQUEST_TIMEOUT_MS=180000
```

## Privacidade

Áudio, imagem, texto, memória, registro vivo e jardim não são enviados para nenhum
serviço externo nesta fase — Ollama e whisper.cpp rodam inteiramente na máquina local.
Logs do `local-server` reportam apenas `provider`, `model`, `durationMs` e
`success`/`error` — nunca o conteúdo bruto enviado ou recebido.
