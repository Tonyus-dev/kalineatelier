# Tunnel-Ready — Olhar de Kairós

Este documento descreve a ponte entre a Totalidade (nuvem) e a Kaline Local. `disabled`
continua sendo o padrão de fábrica. `pull_only` agora tem uma implementação real e
deliberadamente pequena, chamada **Olhar de Kairós**: um pull único, sob demanda, de um
snapshot consolidado e cifrado — não um mecanismo de sync genérico. Não há Cloudflare
Tunnel, não há Worker dedicado à ponte (a Totalidade já é um Worker e só ganhou mais um
endpoint REST de leitura), não há Queue, não há WebSocket, não há fila de eventos
incrementais, não há retry automático, não há push em nenhuma direção.

## Regra central

```txt
A Kaline Local não recebe comandos abertos da internet.
A ponte usa inbox/envelopes/revisão.
Nada vindo da nuvem entra no Jardim automaticamente.
```

Em outras palavras: a nuvem nunca escreve diretamente em `registro_vivo`,
`jardim_memorias`, `sedimentos` ou `decisoes`. Ela só serve um **snapshot** que a Kaline
Local busca por conta própria; o conteúdo só entra como **envelope** na inbox local, que
fica pendente até revisão explícita da pessoa.

## Fluxo real (Olhar de Kairós)

```txt
Totalidade (Worker)                 Kaline Local
GET /api/bridge/olhar-de-kairos  ←  POST /bridge/pull (disparado pela pessoa)
  monta snapshot (contexto,            valida modo pull_only
  identidade, sedimentação,            faz o GET, decifra
  reuniões, últimas 25 msgs)           grava 1 evento por seção em inbox_events
  cifra com chave compartilhada        (trust_level='untrusted', status='pending')
        ↓                                       ↓
   resposta cifrada                    revisão explícita via GET/PATCH /inbox
```

1. **Totalidade (nuvem)** — `GET /api/bridge/olhar-de-kairos`
   (`src/routes/api/bridge/olhar-de-kairos.ts`) exige bearer token de uma sessão Supabase
   válida, monta um snapshot fixo (contexto vivo, identidade ativa, sedimentação, últimas
   reuniões transcritas, últimas 25 mensagens) e cifra com AES-256-GCM usando
   `KALINE_BRIDGE_SHARED_KEY`. Sem rede com o estado de "o que falta enviar" — cada
   chamada recalcula o snapshot atual do zero.
2. **Kaline Local** — `POST /bridge/pull` (`local-server/src/routes/bridge.ts`) só roda
   quando `KALINE_TUNNEL_MODE=pull_only`. Chama o endpoint acima com
   `KALINE_BRIDGE_USER_TOKEN`, decifra a resposta com `KALINE_BRIDGE_SHARED_KEY`
   (`local-server/src/services/kairos-crypto.ts`) e deposita cada seção do snapshot como
   um evento separado em `inbox_events`, sempre `trust_level='untrusted'` e
   `status='pending'` (`local-server/src/services/kairos-bridge.service.ts`).
3. **Revisão explícita** — a pessoa usa `GET /inbox` e `PATCH /inbox/:id` para aceitar ou
   descartar cada evento. Nada é processado sozinho.
4. **Registro/Jardim somente com confirmação** — gerar uma entrada real em Registro Vivo,
   Jardim ou Sedimentos a partir de um evento aceito continua sendo trabalho de um PR
   futuro (a UI de revisão também).

`POST /bridge/pull` é sempre disparado pela pessoa (ou por automação local explícita) —
não há polling automático embutido nesta fase.

## Configuração

```env
# Totalidade (.env da raiz, lado nuvem)
KALINE_BRIDGE_SHARED_KEY=

# local-server/.env (lado local)
KALINE_TUNNEL_MODE=disabled          # mude para pull_only para habilitar o pull
KALINE_DEVICE_ID=
KALINE_CLOUD_BRIDGE_URL=             # ex.: https://totalidade.tonyus.dev
KALINE_BRIDGE_PUBLIC_KEY=            # reservado para assinatura futura, ainda não usado
KALINE_BRIDGE_SHARED_KEY=            # idêntica à da Totalidade
KALINE_BRIDGE_USER_TOKEN=            # token de sessão (bearer) da sua conta na Totalidade
```

### Pareamento sem configuração manual

`KALINE_BRIDGE_SHARED_KEY` não precisa ser inventada por quem instala a Kaline
Local. Se a env var ficar em branco, o `local-server` (`src/config.ts`) gera
uma chave forte (`crypto.randomBytes(32)`) no primeiro start, persiste em
`local-server/data/bridge-shared-key.txt` (estável entre reinícios) e imprime
um banner único no console com o valor a copiar para o lado online. Quem já
tem uma chave (de uma instalação anterior, ou compartilhando entre devices)
continua podendo preencher `KALINE_BRIDGE_SHARED_KEY` manualmente — nesse caso
o valor do ambiente sempre tem prioridade e nada é gerado.

Modos de `KALINE_TUNNEL_MODE`:

- `disabled` — padrão. Nenhuma comunicação com a nuvem.
- `pull_only` — **implementado**. `POST /bridge/olhar-de-kairos/pull-online` puxa o Olhar de
  Kairós da nuvem sob demanda (alias deprecado: `POST /bridge/pull`).
- `manual_import` — (futuro) importação manual de arquivo/envelope exportado da
  Totalidade, sem qualquer conexão de rede.

## Sentido inverso — snapshot local cifrado (offline → online)

`GET /bridge/olhar-de-kairos/local-snapshot` serve um retrato LOCAL cifrado (AES-256-GCM,
mesmo envelope `{ v, iv, data }`) para o app online puxar **client-side** — o Worker da
nuvem não acessa o `127.0.0.1` do usuário. Exige `KALINE_BRIDGE_SHARED_KEY` e a origem
online em `KALINE_CORS_ALLOWED_ORIGINS`. O snapshot segue o schema versionado
`olhar-de-kairos.snapshot.v1` (`local-server/src/services/kairos-snapshot.ts`): identidade,
últimas 25 mensagens, reuniões transcritas, registro vivo, sedimentos, decisões, com
`limits`, `createdAt/expiresAt`, `deviceId` e `integrity.hash` (sha256). Nunca inclui
segredos, tokens nem áudio cru. No lado online ele entra como **pendente/revisável**.

Exemplo de consumo para o repo online:
`docs/offline/examples/totalidade/buscar-do-offline.example.tsx`.

## Ações rápidas no PWA (Falar / Reunião)

O PWA expõe duas ações rápidas (rotas `/falar` e `/reuniao-rapida`, mais a `/janelinha`
que o companion nativo do PR 2 vai embrulhar):

- **Falar com Kaline**: liga o microfone sob demanda, transcreve (Whisper), manda pro chat
  local e fala a resposta com a voz **Dora** (Kokoro, `pf_dora`) via `POST /tts/speak`;
  se o Kokoro estiver indisponível, cai para a voz do navegador (`speechSynthesis`).
- **Gravar reunião**: grava **só microfone** (áudio interno do sistema fica para o
  companion nativo do PR 2), transcreve e grava em `inbox_events` como `meeting_transcript`
  (`trust_level='untrusted'`, `status='pending'`) — revisável, nunca aplicado sozinho.

`GET /bridge/status` agora inclui um bloco `kairos` com `lastPullAt`/`lastPullStatus` além
de `lastCloudCheckAt`/`lastError`.

## Companion nativo (PR 2) — `apps/kaline-desktop`

Casca Tauri fina (Rust), sem lógica própria, que só abre janelas apontando para a Kaline
Offline já em execução. Dois lançadores no menu de aplicativos do Linux (não na barra):

- **K∧LINE** — janela normal com o app completo (`/chat`).
- **Janelinha da Kaline** — janela pequena, sem decoração, *always-on-top*, carregando a
  rota `/janelinha` (KITT pulsando + botões de falar/gravar, já testável como rota web).

Detalhes de build/instalação (Linux verificado neste repo; Windows documentado, não
verificado) em `apps/kaline-desktop/README.md`.

## `GET /bridge/status`

```json
{
  "ok": true,
  "mode": "pull_only",
  "deviceIdConfigured": true,
  "cloudBridgeConfigured": true,
  "bridgePublicKeyConfigured": false,
  "bridgeSharedKeyConfigured": true,
  "lastCloudCheckAt": "2026-06-27T12:00:00.000Z",
  "lastError": null,
  "message": "Olhar de Kairós configurado. Use POST /bridge/pull para puxar o snapshot sob demanda."
}
```

`lastCloudCheckAt` e `lastError` agora refletem a última tentativa real de pull (sucesso
ou erro) — não são mais fixos em `null`.

## `inbox_events`

Schema inalterado (`local-server/src/db/schema.sql`). O Olhar de Kairós usa exatamente o
que já existia: `trust_level` em `untrusted` para tudo que vier da nuvem,
`status='pending'` até revisão.

## O que continua como pendência real para PR futuro

- UI de revisão de inbox (lista de eventos pendentes, aceitar/descartar).
- Assinatura/verificação criptográfica do snapshot via `bridgePublicKey` (hoje a
  confidencialidade vem de AES-GCM com chave compartilhada; não há verificação de
  autenticidade do device de origem além do bearer token da sessão).
- Geração de entrada real em Registro Vivo/Jardim/Sedimentos a partir de evento aceito.
- `manual_import`.
- Qualquer forma de sync incremental, fila ou push — fora de escopo por decisão
  deliberada, não por falta de tempo. O Olhar de Kairós é, por design, um pull único de
  snapshot — não deve evoluir para um mecanismo de sincronização genérico.
