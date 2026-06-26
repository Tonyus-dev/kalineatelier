# Escopo da Kaline Offline — PR 4 (otimização estrutural)

Este documento registra a poda estrutural feita no PR 4: **"Otimizar antes de encher. Uma
Kaline. Um núcleo. Sem comércio. Sem chats paralelos. Sem módulos mortos."**

Nada foi adicionado neste PR (sem modelos, sem IA nova, sem túnel, sem Whisper/Kokoro).
O trabalho foi remover da navegação/rotas/dashboard tudo que é comércio, chat paralelo ou
módulo morto, mantendo o restante intacto e o build verde.

## Mantidos (núcleo da Kaline Offline)

Nav/rotas/dashboard finais: Home, Facetas (mapa identitário, não seletor de bots), Chat
Kaline (`/chat`, único chat ativo), Registro Vivo, Jardim, Revisão (inclui sedimentação —
`src/lib/sedimentar.functions.ts` intocado), Klio — Estudos (nunca se torna chat paralelo;
o card de estudo "OAB/Jurídico" dentro de Klio é mantido como conteúdo de estudo geral,
desacoplado dos módulos dedicados de Jurisprudência/Legislação que foram removidos), Agenda,
Câmara de Eco, Livros & Resumos, Meu Perfil (inclui o estado de treino embutido em
`src/features/treinos/storage.ts` + `types.ts` + `data.ts`, que não pertence ao módulo
Treinos dedicado).

Infra compartilhada mantida por compatibilidade técnica (sem nav própria, ainda usada por
código vivo): `ChatView.tsx`, `ensure-thread.ts`, `chat.index.tsx`, `kharis-prompt.ts` e
`kuanyin-prompt.ts` (usados por `src/routes/api/chat.ts` e `identidade.tsx`),
`KuanyinActionCard.tsx` (renderizado dentro do `ChatView` apenas quando `facet === "kuanyin"`,
hoje inacessível na prática por falta de entrada de nav, mas não apagado),
`src/lib/kuanyin.functions.ts` (usado por `KuanyinActionCard.tsx`) e
`src/lib/kuanyin-integrity.ts` (usado por `api/chat.ts` e seu teste).

## Removidos da Offline (apagados — rota + lib órfã confirmada sem importadores)

- **Comércio de Kuan-Yin**: grupo de sidebar "Comércio · Kuan-Yin"; rota `kuan-yin.tsx` e
  todas as `kuan-yin.*.tsx` (agendamentos, clientes, config, guardioes, index, onboarding,
  pagamentos, pedidos, showroom); rotas públicas `g.$guardianId.tsx` e `portal.$token.tsx`;
  libs órfãs `src/lib/kuanyin-public.functions.ts`, `src/lib/kuanyin-portal.functions.ts`.
- **Chat Kuan-Yin e Chat Kháris**: itens `kharis`/`kuanyin` removidos do array `conversas`
  em `app-sidebar.tsx`; rota `kharis.tsx` apagada (wrapper fino de `ChatView`).
- **Treinos** (Khora dedicado): grupo "Corpo · Khora" → item Treinos; rota `treinos.tsx`;
  satélite "Khora · Treinos" no dashboard; `src/features/treinos/components/` (pasta
  completa, 10 arquivos incl. `PresenceKhora.tsx`), `use-treinos.ts`, `utils.ts`,
  `src/lib/treinos-sync.ts`.
- **Drive**: grupo "Corpo · Khora" → item Drive; rota `drive.tsx`; satélite "Kaline Drive"
  no dashboard; `src/lib/drive.functions.ts`.
- **Jurídico dedicado**: grupo "Jurídico" completo; rotas `juridico.tsx`,
  `jurisprudencia.tsx`, `legislacao.tsx`; satélite "Jurídico" no dashboard;
  `src/lib/juridico.functions.ts`; `src/lib/legal.functions.ts`. O link para `/treinos`
  e os links de rodapé para `/jurisprudencia`/`/legislacao` dentro de `klio.tsx` foram
  removidos junto (eram referências às rotas apagadas); o card de estudo "OAB" de Klio
  permaneceu, pois é conteúdo de estudo geral, não acoplado a essas libs.
- **Perfis & Convites** (admin multiusuário): item do grupo "Pessoas"; rota `perfis.tsx`;
  satélite "Perfis" no dashboard; `src/lib/perfis.ts`, `src/lib/perfis.functions.ts`,
  `src/lib/admin-import.functions.ts` (usado só por `perfis.tsx`).
- **Selo do header**: logo combinado em `app-sidebar.tsx` simplificado para mostrar apenas
  o ícone da Kaline, removendo o selo pequeno de Kháris.

## Ocultados, não apagados (compatibilidade técnica)

Nenhum arquivo de migração SQL foi apagado (ver seção de migrações abaixo) e nenhum
prompt/função/componente ainda importado por código mantido foi removido. Onde havia dúvida
entre apagar e ocultar, a navegação foi cortada e o código original permaneceu — ver "Infra
compartilhada mantida por compatibilidade técnica" acima.

## Fora da v0.1

Comércio (Kuan-Yin), chats paralelos (Kháris, Kuan-Yin), Treinos dedicado, Drive, Jurídico
dedicado (Jurisprudência/Legislação), Perfis & Convites — todos fora da experiência Kaline
Offline por enquanto. Podem retornar como produtos próprios fora deste núcleo, nunca como
parte da Offline sem decisão explícita do usuário.

## Migrações (`supabase/migrations/*.sql`) — classificação

Nenhum arquivo de migração foi apagado. São histórico já aplicado no banco; apagar o arquivo
não desfaz a tabela.

| Migração | Classificação | Nota |
|---|---|---|
| `20260101000000_baseline.sql` | NÃO MEXER | Base do schema. |
| `20260624234045_*.sql` … `20260625004647_*.sql` | NÃO MEXER | Evolução geral do schema, não ligada a áreas removidas. |
| `20260625010000_kuanyin_integrity_and_portal_fix.sql` | ARQUIVAR (pendência) | Liga-se a Kuan-Yin (portal + integridade); parte de integridade (`kuanyin-integrity.ts`) ainda é usada pelo chat online — não remover sem separar as duas preocupações. |
| `20260625013243_*.sql`, `20260625020724_*.sql` | NÃO MEXER | Schema geral. |
| `20260625030000_storage_buckets_self_host.sql` | NÃO MEXER | Infra de storage, não específica de área removida. |
| `20260625033000_kuanyin_portal_anon_hardening.sql` | ARQUIVAR (pendência) | Hardening do portal público de Kuan-Yin, removido da Offline. |
| `20260625040000_prepare_klio_facet_enum.sql`, `20260625040001_rename_kalisto_facet_to_klio.sql` | NÃO MEXER | Renomeação de faceta, Klio é mantido. |
| `20260625120000_contexto_externo_tipo.sql` | NÃO MEXER | Schema geral. |
| `20260626000000_kuanyin_guardians_public_slug.sql` | ARQUIVAR (pendência) | Guardiões públicos de Kuan-Yin, removido da Offline. |
| `20260626001000_kuanyin_guardians_admin_controls.sql` | ARQUIVAR (pendência) | Controles admin de guardiões, removido da Offline. |
| `20260626002000_kuanyin_public_chat_threads.sql` | ARQUIVAR (pendência) | Threads públicas de chat Kuan-Yin, removido da Offline. |
| `20260626003000_kuanyin_public_hardening.sql` | ARQUIVAR (pendência) | Hardening do chat público de Kuan-Yin, removido da Offline. |
| `20260626010000_rename_klio_facet_to_kharis.sql` | NÃO MEXER | Renomeação de faceta (histórico), Kháris como faceta de linguagem é referência, não chat. |
| `20260626020000_drop_clio_facet_enum_value.sql` | NÃO MEXER | Limpeza de enum, não específica de área removida. |

**Pendência técnica**: as migrações marcadas ARQUIVAR ficam como histórico aplicado; uma
futura migração de `DROP` explícita das tabelas/colunas associadas ao comércio público de
Kuan-Yin é trabalho fora de escopo deste PR e deve ser decidida e revisada separadamente,
nunca por exclusão silenciosa de arquivo de migração.

`src/integrations/supabase/types.ts` não foi alterado — é gerado a partir do schema real,
que não muda neste PR.

## Verificação

```
bun run typecheck && bun run build && bun run test && bun run lint
cd local-server && npm run build
```

Manual: clicar em cada item de nav restante e confirmar que carrega sem erro; confirmar que
nenhum item removido aparece em sidebar, dashboard ou `/atelier`; confirmar que as rotas
removidas retornam 404 (rota inexistente) em vez de quebrar a aplicação.
