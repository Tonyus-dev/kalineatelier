# Arquitetura — Kaline Offline

Visão de alto nível da Kaline Offline. A maior parte do diagrama já é real (v0.2 / PR 6);
cada linha marca explicitamente se é **implementado** hoje ou **estado futuro**.

## Diagrama

```txt
Frontend herdado do Totalidade (React 19 + TanStack)
        │
        ▼
Runtime mode: online | offline        ← implementado (default: online)
        │
        ▼
API local em 127.0.0.1:64113           ← implementado (REST completa: chat, memória, etc.)
        │
        ▼
SQLite                                 ← implementado (WAL + foreign_keys + índices)
        │
        ▼
Model Provider                         ← implementado: mock (padrão), Ollama/Qwen real,
                                         OpenRouter opcional; transcrição via whisper.cpp
        │
        ▼
Memória, Registro Vivo, Jardim,
Revisão, Sedimentos e Relatórios       ← implementado (dados + UI no Atelier)
        │
        ▼
Ponte criptografada com o Totalidade   ← estado futuro (ver TUNNEL_READY.md)
```

## Princípios

- **Local-first e privado.** A Kaline Offline não depende de nuvem para funcionar. O
  servidor local escuta **apenas** em `127.0.0.1` — nunca em `0.0.0.0`.
- **Não quebrar a matriz online.** O Totalidade continua sendo o corpo online. O modo
  `offline` é apenas preparado; o default permanece `online` para não alterar o app atual.
- **Sem execução-fantasma.** Nenhuma ação finge ter acontecido. Se a API local estiver
  fora do ar, o estado retornado é explícito e controlado — nada é salvo "no escuro".
- **Identidade herdada, não duplicada.** A identidade vem de `docs/canon/Identity.md` e dos
  documentos canônicos da Kaline. A derivação offline referencia, não recria.

## Componentes implementados (v0.2)

| Componente | Local | Papel hoje |
|---|---|---|
| Runtime mode | `src/lib/local/runtime-mode.ts` | Declara `online`/`offline`; default `online`. |
| Local config | `src/lib/local/local-config.ts` | Resolve a URL da API local (default `http://127.0.0.1:64113`). |
| Local API client | `src/lib/local/local-api-client.ts` | `checkLocalHealth()` + chamadas REST (chat, memória, testes de IA/transcrição). |
| Model provider | `local-server/src/services/model-provider/` | mock (padrão), Ollama/Qwen real e status honesto; OpenRouter opcional. |
| Transcrição | `local-server/src/services/transcription/` | whisper.cpp via `execFile` (sem shell), arquivo temporário sempre removido. |
| Local server | `local-server/` | Node + Fastify; REST completa em `127.0.0.1:64113`. |

## Decisões técnicas registradas

- **`local-server` isolado.** Tem `package.json` e `tsconfig.json` próprios. A raiz usa
  **bun**; o servidor local usa **Node + npm + Fastify**. O `tsconfig` da raiz inclui apenas
  `src/**`, então o build/typecheck da raiz não compila o `local-server`.
- **Porta fixa `127.0.0.1:64113`.** Tratamento explícito de `EADDRINUSE` e graceful shutdown
  em `SIGINT`/`SIGTERM`.
- **PRAGMAs do SQLite** (a partir do PR 2): `journal_mode = WAL`, `foreign_keys = ON`,
  `busy_timeout = 5000`. Registrado aqui antecipadamente para servir de referência ao PR 2.
