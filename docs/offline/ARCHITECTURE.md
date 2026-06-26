# Arquitetura — Kaline Offline

Visão de alto nível do **destino** da Kaline Offline. Nem tudo aqui existe ainda:
este documento descreve para onde vamos, e marca o que já é real nesta fase.

## Diagrama (futuro)

```txt
Frontend herdado do Totalidade (React 19 + TanStack)
        │
        ▼
Runtime mode: online | offline        ← existe nesta fase (default: online)
        │
        ▼
API local em 127.0.0.1:64113           ← existe nesta fase, mas mínima (só /health)
        │
        ▼
SQLite                                 ← PR 2
        │
        ▼
Model Provider                         ← mock nesta fase; modelo real só no PR 4
        │
        ▼
Memória, Registro Vivo, Jardim,
Revisão, Sedimentos e Relatórios       ← PR 2 (dados) / PR 3 (UI)
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

## Componentes desta fase (PR 1)

| Componente | Local | Papel nesta fase |
|---|---|---|
| Runtime mode | `src/lib/local/runtime-mode.ts` | Declara `online`/`offline`; default `online`. |
| Local config | `src/lib/local/local-config.ts` | Resolve a URL da API local (default `http://127.0.0.1:64113`). |
| Model provider (tipos) | `src/lib/local/model-provider.types.ts` | Contrato mínimo de um provider de modelo. |
| Model provider (mock) | `src/lib/local/model-provider.mock.ts` | Provider mockado, sem modelo real e sem token. |
| Local API client | `src/lib/local/local-api-client.ts` | `checkLocalHealth()` com timeout curto. |
| Local server | `local-server/` | Node + Fastify; `GET /health` em `127.0.0.1:64113`. |

## Decisões técnicas registradas

- **`local-server` isolado.** Tem `package.json` e `tsconfig.json` próprios. A raiz usa
  **bun**; o servidor local usa **Node + npm + Fastify**. O `tsconfig` da raiz inclui apenas
  `src/**`, então o build/typecheck da raiz não compila o `local-server`.
- **Porta fixa `127.0.0.1:64113`.** Tratamento explícito de `EADDRINUSE` e graceful shutdown
  em `SIGINT`/`SIGTERM`.
- **PRAGMAs do SQLite** (a partir do PR 2): `journal_mode = WAL`, `foreign_keys = ON`,
  `busy_timeout = 5000`. Registrado aqui antecipadamente para servir de referência ao PR 2.
