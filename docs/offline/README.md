# Kaline Offline / Kaline Atelier

A **Kaline Offline** é a derivação local-first, privada e modular da Kaline, nascida
do **Totalidade saneado** (o app online, cujo saneamento identitário está documentado
em [`docs/identity-audit.md`](../identity-audit.md)).

Ela **não recria** a identidade da Kaline: herda-a do app original. As fontes de verdade
continuam sendo [`docs/canon/Identity.md`](../canon/Identity.md) (primária) e os documentos
canônicos em [`docs/kaline/`](../kaline/). Esta derivação apenas dá à Kaline um corpo local.

```txt
Totalidade      = corpo online saneado.
Kaline Offline  = cérebro privado local-first.
Kaline Atelier  = experiência visual local de memória e criação.
```

## O que é (e o que ainda não é)

A matriz online (Totalidade) **continua existindo e funcionando**. A Kaline Offline cresce
ao lado dela, sem destruí-la, em movimentos pequenos e revisáveis:

```txt
PR 1 — preparar o chão   (este PR: fundação)
PR 2 — instalar o coração (SQLite + API local + memória)
PR 3 — abrir a casa       (Kaline Atelier UI)
```

### Esta fase (PR 1 — Fundação)

Esta fase **apenas** declara, documenta e prepara a infraestrutura mínima para a futura
Kaline Offline. Ela entrega:

- documentação da derivação offline (esta pasta `docs/offline/`);
- um conceito de **runtime mode** (`online` | `offline`), com default seguro `online`;
- um **client local** mínimo (`checkLocalHealth`) que conversa com a API local;
- uma interface de **model provider** com um provider **mock** (sem modelo real, sem token);
- um **`local-server`** isolado (Node + Fastify) que sobe em `127.0.0.1:4517` e expõe `GET /health`.

Esta fase **não** implementa: banco de dados (SQLite), schema local, chat/registro/jardim/revisão
offline funcionais, interface Kaline Atelier, rotas `/atelier`, iframe, modelos locais reais,
voz (Whisper/Kokoro), Cloudflare Worker, Tunnel, Queue ou ponte criptografada. Nada disso
começou. Veja [`ROADMAP.md`](./ROADMAP.md).

## Documentos desta pasta

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — arquitetura futura em alto nível.
- [`ROADMAP.md`](./ROADMAP.md) — as fases da Kaline Offline.
- [`ONLINE_DEPENDENCIES.md`](./ONLINE_DEPENDENCIES.md) — dependências online que precisarão de adaptação local.

## Como rodar o `local-server` (fundação)

```bash
cd local-server
npm install
npm run dev
# em outro terminal:
curl http://127.0.0.1:4517/health
```

Resposta esperada:

```json
{ "ok": true, "service": "kaline-local", "mode": "offline-foundation", "version": "0.1.0" }
```
