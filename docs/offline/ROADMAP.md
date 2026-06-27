# Roadmap — Kaline Offline

A Kaline Offline nasce em três movimentos, um PR por vez. Cada PR deve ser pequeno o
suficiente para revisar e completo o suficiente para compilar. Não antecipar fases.

## Fases (histórico real)

```txt
PR 1 — Fundação local                                   ← concluído
PR 2 — SQLite / API local / Memória                     ← concluído
PR 3 — Kaline Atelier UI                                 ← concluído
PR 4 — Otimização estrutural (Offline enxuta)           ← concluído
PR 5 — Release local + arquitetura tunnel-ready (mock)  ← concluído
PR 6 — Motores locais reais: Ollama + Qwen + whisper.cpp ← concluído (v0.2)
```

Observação: o plano inicial separava "modelos" e "voz" em PRs distintos, mas na prática o
PR 6 entregou texto/visão (Ollama + Qwen) e transcrição (whisper.cpp) juntos. Este roadmap
reflete a sequência que de fato aconteceu.

## PR 1 — Fundação local (concluído)

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

## Próximos passos (pós-PR 6)

```txt
TTS local (Kokoro / voz)
pipeline público criptografado
ponte com Totalidade online
empacotamento portátil
```

A ponte criptografada só nasce depois de existirem, estáveis: SQLite local, `inbox_events`,
API local, Revisão, Jardim e um modelo de confiança.
