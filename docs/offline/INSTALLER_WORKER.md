# Portal Instalador da Kaline Offline (Cloudflare Worker)

`apps/installer-worker/` é um portal público que ajuda quem ainda não tem a
Kaline Offline a chegar até ela: um HTML único detecta o sistema do
visitante (Linux ou Windows) e oferece o bootstrap correto para baixar.

Este documento descreve a arquitetura em três camadas, as rotas do Worker,
como rodar e publicar, e o que o portal **nunca** faz.

## Por que três camadas

```
1. Portal público (Cloudflare Worker)     → apps/installer-worker/
2. Bootstrap baixável (script pequeno)    → apps/installer-worker/install/*
3. Instalador real (lógica completa)      → scripts/install-kaline-*.{sh,ps1}
```

Cada camada tem uma responsabilidade e só uma:

1. **Portal público** — serve HTML, CSS, JS e os bootstraps. Roda na nuvem
   (Cloudflare), é visível por qualquer pessoa com a URL, e por isso nunca
   pode tocar em nada privado: não lê arquivos locais, não recebe tokens,
   áudio, banco de dados ou chaves, e não fala com a Kaline local
   (`127.0.0.1:64113`).
2. **Bootstrap baixável** (`install/*.sh`, `install/*.ps1`, etc.) — script
   pequeno, baixado pelo navegador, executado no computador do usuário. Sua
   única responsabilidade é localizar ou clonar o repositório
   `Tonyus-dev/kalineatelier` e chamar o instalador real. Ele não duplica
   lógica de dependências, modelos, SQLite, Tauri, atalhos, Whisper ou
   Kokoro.
3. **Instalador real** (`scripts/install-kaline-mint.sh`,
   `scripts/install-kaline-windows.ps1`) — já existia antes deste portal e
   continua sendo a única fonte de verdade da instalação. O portal não
   reescreve nem duplica essa lógica; só facilita o caminho até ela.

## Rotas do Worker

| Rota                               | Conteúdo                                                |
|-------------------------------------|-----------------------------------------------------------|
| `GET /`                             | `public/index.html` — o portal                            |
| `GET /install/linux-mint.sh`        | bootstrap Linux Mint Xfce (`text/x-shellscript`)           |
| `GET /install/linux-mint.desktop`   | launcher `.desktop` que chama o bootstrap acima            |
| `GET /install/windows.bat`          | bootstrap Windows, clicável (chama o `.ps1`)                |
| `GET /install/windows.ps1`          | bootstrap Windows em PowerShell                            |
| `GET /health`                       | `{ "ok": true, "service": "kaline-installer-worker", "mode": "public-installer-portal" }` |

`public/index.html` e os arquivos em `install/` são embutidos como texto puro
no Worker (regra `Text` em `wrangler.toml`) — sem Static Assets, de propósito:
algumas contas Cloudflare bloqueiam (403) a criação de Workers novos que usam
esse binding. Qualquer rota fora da tabela acima recebe `404`.

## Rodar o Worker localmente

```bash
cd apps/installer-worker
npm install
npm run dev          # wrangler dev — normalmente em http://127.0.0.1:8787
```

Valide manualmente:

```bash
curl -s http://127.0.0.1:8787/health
curl -s http://127.0.0.1:8787/ | head -n 5
curl -s http://127.0.0.1:8787/install/linux-mint.sh | head -n 5
curl -s http://127.0.0.1:8787/install/windows.ps1 | head -n 5
```

## Publicar no Cloudflare Worker

```bash
cd apps/installer-worker
npx wrangler login    # uma vez, por máquina
npm install
npm run deploy        # wrangler deploy
```

O `name` do Worker e o `compatibility_date` estão em `wrangler.toml`. Ajuste
o `name` se o nome já estiver em uso na sua conta Cloudflare. Não é necessário
nenhum binding — o portal não usa KV, D1, R2, Durable Objects, Static Assets
ou variáveis de ambiente sensíveis.

## Como baixar e usar os instaladores

### Linux Mint Xfce

Pelo botão "Baixar instalador Linux Mint" no portal, ou direto:

```bash
curl -fsSL https://SEU-WORKER.workers.dev/install/linux-mint.sh -o install-kaline.sh
less install-kaline.sh   # revise antes de executar (recomendado)
bash install-kaline.sh
```

Comando rápido (sem revisar antes), também oferecido no portal:

```bash
curl -fsSL https://SEU-WORKER.workers.dev/install/linux-mint.sh -o install-kaline.sh && bash install-kaline.sh
```

### Windows

Pelo botão "Baixar instalador Windows" no portal (baixa o `.bat`, dois
cliques já chama o `.ps1`), ou via PowerShell:

```powershell
irm https://SEU-WORKER.workers.dev/install/windows.ps1 -OutFile install-kaline.ps1
powershell -ExecutionPolicy Bypass -File .\install-kaline.ps1
```

## Atualizar o repositório depois

O bootstrap pergunta se quer `git pull` quando encontra o repositório já
clonado. Você também pode atualizar manualmente:

```bash
cd ~/Kaline/kalineatelier   # ou onde você clonou
git pull
bash scripts/install-kaline-mint.sh        # Linux
powershell -ExecutionPolicy Bypass -File scripts\install-kaline-windows.ps1  # Windows
```

## Corrigir `gh auth`

Os bootstraps verificam `gh auth status` e, se necessário, pedem que você
rode `gh auth login` em um terminal — nunca peça nem cole um token no
portal. Veja `docs/offline/TROUBLESHOOTING_INSTALLER.md` para detalhes.

## Corrigir PowerShell bloqueado / Mint bloqueando execução

Veja `docs/offline/TROUBLESHOOTING_INSTALLER.md`.

## Verificar Ollama, modelos e banco SQLite

Isso é feito pelo instalador real (`scripts/install-kaline-mint.sh` /
`scripts/install-kaline-windows.ps1`), não pelo bootstrap nem pelo Worker:

- Ollama e os modelos esperados (sincronizados com
  `local-server/src/config.ts`) são verificados, e qualquer download de
  modelo exige confirmação explícita (`[s/N]`).
- O banco SQLite é inicializado pelo próprio `local-server` (migrações
  idempotentes em `local-server/src/db/schema.sql`) — o instalador apenas
  builda o `local-server` e valida o resultado quando possível
  (`GET /health`), sem criar tabelas manualmente.

## O que este Worker não faz

- Não instala nada no computador do visitante.
- Não executa nenhum script no computador do visitante.
- Não lê arquivos locais do visitante.
- Não recebe tokens, áudio, banco de dados ou chaves.
- Não se comunica com a Kaline local (`127.0.0.1:64113`).
- Não publica `.env`, `*.sqlite`, `*.db`, segredos, modelos, áudio ou
  transcrições — nada disso existe em `apps/installer-worker/`.

## O que acontece localmente

Tudo o resto: clonar/atualizar o repositório, instalar dependências,
configurar `.env` (com backup), verificar Ollama/Whisper/Kokoro, inicializar
o `local-server` e o SQLite, criar atalhos e tentar fixar a Kaline Janelinha
no painel do Xfce. Essa lógica já existia antes deste portal, em
`scripts/install-kaline-mint.sh` e `scripts/install-kaline-windows.ps1`, e
não foi reescrita por este PR.
