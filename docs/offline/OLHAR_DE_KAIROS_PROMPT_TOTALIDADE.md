# Prompt para implementar o Olhar de Kairós no repo Totalidade (app online)

Use o texto abaixo como prompt para a Claude Code (ou outro agente) rodando no
repositório do **app online de produção** (Tonyus-dev/totalidade ou equivalente),
não neste repo (`kalineatelier`, que está sendo adaptado para virar a Kaline
Offline). A implementação de referência já existe em `kalineatelier` (PR #9) —
este prompt descreve exatamente o que portar.

---

## Prompt (copiar a partir daqui)

### ⛔ IMPERATIVO — SIGA ESTE CONTRATO IPSIS LITTERIS

Este prompt define um **contrato de interoperabilidade** com a Kaline Offline, que já
está implementada e em produção do outro lado. Você **DEVE** segui-lo à letra. Você
**NÃO TEM AUTORIDADE** para "melhorar", generalizar, renomear ou inventar variações.

Regras absolutas (qualquer desvio QUEBRA a compatibilidade e é considerado erro):

1. **Path exato**: o endpoint é `GET /api/bridge/olhar-de-kairos`. Não mude o caminho,
   não pluralize, não versione na URL, não adicione query params.
2. **Envelope exato**: a resposta é **exatamente** `{ "v": 1, "iv": <base64>, "data": <base64> }`.
   Nada de campos extras, nada de outro formato, nada de wrapper.
3. **Cripto exata**: AES-256-GCM, IV de 12 bytes, chave derivada por **SHA-256 do
   `KALINE_BRIDGE_SHARED_KEY`**. Não troque o algoritmo, o tamanho do IV nem o método de
   derivação. O lado offline decifra com exatamente isso; qualquer mudança torna o
   conteúdo ilegível.
4. **Somente leitura, um único GET**: sem fila, sem cursor, sem incremental, sem retry no
   servidor, sem endpoint de escrita (`POST`) que aceite envelopes de volta. Sem push.
5. **Sem funções não previstas**: NÃO crie rotas, tabelas, parâmetros, modos ou
   "extensões" que não estejam descritos aqui. Se algo parecer faltar, **pare e pergunte
   ao usuário** — não improvise. Uma função inventada que o lado offline não conhece é,
   por definição, incompatível.
6. **Sem efeitos colaterais**: o handler não escreve nada no banco, não dispara jobs, não
   muda estado. Só lê, monta o snapshot, cifra e responde.

Se você se pegar pensando "seria mais eficiente/elegante fazer diferente" — **não faça**.
A eficiência aqui é secundária à compatibilidade exata com o contrato. Implemente o que
está escrito, exatamente como está escrito.

---

Implemente o "Olhar de Kairós": um endpoint único, cifrado, de leitura, que a
Kaline Offline (app local, repositório separado) vai puxar sob demanda para
sincronizar um snapshot consolidado do usuário. **Não é um mecanismo de sync
genérico** — é deliberadamente um único GET, sem fila, sem cursor de
sincronização, sem retry automático, sem push em nenhuma direção. Não aceite
parâmetros de tipo/origem, não escreva nada no banco, não receba envelopes de
volta.

### 1. Variável de ambiente nova

Adicione `KALINE_BRIDGE_SHARED_KEY` (string secreta) à configuração do projeto
(`.env.example` e onde quer que as outras chaves de servidor — Supabase,
OpenRouter — já estejam documentadas). Essa chave precisa ser idêntica à que
será configurada no `local-server/.env` da Kaline Offline. Configure-a também
como secret real no ambiente de deploy (ex.: `wrangler secret put
KALINE_BRIDGE_SHARED_KEY` se for Cloudflare Workers).

### 2. Helper de criptografia — AES-256-GCM via Web Crypto

Crie um módulo (ex.: `src/lib/kairos-crypto.server.ts`, ajuste o caminho ao
padrão do repo) com:

```typescript
// Criptografia do "Olhar de Kairós" — AES-256-GCM via Web Crypto.
// Escopo deliberadamente mínimo: cifra um único payload (o snapshot), nada de
// chaveamento por sessão, rotação automática ou sync genérico. A chave é derivada
// por SHA-256 de um segredo compartilhado configurado nos dois lados (nuvem e local).

async function deriveKey(sharedSecret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(sharedSecret);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export type KairosEnvelope = { v: 1; iv: string; data: string };

export async function encryptKairosSnapshot(
  sharedSecret: string,
  payload: unknown,
): Promise<KairosEnvelope> {
  const key = await deriveKey(sharedSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    v: 1,
    iv: Buffer.from(iv).toString("base64"),
    data: Buffer.from(ciphertext).toString("base64"),
  };
}
```

Use a Web Crypto global (`crypto.subtle`) — se o runtime for Node puro em vez
de Cloudflare Workers/browser-like, troque por `import { webcrypto } from
"node:crypto"` e use `webcrypto.subtle` no lugar de `crypto.subtle`. Se o
runtime for Cloudflare Workers, confirme que `nodejs_compat` está habilitado
(necessário para `Buffer`).

### 3. Endpoint `GET /api/bridge/olhar-de-kairos`

Crie a rota seguindo o padrão de rotas autenticadas já existente no repo (bearer
token de sessão do seu provedor de auth — adapte ao que o repo já usa, ex.:
Supabase, outro). Pseudocódigo do fluxo (adapte nomes de tabelas/colunas e ao
ORM/cliente de banco real do projeto):

```typescript
// GET /api/bridge/olhar-de-kairos — snapshot único e cifrado para a Kaline Offline puxar.
//
// Escopo deliberado: leitura-only, um único GET, sem fila, sem cursor de
// sincronização. NÃO é um mecanismo de sync genérico — não aceita parâmetros de
// tipo/origem, não escreve nada, não recebe envelopes de volta.

const MAX_MENSAGENS = 25;
const MAX_REUNIOES = 5;
const MAX_IDENTIDADE = 5;
const MAX_SEDIMENTOS = 20;
const MAX_TRANSCRICAO_CHARS = 4000;

// GET handler:
// 1. Extrair bearer token do header Authorization; 401 se ausente/inválido.
// 2. Validar a sessão do usuário (mesmo padrão de auth já usado nas outras rotas autenticadas do repo).
// 3. Rate limit por usuário (reaproveite o helper de rate limit já existente, se houver).
// 4. Ler KALINE_BRIDGE_SHARED_KEY do ambiente; se ausente, responder 503
//    { error: "misconfigured", message: "KALINE_BRIDGE_SHARED_KEY não está configurada neste deployment." }.
// 5. Montar o snapshot consolidado do usuário autenticado:
//    - contexto atual/vivo (o que já existir de "estado atual" no domínio do app)
//    - identidade ativa (últimos registros marcados como ativos, limit MAX_IDENTIDADE)
//    - sedimentação (últimos registros de sedimentos, limit MAX_SEDIMENTOS)
//    - reuniões transcritas (últimas, limit MAX_REUNIOES, truncando transcrição em MAX_TRANSCRICAO_CHARS)
//    - últimas MAX_MENSAGENS mensagens de chat (ordenadas cronologicamente)
// 6. Cifrar o snapshot inteiro com encryptKairosSnapshot(sharedSecret, snapshot).
// 7. Responder 200 com o envelope JSON { v, iv, data }, headers
//    content-type: application/json; charset=utf-8 e cache-control: no-store.
```

Referência completa e já testada (pode copiar e adaptar nomes de tabela/ORM):
veja `src/routes/api/bridge/olhar-de-kairos.ts` no repo `kalineatelier`
(branch `claude/olhar-de-kairos-bridge`, PR #9) — a lógica de queries,
montagem do snapshot e resposta está lá linha a linha.

### 4. Documentação

Adicione uma seção curta no README ou docs do repo explicando o que é o Olhar
de Kairós, citando a regra central: *"O app online nunca recebe comandos
abertos da Kaline Offline. O app online só serve um snapshot cifrado; quem
puxa, decifra e decide o que revisar é sempre o lado local."*

### Restrição inegociável

Não implemente nada além deste único GET: sem fila de eventos, sem cursor de
sincronização incremental, sem retry automático embutido no servidor, sem
endpoint de escrita correspondente (`POST` que aceite envelopes da Kaline
Offline). Se em algum momento parecer que "seria mais eficiente" generalizar
isso em um mecanismo de sync — não faça. Essa restrição foi pedida
explicitamente pelo usuário e deve ser respeitada à risca.

---

### 5. (Opcional) Ação "Buscar do Offline" — sentido inverso

Além do GET acima (online → offline), o app online pode oferecer uma ação **"Buscar do
Offline"**, que puxa um snapshot LOCAL da Kaline Offline. Regras desta parte (também
ipsis litteris):

- A chamada é **client-side** (no navegador), nunca no Worker/servidor: o Worker da nuvem
  **não** acessa o `127.0.0.1` da máquina do usuário.
- Endpoint a consumir (já existe no local-server): `GET {VITE_KALINE_OFFLINE_LOCAL_URL}/bridge/olhar-de-kairos/local-snapshot`,
  default `http://127.0.0.1:64113`. A resposta é o mesmo envelope `{ v, iv, data }`,
  decifrável com a mesma `KALINE_BRIDGE_SHARED_KEY`.
- O snapshot recebido entra como **pendente/revisável** no lado online — nunca aplicado
  automaticamente.
- Trate CORS/preflight/falha amigável: se a API local não responder ou o CORS bloquear,
  mostre mensagem clara, não trave.
- Adicione `VITE_KALINE_OFFLINE_LOCAL_URL` (default `http://127.0.0.1:64113`) ao
  `.env.example` do app online.

Componente de referência pronto: `docs/offline/examples/totalidade/buscar-do-offline.example.tsx`
neste repo (kalineatelier). O snapshot local segue o schema versionado
`olhar-de-kairos.snapshot.v1` (campos: `schema`, `origin`, `deviceId`, `createdAt`,
`expiresAt`, `summary`, `identity`, `calendar`, `meetings`, `chat`, `memory`, `limits`,
`integrity.hash`). Não invente campos novos; trate campos ausentes como vazios.

### 6. CORS no local-server (já existe; só configurar)

Para o "Buscar do Offline" funcionar, a origem do app online precisa estar em
`KALINE_CORS_ALLOWED_ORIGINS` no `local-server/.env` da Kaline Offline (o `@fastify/cors`
já responde o `OPTIONS`/preflight). Isso é configuração do lado offline — você não mexe
nisso no repo online, apenas documente para o usuário.

## Fim do prompt

Depois de implementar isso no repo online, o fluxo completo funciona assim:

```
Kaline Offline (sua máquina)              App online (Totalidade, outro repo)
POST /bridge/olhar-de-kairos/pull-online  (é o repo online quem serve o GET abaixo)
  (já implementado em kalineatelier  ──►  GET /api/bridge/olhar-de-kairos
   /local-server)                           (a implementar, conforme prompt acima)

GET /bridge/olhar-de-kairos/local-snapshot ◄── "Buscar do Offline" (client-side, opcional)
  (já implementado no local-server)            no app online
```

`KALINE_BRIDGE_SHARED_KEY` precisa ser **idêntica** nos dois lados (configurada
como secret no app online e em `local-server/.env` na Kaline Offline) para que
a decifragem funcione.
