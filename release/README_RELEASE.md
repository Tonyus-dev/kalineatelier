# Release — Kaline Offline v0.1

Esta pasta documenta como gerar e validar uma release baixável da Kaline Offline. Não há
instalador nativo nesta fase — a "release" é o próprio código-fonte mais scripts e
documentação, pronto para alguém clonar/baixar e rodar localmente.

## O que entra na release

```txt
código-fonte (src/, local-server/src/)
scripts/ (start-kaline-linux.sh, start-kaline-windows.bat, check-local-env.js, smoke-local-server.js)
docs/ (incluindo docs/offline/)
.env.example
local-server/.env.example
release/CHECKLIST.md
```

## O que NUNCA entra na release

```txt
node_modules/ (raiz e local-server)
local-server/data/*.sqlite (banco real do usuário)
.env e local-server/.env (segredos locais)
modelos de IA (Ollama baixa os seus próprios, fora do repositório)
qualquer secret (API keys, tokens)
```

## Como empacotar manualmente

```bash
git archive --format=zip -o kaline-offline-v0.1.zip HEAD
```

`git archive` já respeita `.gitignore`/arquivos rastreados, então `node_modules`, `.env` e
o banco SQLite real nunca entram no zip gerado a partir do HEAD do repositório.

## Antes de publicar

Ver [`CHECKLIST.md`](./CHECKLIST.md) e [`../docs/offline/RELEASE.md`](../docs/offline/RELEASE.md).
