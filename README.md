# Kaline Atelier

> Plataforma offline-first para assistente de voz, transcricao e TTS local.

## Modo Offline (Linux Mint Xfce)

A Kaline Offline roda localmente sem dependencia de servicos externos em runtime.

- Frontend/PWA: http://127.0.0.1:4173
- local-server (API): http://127.0.0.1:64113
- Ollama: http://127.0.0.1:11434
- TTS: kokoro-python (Dora PT-BR)

Documentacao completa: [docs/kaline-offline-linux-mint.md](docs/kaline-offline-linux-mint.md)

## Modelos recomendados

- Principal: `qwen2.5:1.5b`
- Fallback: `llama3.2:1b`

## Roteiro dos PRs

1. **PR 1** — TTS Dora PT-BR Offline via `kokoro-python`
2. **PR 2** — Frontend usando TTS local do `local-server`
3. **PR 3** — Modelos leves + identidade Kaline Offline
4. **PR 4** — Instalador, runtime e diagnostico da Kaline Offline no Linux Mint Xfce
5. **PR 5** — Testes imprimiveis e auditiva manual
