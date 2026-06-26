# Tunnel-Ready — preparação arquitetural (PR 5)

Este documento descreve a arquitetura **futura** da ponte entre a Totalidade (nuvem) e a
Kaline Local. **Nada aqui está implementado de fato.** Não há Cloudflare Tunnel, não há
Cloudflare Worker, não há Queue, não há WebSocket externo, não há sync real. O que existe
nesta fase é: configuração desativada por padrão, um endpoint de status honesto
(`GET /bridge/status`) e uma tabela `inbox_events` já preparada no schema local.

## Regra central

```txt
A Kaline Local não recebe comandos abertos da internet.
A ponte futura deve usar inbox/envelopes/revisão.
Nada vindo da nuvem entra no Jardim automaticamente.
```

Em outras palavras: mesmo quando o túnel existir, a nuvem nunca escreve diretamente em
`registro_vivo`, `jardim_memorias`, `sedimentos` ou `decisoes`. Ela só pode depositar um
**envelope** na inbox local, que fica pendente até revisão explícita da pessoa.

## Fluxo futuro (alto nível)

```txt
Totalidade / Nuvem
    ↓
envelopes controlados
    ↓
Inbox da Kaline Local
    ↓
Revisão explícita
    ↓
Registro/Jardim somente com confirmação
```

1. **Totalidade / Nuvem** — o app online produz um envelope (ex.: um evento, uma sugestão,
   uma memória candidata).
2. **Envelopes controlados** — o envelope é assinado/identificado, mas tratado como
   **não confiável por padrão** até prova em contrário.
3. **Inbox da Kaline Local** — o envelope é gravado em `inbox_events`, com
   `status = 'pending'` e `trust_level` conforme a origem.
4. **Revisão explícita** — a pessoa abre a inbox (UI futura) e decide: aceitar, descartar
   ou marcar erro. Nada é processado sozinho.
5. **Registro/Jardim somente com confirmação** — só depois de aceito, o conteúdo pode
   gerar uma entrada em Registro Vivo, Jardim, Sedimentos etc. — e isso é trabalho de um
   PR futuro, não deste.

## Configuração (desativada por padrão)

`local-server/.env.example` já traz as variáveis necessárias, todas inertes nesta fase:

```env
KALINE_TUNNEL_MODE=disabled
KALINE_DEVICE_ID=
KALINE_CLOUD_BRIDGE_URL=
KALINE_BRIDGE_PUBLIC_KEY=
```

Modos previstos para `KALINE_TUNNEL_MODE` (apenas `disabled` está implementado hoje):

- `disabled` — padrão. Nenhuma comunicação com a nuvem. **Único modo real neste PR.**
- `pull_only` — (futuro) a Kaline Local periodicamente busca envelopes pendentes na nuvem
  e os deposita na inbox local. Nunca aceita automaticamente.
- `manual_import` — (futuro) a pessoa importa manualmente um arquivo/envelope exportado da
  Totalidade, sem qualquer conexão de rede contínua.

`KALINE_DEVICE_ID`, `KALINE_CLOUD_BRIDGE_URL` e `KALINE_BRIDGE_PUBLIC_KEY` ficam vazios por
padrão e só fazem sentido quando um modo diferente de `disabled` for implementado.

## `GET /bridge/status`

Endpoint já implementado neste PR. Não faz pull, não faz push, não abre conexão nenhuma —
apenas reporta a configuração local de forma honesta, sem expor secrets.

```json
{
  "ok": true,
  "mode": "disabled",
  "deviceIdConfigured": false,
  "cloudBridgeConfigured": false,
  "bridgePublicKeyConfigured": false,
  "lastCloudCheckAt": null,
  "message": "Ponte com nuvem ainda não implementada. Modo tunnel-ready está desativado."
}
```

## `inbox_events` — já preparada no schema

A tabela `inbox_events` já existe em `local-server/src/db/schema.sql` desde o PR 2, com o
comentário "Preparado para a ponte futura". Ela já cobre o necessário para este PR:

```sql
CREATE TABLE IF NOT EXISTS inbox_events (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  payload_json TEXT NOT NULL,
  trust_level TEXT NOT NULL CHECK (trust_level IN ('local', 'untrusted', 'trusted')) DEFAULT 'local',
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'discarded', 'processed', 'error')) DEFAULT 'pending',
  received_at TEXT NOT NULL,
  processed_at TEXT,
  error TEXT,
  metadata_json TEXT
);
```

Já existem rotas `GET/POST /inbox` e `PATCH /inbox/:id` (de PRs anteriores) que permitem
criar e revisar eventos manualmente — hoje usadas apenas para testes locais e preparação,
**nunca alimentadas automaticamente pela nuvem**.

## O que fica como pendência real para PR futuro

- Implementação real de Cloudflare Tunnel/Worker.
- Implementação real de `pull_only`/`manual_import`.
- UI de revisão de inbox (lista de eventos pendentes, aceitar/descartar).
- Assinatura/verificação criptográfica dos envelopes (`bridgePublicKey`).
- Atualização real de `lastCloudCheckAt` (hoje sempre `null`, fixo no código).

Nenhum desses itens deve ser implementado "de surpresa" em PRs futuros sem que a regra
central deste documento continue valendo: revisão explícita antes de qualquer escrita em
Registro/Jardim.
