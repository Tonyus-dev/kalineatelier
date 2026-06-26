# Dependências online — mapa para adaptação futura

Inventário das dependências de nuvem/rede do Totalidade que, na Kaline Offline, precisarão
de **substituição ou adaptação local**. Este documento **apenas mapeia**. Nada é removido
nesta fase, e o app online continua dependendo de tudo isto normalmente.

## Tabela

| Dependência online | Onde aparece (exemplos) | Adaptação local prevista |
|---|---|---|
| **Supabase Auth** | rotas `_authenticated/*`, `src/lib/require-user.server.ts`, `src/integrations/supabase/` | Sem multiusuário no offline; sessão local simples (PR 2+). |
| **Supabase Database** | `*.functions.ts`/`*.server.ts` (ex.: `registro-vivo.functions.ts`, `jardim.functions.ts`, `sedimentar.functions.ts`), `supabase/` | SQLite local (PR 2). |
| **OpenRouter** | `src/lib/openrouter.server.ts`, `src/lib/ai-models.server.ts`, `src/routes/api/chat.ts` | Model provider local; mock no PR 1, modelos reais no PR 4. |
| **TTS** | `src/routes/api/tts.ts`, `src/lib/use-tts.ts` | Voz local (Kokoro) só no PR 5. |
| **Transcrição (STT)** | `src/routes/api/transcribe.ts`, `src/routes/api/camara-transcribe-segment.ts`, `src/lib/transcribe.server.ts` | Whisper local só no PR 5. |
| **Rotas públicas Kuan-Yin** | `src/routes/api/public/`, `src/routes/_authenticated/kuan-yin.*`, `src/lib/kuanyin-public.functions.ts` | Sem Kuan-Yin pública local nesta linha; fora de escopo até definição. |
| **Cloudflare / deploy** | `wrangler.toml`, `docs/self-host-cloudflare.md` | Não aplicável ao offline; ponte/pipeline só a partir do PR 6. |
| **APIs server-side existentes** | `src/routes/api/*` (chat, tts, transcribe, generate-infografico) | Reimplementadas como endpoints do `local-server` quando necessário. |
| **Armazenamento de anexos** | upload/leitura de arquivos nas funções acima | Sem upload no offline nesta fase; decisão futura. |
| **Variáveis `VITE_SUPABASE_*`** | `.env.example`, `src/integrations/supabase/` | Não usadas pelo caminho offline; dados offline não dependem de Supabase. |
| **Outras chaves de rede** | `OPENROUTER_*`, `GROQ_API_KEY`, `APP_PUBLIC_URL` (`.env.example`) | Substituídas por config local (`VITE_KALINE_LOCAL_API`, runtime mode). |

## Regra

> Não remover nada online. Apenas documentar. A matriz online herdada permanece intacta;
> a Kaline Offline cresce ao lado, sem depender de Supabase ou OpenRouter para seus dados locais.
