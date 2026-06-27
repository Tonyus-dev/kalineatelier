# Prompt para implementar o Olhar de Kairós no repo Totalidade (app online)

Use o texto abaixo como prompt para a Claude Code (ou outro agente) rodando no
repositório do **app online de produção** (Tonyus-dev/totalidade ou equivalente),
não neste repo (`kalineatelier`, que está sendo adaptado para virar a Kaline
Offline). A implementação de referência já existe em `kalineatelier` (PR #9) —
este prompt descreve exatamente o que portar.

---

## Prompt (copiar a partir daqui)

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

## Fim do prompt

Depois de implementar isso no repo online, o fluxo completo funciona assim:

```
Kaline Offline (sua máquina)        App online (Totalidade, outro repo)
POST /bridge/pull        ──────►    (não existe ainda; é o repo online quem
  (já implementado em                serve o GET abaixo)
  kalineatelier/local-server)
                          ◄──────    GET /api/bridge/olhar-de-kairos
                                       (a implementar, conforme prompt acima)
```

`KALINE_BRIDGE_SHARED_KEY` precisa ser **idêntica** nos dois lados (configurada
como secret no app online e em `local-server/.env` na Kaline Offline) para que
a decifragem funcione.
