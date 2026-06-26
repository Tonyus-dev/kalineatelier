# Modelos de IA — Kaline Offline v0.1

A Kaline Offline roda com **provider mock por padrão**: nenhuma IA real é consultada,
nenhum token é gasto, nenhuma rede externa é usada. Isso é intencional para que qualquer
pessoa consiga baixar e testar sem custo e sem configuração.

Veja o status atual do provider em `GET http://127.0.0.1:4517/model/status`, ou na área de
status da UI (Configurações/Modelos/Conexões).

## Opções de provider (`KALINE_MODEL_PROVIDER`)

### `mock` — padrão

```env
KALINE_MODEL_PROVIDER=mock
```

Sem IA real. As respostas do Chat Kaline são estruturais, indicando claramente que nenhum
modelo foi consultado. Use para testar a navegação, o banco local e a interface.

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
em `local-server/.env`, que está no `.gitignore`.

### `ollama` — opcional, local

```env
KALINE_MODEL_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL_GENERAL=qwen2.5:1.5b
OLLAMA_MODEL_CODER=qwen2.5-coder:1.5b
OLLAMA_MODEL_SUMMARY=qwen2.5:1.5b
```

Instale o [Ollama](https://ollama.com) e baixe os modelos manualmente:

```bash
ollama pull qwen2.5:1.5b
ollama pull qwen2.5-coder:1.5b
```

Depois disso, o Ollama precisa estar rodando (`ollama serve`, geralmente automático após a
instalação) em `127.0.0.1:11434` antes de iniciar o `local-server`.

## A Kaline Offline não baixa modelos automaticamente

Em nenhum momento o app dispara `ollama pull` ou qualquer download de modelo por conta
própria. A pessoa decide o que baixar e quando, fora do app.

## Outras variáveis relevantes

```env
KALINE_MODEL_FALLBACK_TO_MOCK=false
KALINE_MODEL_TIMEOUT_MS=60000
KALINE_MODEL_MAX_INPUT_CHARS=24000
```

`KALINE_MODEL_FALLBACK_TO_MOCK` está documentada para uso futuro (cair de volta no mock se
o provider real falhar); nesta fase o comportamento de chat ainda usa o mock internamente
independente do provider configurado — `GET /model/status` reporta a configuração, mas a
troca real de provider no fluxo de chat é trabalho de PR futuro.
