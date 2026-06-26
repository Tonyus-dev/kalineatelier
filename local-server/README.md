# Kaline Local Server

Backend **local-first** e **isolado** da Kaline Offline. Escuta **apenas** em `127.0.0.1:64113`.

Este projeto é independente da raiz: tem `package.json` e `tsconfig.json` próprios. A raiz
usa **bun**; aqui usamos **Node + npm + Fastify**. O `tsconfig` da raiz inclui só `src/**`,
então o build/typecheck da raiz não compila este servidor.

## O que é (nesta fase — PR 1)

Apenas a fundação: um servidor mínimo com um único endpoint de saúde.

```txt
GET /health → { "ok": true, "service": "kaline-local", "mode": "offline-foundation", "version": "0.1.0" }
```

## O que NÃO é (ainda)

Sem SQLite, sem chat/memória, sem modelos (reais ou via OpenRouter), sem upload, sem voz,
sem nuvem, sem ponte. Veja [`../docs/offline/ROADMAP.md`](../docs/offline/ROADMAP.md).

## Como rodar

```bash
cd local-server
npm install
npm run dev          # tsx watch — desenvolvimento
# ou
npm run build && npm run start
```

Teste:

```bash
curl http://127.0.0.1:64113/health
```

## Comportamento operacional

- **Porta ocupada (`EADDRINUSE`)**: o servidor encerra com a mensagem
  `Porta 64113 já está em uso. Feche outro processo da Kaline Local ou altere a porta local.`
- **Encerramento limpo**: `SIGINT` (Ctrl-C) e `SIGTERM` fecham o Fastify antes de sair.

## Segurança

O servidor local **não** executa comandos do sistema, **não** lê arquivos arbitrários,
**não** aceita upload, **não** expõe variáveis de ambiente, **não** faz requisições à nuvem
e **não** escuta fora de `127.0.0.1`.
