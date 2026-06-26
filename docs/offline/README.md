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
PR 1 — preparar o chão     (fundação)
PR 2 — instalar o coração  (SQLite + API local + memória)
PR 3 — abrir a casa        (Kaline Atelier UI)
PR 4 — otimizar antes de encher (limpeza estrutural + IA configurável)
PR 5 — release local e tunnel-ready (este PR)
```

### Esta fase (PR 5 — Release local e tunnel-ready)

Esta fase transforma a Kaline Offline em algo **baixável e executável localmente**, sem
implementar túnel real, voz ou sync com a nuvem. Ela entrega:

- scripts de execução local (`scripts/start-kaline-linux.sh`, `scripts/start-kaline-windows.bat`,
  `scripts/check-local-env.js`);
- `local-server/.env.example` completo (host/porta/dados, provider de modelo, túnel);
- endpoints `GET /model/status` e `GET /bridge/status`, ambos honestos sobre o que está
  configurado, sem expor secrets;
- documentação de instalação, modelos locais, troubleshooting e checklist de release
  (`INSTALL.md`, `MODELS_LOCAL.md`, `TROUBLESHOOTING.md`, `RELEASE.md`);
- preparação arquitetural para túnel futuro, sem implementá-lo (`TUNNEL_READY.md`);
- smoke test (`scripts/smoke-local-server.js`) cobrindo `/health`, `/model/status`,
  `/bridge/status` e `/chat` com o provider mock.

Esta fase **não** implementa: Cloudflare Tunnel/Worker reais, Queue, WebSocket externo, sync
real com a nuvem, login remoto, ponte criptografada real, Whisper, Kokoro, microfone,
gravação, upload de áudio ou instalador nativo complexo. Veja [`ROADMAP.md`](./ROADMAP.md).

## Documentos desta pasta

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — arquitetura futura em alto nível.
- [`ROADMAP.md`](./ROADMAP.md) — as fases da Kaline Offline.
- [`ONLINE_DEPENDENCIES.md`](./ONLINE_DEPENDENCIES.md) — dependências online que precisarão de adaptação local.
- [`OFFLINE_SCOPE.md`](./OFFLINE_SCOPE.md) — escopo funcional mantido/removido (PR 4).
- [`INSTALL.md`](./INSTALL.md) — como baixar, instalar e rodar localmente (PR 5).
- [`MODELS_LOCAL.md`](./MODELS_LOCAL.md) — mock, OpenRouter e Ollama (PR 5).
- [`TUNNEL_READY.md`](./TUNNEL_READY.md) — arquitetura futura de ponte com a nuvem (PR 5).
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) — problemas comuns (PR 5).
- [`RELEASE.md`](./RELEASE.md) — checklist de release (PR 5).

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
