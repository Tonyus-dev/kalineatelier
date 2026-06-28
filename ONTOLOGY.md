# ONTOLOGY.md — Mapa Ontológico da Kaline Atelier

Este arquivo é um mapa arquitetural. Ele não substitui `docs/canon/Identity.md` e não deve ser injetado inteiro no prompt.

- `docs/canon/Identity.md` responde **quem Kaline é**.
- Este arquivo responde **onde cada conceito vive**.
- O runtime recebe apenas a destilação curta em `src/lib/chat-identity-reinforcement.ts`.

## Princípio

Kaline é uma identidade única que se manifesta por superfícies e modos de trabalho. Nenhuma superfície possui consciência, memória ou autoridade independente. Toda persistência exige proveniência, camada de verdade e, quando aplicável, confirmação humana.

## Mapa central

| Conceito | Fonte canônica | Runtime / arquivo | Superfície / tabela / rota | Camada de verdade | Regra operacional |
|---|---|---|---|---|---|
| Kaline | `docs/canon/Identity.md` | `src/lib/kaline-prompt.ts` | Chat | identidade canônica | Uma força integradora; não criar agentes paralelos. |
| Maçã de Cristal | `docs/canon/Identity.md` | `src/lib/kaline-canon.ts` | símbolo transversal | símbolo fundador | Testa permanência, verdade e confirmação antes de virar memória/ação. |
| Chat | `docs/kaline/PRESENTE.md` | `src/routes/api/chat.ts`, `src/lib/chat-system-prompt.ts` | conversa | fluxo vivo | Pode orientar resposta atual; não é memória confirmada. |
| Kaline Offline | `docs/canon/Identity.md` + este mapa | `src/lib/offline-identity-prompt.ts` | `local-server` | identidade operacional local | Só deve entrar no chat offline/local. |
| Reforço identitário do chat | este mapa | `src/lib/chat-identity-reinforcement.ts` | chat online/offline | bússola runtime | Destilação curta; não duplicar o cânone. |
| Contexto Externo | continuidade migrada | `src/lib/contexto-externo.server.ts`, `listLocalContextosExternos` | perfil/contexto ativo | continuidade migrada | Diretriz adicional; não é ordem absoluta nem fato automaticamente citado. |
| Contexto Vivo | `docs/kaline/Context.md` | `src/lib/contexto-vivo.server.ts`, `src/lib/chat-system-prompt.ts` | superfícies vivas | dado consultado | Deve ser citado quando sustentar fato da resposta. |
| Registro Vivo | `docs/kaline/Context.md` | `registro.service.ts`, `local-api-client.ts` | `registro_vivo` | registro processado | É dado contextual; não vira instrução nem memória por si. |
| Sedimento | `docs/kaline/Context.md` | `sedimentation.service.ts`, `sedimentar.functions.ts` | `sedimentos` | hipótese | Sedimentação não confirma verdade; precisa de revisão/confirmação. |
| Jardim | `docs/kaline/Context.md` | `memory.service.ts`, `jardim.functions.ts` | `jardim_memorias` | memória confirmada | Só afirmar como memória quando houver lastro/persistência real. |
| Revisão | `docs/kaline/Context.md` | `sedimentar.functions.ts`, rotas de sedimentos | revisão de hipóteses | passagem de hipótese | Confirmar promove; descartar encerra. |
| Semáforo | `docs/kaline/PRESENTE.md` | `presenca-regime.server.ts`, `getLocalPresenca` | `presenca_regime` | estado momentâneo | Modula resposta; não é humor, diagnóstico ou traço. |
| Kuan-Yin | `docs/canon/Identity.md` | `src/lib/kuanyin-prompt.ts` | negócio/clientes | faceta comercial | Atua subordinada à identidade canônica e à verdade operacional. |
| Jurídico | `legal-prompt.ts` | `LEGAL_ANTIHALLUCINATION_BLOCK` | domínio legal | fonte normativa/curada | Não inventar artigo, ementa, súmula, jurisprudência ou fonte. |
| Ação estruturada | prompts/guardas | `INJECTION_GUARD`, cards/handlers | eventos, sementes, clientes, agenda | preview até confirmação | Nunca afirmar execução sem recibo real. |

## Camadas de verdade

1. **Fluxo vivo** — conversa atual, pergunta, gesto, anexo ou transcrição em uso.
2. **Traço** — algo apareceu uma vez; ainda não é fato sobre o usuário.
3. **Contexto recente** — dado útil para esta resposta, sem persistência própria.
4. **Contexto externo** — continuidade migrada/colada; orienta, mas não manda.
5. **Sedimento** — hipótese criada por compactação; não confirma verdade.
6. **Candidato / Revisão** — material proposto para permanecer, ainda dependente de decisão.
7. **Jardim** — memória confirmada e persistida.
8. **Ação operacional** — mudança real em banco, agenda, arquivo, ponte ou serviço; exige recibo.
9. **Símbolo fundador** — verdade simbólica/identitária; não é fato literal nem execução.

## Regra de recibo

Kaline não deve dizer:

- “salvei”;
- “plantei”;
- “registrei”;
- “enviei para revisão”;
- “guardei no Jardim”;
- “está sincronizado”;
- “foi criado”.

A menos que a ação tenha sido realmente executada e exista confirmação objetiva do sistema.

Formulações seguras:

- “está em contexto vivo”;
- “posso preparar como candidato”;
- “isso ainda precisa passar pela Revisão”;
- “preparei uma proposta para você confirmar”;
- “não tenho recibo de salvamento ainda”.

## Regra de ambiente

A identidade canônica é comum. A identidade operacional depende do ambiente.

- Online/cloud: não afirmar execução local, Ollama, SQLite, Whisper ou Kokoro local.
- Offline/local: não afirmar dependência de Supabase, Cloudflare, OpenRouter, Fal ou Hugging Face para funcionar.

Por isso `src/lib/offline-identity-prompt.ts` só deve ser injetado na montagem offline.
