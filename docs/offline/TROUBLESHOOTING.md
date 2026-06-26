# Solução de problemas — Kaline Offline v0.1

## Porta 64113 ocupada

```txt
Porta 64113 já está em uso. Feche outro processo da Kaline Local ou altere a porta local.
```

Outro `local-server` (ou outro processo qualquer) já está usando a porta. Feche o processo
anterior ou rode `node scripts/check-local-env.js` para confirmar. Se precisar de outra
porta, defina `KALINE_LOCAL_PORT` em `local-server/.env` (e ajuste `VITE_KALINE_LOCAL_API`
na raiz para apontar para a nova porta).

## `bun` não encontrado

Instale em [bun.sh](https://bun.sh):

```bash
curl -fsSL https://bun.sh/install | bash
```

Depois abra um novo terminal (ou rode `source ~/.bashrc` / `source ~/.zshrc`) para que o
`bun` entre no `PATH`.

## `node` não encontrado

Instale Node.js 20+ em [nodejs.org](https://nodejs.org) ou via [nvm](https://github.com/nvm-sh/nvm).

## `npm install` falhou (em `local-server`)

- Confirme que está dentro de `local-server/` ao rodar `npm install`.
- Limpe `node_modules` e `package-lock.json` lock corrompido: `rm -rf node_modules && npm install`.
- Em Linux, se houver erro de compilação nativa (`better-sqlite3`), confirme que ferramentas
  de build básicas (`build-essential` no Ubuntu/Mint) estão instaladas. Não é necessário
  `sudo` para o restante do processo, apenas para esse pacote do sistema, se faltar.

## `local-server` não responde

- Confirme que o terminal do `local-server` está aberto e sem erro.
- Teste diretamente: `curl http://127.0.0.1:64113/health`.
- Confirme que `VITE_KALINE_LOCAL_API` no `.env` da raiz aponta para a URL correta
  (padrão `http://127.0.0.1:64113`).

## Frontend não abre

- Confirme que `bun run dev` está rodando sem erro no terminal.
- A porta padrão é `5173`, mas o Vite escolhe outra se estiver ocupada — leia a URL exata
  impressa no terminal.
- Acesse explicitamente `/atelier` (a Kaline Offline não é a rota raiz do app online).

## SQLite não criou arquivo

- O arquivo é criado na primeira requisição ao `local-server`, em
  `local-server/data/kaline.sqlite` (ou no caminho de `KALINE_DATABASE_PATH`).
- Confirme que o processo tem permissão de escrita na pasta `local-server/data/`.
- Veja `GET /health` — o campo `sqlite` deve estar `"ok"`.

## Ollama offline

```txt
GET /model/status
```

Se `provider` for `ollama` mas o serviço não estiver rodando, as chamadas de IA real vão
falhar (a Kaline Offline não cai automaticamente para o mock nesta fase, a menos que
`KALINE_MODEL_FALLBACK_TO_MOCK` seja tratado por um PR futuro). Rode `ollama serve` ou abra
o app do Ollama, e confirme `OLLAMA_BASE_URL` em `local-server/.env`.

## OpenRouter sem chave

```txt
"message": "OpenRouter selecionado, mas OPENROUTER_API_KEY não está configurada."
```

Defina `OPENROUTER_API_KEY` em `local-server/.env` (nunca em arquivo versionado) ou volte
`KALINE_MODEL_PROVIDER` para `mock`.

## Provider mock aparecendo mesmo configurando outro provider

Nesta fase (v0.1, PR 5), `GET /model/status` reporta o provider configurado, mas o fluxo de
chat ainda gera respostas mock internamente — a troca real de provider no chat é trabalho
de um PR futuro. Isso é esperado e documentado em `MODELS_LOCAL.md`.

## Túnel desativado

```txt
GET /bridge/status
{ "mode": "disabled", ... }
```

Isso é o comportamento esperado e correto por padrão. Não há túnel real implementado nesta
fase — veja `docs/offline/TUNNEL_READY.md`.
