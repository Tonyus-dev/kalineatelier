# Kaline Installer Worker

Portal público da Kaline Offline: um HTML único que detecta o sistema do
visitante e entrega o bootstrap correto (Linux Mint Xfce ou Windows),
publicado via Cloudflare Worker com Static Assets.

Este pacote **não instala nada por conta própria**. Ele só serve arquivos
públicos. A instalação real continua acontecendo no computador do usuário,
pelos scripts já existentes em `scripts/*` (ver `docs/offline/INSTALLER_WORKER.md`
para a arquitetura completa em três camadas).

## Estrutura

```
apps/installer-worker/
├─ src/index.ts        # Worker: roteia /health e /install/*, delega o resto às Static Assets
├─ public/index.html   # portal (HTML + CSS + JS embutidos, sem framework)
├─ install/             # bootstraps públicos baixáveis
│  ├─ kaline-installer-linux-mint.sh
│  ├─ kaline-installer-linux-mint.desktop
│  ├─ kaline-installer-windows.bat
│  └─ kaline-installer-windows.ps1
├─ wrangler.toml
├─ package.json
└─ tsconfig.json
```

Os arquivos em `install/` são importados como texto puro pelo Worker (regra
`Text` em `wrangler.toml`) e servidos nas rotas `/install/*` — não há cópia
duplicada deles em `public/`.

## Rotas

| Rota                          | Conteúdo                                   |
|--------------------------------|---------------------------------------------|
| `GET /`                        | `public/index.html` (via Static Assets)     |
| `GET /install/linux-mint.sh`        | bootstrap Linux Mint Xfce              |
| `GET /install/linux-mint.desktop`   | launcher `.desktop` do bootstrap Linux |
| `GET /install/windows.bat`          | bootstrap Windows (`.bat`)             |
| `GET /install/windows.ps1`          | bootstrap Windows (PowerShell)         |
| `GET /health`                  | `{ "ok": true, "service": "kaline-installer-worker", "mode": "public-installer-portal" }` |

## Rodar localmente

```bash
cd apps/installer-worker
npm install
npm run dev      # wrangler dev
```

Abra `http://127.0.0.1:8787` (porta padrão do `wrangler dev`) e teste as
rotas acima.

## Publicar no Cloudflare Worker

```bash
cd apps/installer-worker
npm install
npm run deploy   # wrangler deploy
```

Requer login prévio (`npx wrangler login`) e um nome de Worker disponível na
sua conta Cloudflare (ajuste `name` em `wrangler.toml` se necessário).

## O que este Worker nunca faz

- Não instala nada no computador do visitante.
- Não lê arquivos locais do visitante.
- Não recebe tokens, áudio, banco de dados ou chaves.
- Não se comunica com a Kaline local (`127.0.0.1:64113`).
- Não publica `.env`, `*.sqlite`, `*.db`, segredos ou dados de runtime —
  veja `.gitignore` e a ausência desses arquivos nesta pasta.

Veja `docs/offline/INSTALLER_WORKER.md` para a documentação completa
(arquitetura, segurança, publicação, troubleshooting).
