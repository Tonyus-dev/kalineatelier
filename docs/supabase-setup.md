# Supabase próprio — checklist de preparação

Este projeto espera um Supabase próprio com Auth, Postgres, Storage e RLS ativos.
Não coloque secrets no frontend: a chave `SUPABASE_SERVICE_ROLE_KEY` só deve existir
em runtime server-side, como secret do Cloudflare Worker ou no ambiente local seguro.

## 1. Criar projeto

1. Crie um projeto Supabase na sua conta.
2. Copie a Project URL para `SUPABASE_URL` e `VITE_SUPABASE_URL`.
3. Copie a publishable/anon key para `SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Copie a service role key apenas para `SUPABASE_SERVICE_ROLE_KEY` no runtime server-side.

## 2. Aplicar migrations

### Via GitHub Actions (preferido)

O repositório tem dois workflows que cuidam disso automaticamente:

- **`.github/workflows/supabase-migrations-check.yml`** — roda em todo PR que toca
  `supabase/migrations/**` e faz `supabase db push --dry-run` contra o projeto remoto, sem
  aplicar nada. Pega SQL inválido ou migração fora de ordem antes do merge.
- **`.github/workflows/supabase-migrations-apply.yml`** — roda automaticamente em push para
  `main` (depois do merge) e também pode ser disparado manualmente em **Actions → Supabase
  migrations apply → Run workflow**. Aplica de verdade (`supabase db push`) as migrações que
  ainda não constam como aplicadas no projeto.

Pré-requisito único: cadastrar 3 secrets em **Settings → Secrets and variables → Actions** do
repositório:

| Secret | Onde pegar |
| - | - |
| `SUPABASE_ACCESS_TOKEN` | supabase.com/dashboard/account/tokens |
| `SUPABASE_PROJECT_REF` | Project Settings → General (ou o subdomínio da `SUPABASE_URL`, ex. `eljftgvjjeynkhijdthq`) |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database |

Sem esses secrets os dois workflows falham na etapa de link — isso é esperado até serem
configurados. Depois de configurar, dispare o workflow `apply` manualmente uma vez para aplicar
qualquer migração que já esteja pendente.

### Manual (CLI local, fallback)

Com o Supabase CLI autenticado e linkado ao projeto:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

O baseline cria tabelas, funções, triggers, grants e políticas RLS. A migration
`20260625030000_storage_buckets_self_host.sql` cria os buckets privados usados
pelo app.

### Sem acesso ao terminal

Se você não tiver acesso ao terminal, dá para aplicar pelo painel web do
Supabase:

1. Abra o projeto no Supabase.
2. Vá em **SQL Editor**.
3. Crie uma query nova.
4. Copie o conteúdo de cada arquivo em `supabase/migrations/`, em ordem
   cronológica, e clique em **Run**.
5. Não aplique arquivos de `supabase/migrations_archive/`; eles são histórico
   preservado, não a sequência ativa de provisionamento.

Para um banco que já estava atualizado antes deste ajuste, normalmente você só
precisa rodar manualmente a migration nova:

```sql
-- supabase/migrations/20260625033000_kuanyin_portal_anon_hardening.sql
DROP POLICY IF EXISTS portal_token_anon_read ON public.kuanyin_portal_tokens;
DROP POLICY IF EXISTS appointment_anon_read_via_token ON public.kuanyin_appointments;
DROP POLICY IF EXISTS order_anon_read_via_token ON public.kuanyin_orders;
DROP POLICY IF EXISTS business_context_anon_read_via_token ON public.business_contexts;

REVOKE SELECT ON public.kuanyin_portal_tokens FROM anon;
REVOKE SELECT ON public.kuanyin_appointments FROM anon;
REVOKE SELECT ON public.kuanyin_orders FROM anon;
REVOKE SELECT ON public.business_contexts FROM anon;
```

Se o projeto Supabase estiver completamente novo, o SQL Editor também funciona,
mas é mais trabalhoso: rode todos os arquivos de `supabase/migrations/` em
ordem, começando por `20260101000000_baseline.sql` e terminando pela migration
mais recente.

## 3. Papel de admin ao criar um usuário

Toda conta nova já recebe o papel `admin` automaticamente: a trigger
`on_auth_user_created` (função `handle_new_user`, criada pelo baseline) insere
uma linha em `public.user_roles` com `role = 'admin'` sempre que aparece um
INSERT em `auth.users`. Isso cobre **qualquer** caminho de criação de usuário —
o formulário `/auth` do app, o botão "Add user" do painel do Supabase, ou
`supabase.auth.admin.createUser()` — porque todos resultam nesse mesmo INSERT.

Nesse modelo, `admin` = dono do workspace (pode gerenciar o módulo jurídico e
convidar membros via `perfis.functions.ts`). Um usuário convidado por outro
admin é rebaixado para `member` automaticamente quando aceita o convite.

Então: **basta aplicar as migrations (passo 2) e criar o usuário** — admin é
automático, nenhum passo manual extra é necessário no fluxo normal.

Se ainda assim precisar promover ou rebaixar alguém manualmente (ex.: usuário
criado antes das migrations rodarem, ou para revogar admin de alguém), rode no
SQL Editor do Supabase:

```sql
-- promover para admin
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'usuario@exemplo.com'
on conflict (user_id, role) do nothing;

-- revogar admin (rebaixar)
delete from public.user_roles
where role = 'admin'
  and user_id = (select id from auth.users where email = 'usuario@exemplo.com');
```

## 4. Buckets esperados

| Bucket           | Uso                                   | Público |
| ---------------- | ------------------------------------- | ------- |
| `reunioes-audio` | Áudios de reuniões antigas.           | Não     |
| `livros-docs`    | PDFs/DOCX enviados na área de livros. | Não     |
| `infograficos`   | Imagens geradas para livros.          | Não     |
| `avatares`       | Avatares de perfil.                   | Não     |
| `camara-audio`   | Segmentos da Câmara de Eco.           | Não     |

Os objetos seguem o padrão de path com o `user_id` como primeira pasta. As
políticas de Storage usam esse prefixo para restringir leitura/escrita ao dono.

## 5. Auth e redirects

Configure as URLs do Supabase Auth conforme o domínio final:

- Site URL: `https://seu-dominio`
- Redirect URLs adicionais:
  - `https://seu-dominio/auth`
  - `https://seu-dominio/klio`
  - `http://localhost:5173/auth`
  - `http://localhost:5173/klio`

Se usar Apple OAuth, configure o provider Apple no painel do Supabase e confirme
que o redirect permitido bate com o domínio público do app.

## 6. Variáveis no Cloudflare Worker

Secrets privados:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_PUBLISHABLE_KEY
# Alternativa compatível: wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Variáveis públicas de build devem estar presentes antes de `bun run build`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## 7. Verificações após deploy

1. Abra `/api/public/health` para confirmar que o Worker responde.
2. Abra `/api/public/ready` para validar Supabase e IA configurada.
3. Crie uma conta de teste pelo fluxo `/auth`.
4. Faça upload pequeno em `livros-docs` e `camara-audio` para validar Storage/RLS.
