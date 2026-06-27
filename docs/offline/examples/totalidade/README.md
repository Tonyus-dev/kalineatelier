# Exemplos para o repo online (Totalidade)

Estes arquivos são **referência**, não código vivo deste repositório (que é a Kaline
Offline). Eles documentam o que portar para o repositório separado do app online.

Os repositórios continuam **desacoplados**: sem submódulo Git, sem importar código de um
no outro, sem build conjunto. A conexão acontece só por contrato HTTP configurável.

## Arquivos

- **`buscar-do-offline.example.tsx`** — componente de referência para a ação "Buscar do
  Offline" no app online. Faz `GET http://127.0.0.1:64113/bridge/olhar-de-kairos/local-snapshot`
  **client-side** (o Worker da nuvem não acessa o 127.0.0.1 do usuário), decifra o envelope
  AES-256-GCM com a `KALINE_BRIDGE_SHARED_KEY` compartilhada e trata o resultado como
  **pendente/revisável** — nunca aplicado automaticamente.

## Configuração necessária

No app online:

```env
VITE_KALINE_OFFLINE_LOCAL_URL=http://127.0.0.1:64113
KALINE_BRIDGE_SHARED_KEY=<a mesma chave do local-server>
```

No local-server (Kaline Offline), liberar a origem do app online para o CORS/preflight:

```env
KALINE_CORS_ALLOWED_ORIGINS=http://localhost:5173,https://totalidade.tonyus.dev
```

`@fastify/cors` já responde o `OPTIONS` (preflight) automaticamente para as origens
listadas. Se a origem não estiver na lista, o navegador bloqueia — e o exemplo trata isso
com mensagem amigável.

## Endpoint online (sentido inverso)

O endpoint `GET /api/bridge/olhar-de-kairos` que o app online expõe para a Kaline Offline
puxar continua descrito no prompt `../../OLHAR_DE_KAIROS_PROMPT_TOTALIDADE.md`.
