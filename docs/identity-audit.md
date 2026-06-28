# Auditoria identitária da Kaline Atelier

Saneamento e reforço de identidade da Kaline no app local/offline — **otimizar antes de encher**.
Sem identidade nova, sem duplicação do cânone, sem misturar identidade operacional offline com o prompt comum do chat. Atualizado em 2026-06-28.

## Fontes ativas

| Fonte | Tipo | Status | Função |
|---|---|---|---|
| `docs/canon/Identity.md` | Doc canônico (V23) | Ativo (primária) | Define a totalidade Kaline e as cinco facetas |
| `ONTOLOGY.md` | Mapa arquitetural | Ativo | Mapeia conceitos, superfícies, camadas de verdade e regras de persistência |
| `docs/kaline/Identity.md` | Ponteiro | Ativo | Stub que redireciona para a fonte única `docs/canon/Identity.md` |
| `docs/kaline/LIBERTY.md` | Doc canônico | Ativo | Liberdade: pensar livre, executar com recibo (Klio) |
| `docs/kaline/PRESENTE.md` | Doc canônico | Ativo | Presença: estar sem enganar (Kháris) |
| `docs/kaline/Context.md` | Doc canônico | Ativo | Contexto e sedimentação (Kairós) |
| `src/lib/kaline-canon.ts` | Runtime | Ativo | Destilação do Identity.md (`KALINE_CANON_BLOCK`) |
| `src/lib/kaline-prompt.ts` | Runtime | Ativo | System prompt comum da presença geral; não contém identidade operacional offline |
| `src/lib/offline-identity-prompt.ts` | Runtime offline | Ativo | Identidade operacional exclusiva da Kaline Offline/local |
| `src/lib/chat-identity-reinforcement.ts` | Runtime compartilhado | Ativo | Bússola curta que amarra o chat a `Identity.md` e `ONTOLOGY.md` |
| `src/lib/kharis-prompt.ts` | Runtime | Ativo | System prompt do cuidado (neurodivergência) |
| `src/lib/kuanyin-prompt.ts` | Runtime | Ativo | Bloco da faceta comercial Kuan-Yin |
| `src/lib/legal-prompt.ts` | Runtime | Ativo | Bloco anti-alucinação jurídica |
| `src/lib/prompt-shared-blocks.ts` | Runtime compartilhado | Ativo | Blocos compartilhados (LIBERTY) — não é fonte de verdade |
| `src/lib/contexto-externo.server.ts` | Runtime | Ativo | Lê continuidade/memória migrada |
| `src/lib/contexto-vivo.server.ts` | Runtime | Ativo | Leitura transversal de superfícies vivas |
| `src/lib/chat-system-prompt.ts` | Runtime offline | Ativo | Monta o system prompt offline com contexto local, reforço ontológico e identidade operacional local |
| `src/routes/api/chat.ts` | Runtime online | Ativo | Monta o system prompt online com reforço ontológico, sem identidade offline |
| `src/lib/presenca-regime.server.ts` | Runtime | Ativo | Semáforo de presença (verde/amarelo/azul/vermelho) |
| `src/lib/sedimentar.functions.ts` | Runtime | Ativo | Pipeline de sedimentação |

## Reforço identitário no chat

Foi criado `src/lib/chat-identity-reinforcement.ts` como bloco runtime curto para amarrar o chat a `docs/canon/Identity.md` e `ONTOLOGY.md`.

Status:

- `Identity.md` permanece fonte canônica.
- `ONTOLOGY.md` é mapa arquitetural, não prompt bruto.
- O chat recebe apenas a destilação curta.
- Não houve duplicação de identidade.
- O chat online recebe o reforço sem identidade operacional offline.
- O chat offline recebe o reforço e, separadamente, `KALINE_OFFLINE_RUNTIME_BLOCK`.

## Separação online/offline

A identidade canônica é comum; a identidade operacional é contextual.

| Ambiente | Arquivo aplicado | Regra |
|---|---|---|
| Online/cloud | `KALINE_SYSTEM_PROMPT` + `CHAT_IDENTITY_REINFORCEMENT_BLOCK` | Não afirmar que roda via Ollama, SQLite, Whisper local ou Kokoro local |
| Offline/local | `KALINE_SYSTEM_PROMPT` + `KALINE_OFFLINE_RUNTIME_BLOCK` + `CHAT_IDENTITY_REINFORCEMENT_BLOCK` | Não afirmar dependência de Supabase, Cloudflare, OpenRouter, Fal ou Hugging Face |

## Correções de contexto local

`src/lib/chat-system-prompt.ts` passou a aceitar os nomes reais vindos do local-server:

| Superfície | Antes | Agora |
|---|---|---|
| Jardim | `next_review_at` | `next_review_at` ou `due_at` |
| Registro Vivo | `body` | `body` ou `content` |
| Sedimentos | `nivel` | `nivel` ou `level` |
| Sedimentos | `resumo` / `hipotese` | `resumo` / `hipotese` / `content` |

## Referências citadas mas ausentes

| Referência | Onde aparece | Decisão |
|---|---|---|
| `Naturality.md` (Khora) | `Identity.md` | Não é arquivo; princípio incorporado aos blocos FORMATO/VOZ de `src/lib/kaline-prompt.ts` |
| `docs/mente.md` (Kuan-Yin) | `Identity.md` | Não é arquivo; direção comercial incorporada em `src/lib/kuanyin-prompt.ts` |
| `LIBERTY.md` / `PRESENTE.md` / `Context.md` sem path | `Identity.md` e comentários de prompt | Resolvido — existem em `docs/kaline/`; paths corrigidos para rastreabilidade |

## Duplicações encontradas

| Regra / bloco | Arquivos | Decisão |
|---|---|---|
| Bloco `=== LIBERDADE (LIBERTY.md) ===` | `kaline-prompt.ts`, `kharis-prompt.ts` | Extraído para `LIBERTY_RUNTIME_BLOCK` em `src/lib/prompt-shared-blocks.ts` |
| `Identity.md` duplicado integralmente | `docs/canon/Identity.md` = `docs/kaline/Identity.md` | Resolvido — fonte única eleita: `docs/canon/Identity.md`; espelho convertido em ponteiro |
| Identidade operacional offline | antes em `kaline-prompt.ts` | Resolvido — extraída para `src/lib/offline-identity-prompt.ts` |
| Camadas de verdade / PRESENÇA / REGRA DE OURO | `kaline-prompt.ts`, `kharis-prompt.ts` | Mantido por nuance de faceta |

## Nomes legados

| Nome | Onde aparece | Decisão |
|---|---|---|
| Kaline | Tudo | Ativo — identidade central |
| Klio | sala de estudo / registro acadêmico | Ativo como dimensão e registro acadêmico absorvido pela Kaline |
| Kháris | cuidado / presença | Ativo como dimensão de cuidado; pode existir como superfície de cuidado conforme UI atual |
| Khora | fala natural / gesto | Ativo como dimensão interna; sem enum separado |
| Kairós | contexto / passagem | Ativo como dimensão interna; sem enum separado |
| Kuan-Yin | comércio | Ativo — faceta comercial da Kaline, não entidade separada |
| Kalisto | migrações históricas | Legado migrado — não tocar nas migrações históricas |
| `clio` | enum histórico | Removido/legado conforme migração anterior |

## Riscos restantes

- Criar testes automatizados para garantir que `KALINE_OFFLINE_RUNTIME_BLOCK` nunca entra no chat online.
- Criar teste para o Teste da Maçã como failsafe determinístico, caso esse comportamento deixe de depender só do prompt.
- Reavaliar extração futura de camadas de verdade se `kaline-prompt.ts` e `kharis-prompt.ts` convergirem ainda mais.
