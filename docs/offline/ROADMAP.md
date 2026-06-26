# Roadmap — Kaline Offline

A Kaline Offline nasce em três movimentos, um PR por vez. Cada PR deve ser pequeno o
suficiente para revisar e completo o suficiente para compilar. Não antecipar fases.

## Fases

```txt
PR 1 — Fundação local                    ← este PR
PR 2 — SQLite / API local / Memória
PR 3 — Kaline Atelier UI
PR 4 — modelos locais reais
PR 5 — voz e transcrição (Whisper / Kokoro)
PR 6 — ponte criptografada futura
```

## PR 1 — Fundação local (atual)

- Documentação em `docs/offline/`.
- Runtime mode (`online` | `offline`), default `online`.
- Client local mínimo (`checkLocalHealth`).
- Interface de model provider + provider mock.
- `local-server` isolado com `GET /health` em `127.0.0.1:64113`.

**Fora de escopo:** SQLite, schema, chat/registro/jardim/revisão funcionais, UI Atelier,
iframe, rotas `/atelier`, modelos reais, voz, Cloudflare, ponte.

## PR 2 — SQLite / API local / Memória

- SQLite (`better-sqlite3`) com PRAGMAs (`WAL`, `foreign_keys`, `busy_timeout`).
- Schema: threads, mensagens, Registro Vivo, Sedimentos, Jardim, Decisões, Reports,
  Settings, Inbox local.
- Endpoints REST de memória; chat mockado que persiste; sedimentação determinística.

## PR 3 — Kaline Atelier UI

- Rota `/atelier` (rotas internas via TanStack Router, sem iframe como padrão).
- Shell com status da API local; módulos: Chat, Coder, Registro Vivo, Jardim, Revisão,
  Relatórios, Configurações.

## PR 4 — Otimização estrutural: Kaline Offline enxuta (concluído)

Poda de navegação/rotas/dashboard, sem nenhuma funcionalidade nova: removidos comércio de
Kuan-Yin, chats paralelos (Kháris, Kuan-Yin), Treinos dedicado, Drive, Jurídico dedicado
(Jurisprudência/Legislação) e Perfis & Convites. Nenhuma migração apagada. Detalhes e
classificação de migrações em [`OFFLINE_SCOPE.md`](./OFFLINE_SCOPE.md).

## Pós-PR 4

```txt
PR 5 — modelos locais reais
PR 6 — Whisper Small / Kokoro
PR 7 — pipeline público criptografado
PR 8 — ponte com Totalidade online
PR 9 — empacotamento portátil
```

A ponte criptografada só nasce depois de existirem, estáveis: SQLite local, `inbox_events`,
API local, Revisão, Jardim e um modelo de confiança.
