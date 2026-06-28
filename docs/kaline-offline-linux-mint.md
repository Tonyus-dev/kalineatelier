# Kaline Offline — Linux Mint Xfce

## URLs locais

- Frontend: http://127.0.0.1:4173
- local-server: http://127.0.0.1:64113
- Ollama: http://127.0.0.1:11434

## Modelos recomendados

- Principal: qwen2.5:1.5b
- Fallback: llama3.2:1b

## Voz

- Provider: kokoro-python
- Voz: Dora PT-BR
- Arquivos:
  - ~/Kaline/motores/kokoro-python/config.json
  - ~/Kaline/motores/kokoro-python/kokoro-v1_0.pth
  - ~/Kaline/motores/kokoro-python/voices/pf_dora.pt

## Configurar ambiente

```bash
bash scripts/setup-kaline-offline-env.sh
```

## Iniciar

```bash
bash scripts/start-kaline-mint.sh --open=none
```

## Parar

```bash
bash scripts/stop-kaline-mint.sh
```

## Reiniciar

```bash
bash scripts/restart-kaline-mint.sh
```

## Diagnosticar

```bash
bash scripts/check-kaline-offline.sh
```

## Testar TTS

```bash
bash scripts/check-kaline-tts.sh
```

## Criar atalho

```bash
bash scripts/create-kaline-xfce-shortcuts.sh
```

## Observacoes

Este modo e offline-first. Nao depende de Supabase, Cloudflare, OpenRouter, Fal ou Hugging Face em runtime local.
