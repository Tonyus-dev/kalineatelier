// GET /api/bridge/olhar-de-kairos — snapshot único e cifrado para a Kaline Local puxar.
//
// Escopo deliberado: leitura-only, um único GET, sem fila, sem cursor de
// sincronização. NÃO é um mecanismo de sync genérico — não aceita parâmetros de
// tipo/origem, não escreve nada, não recebe envelopes de volta. Apenas monta um
// retrato consolidado e cifrado das últimas 25 mensagens, sedimentação, identidade
// e reuniões transcritas do usuário autenticado. Ver docs/offline/TUNNEL_READY.md.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import { lerContextoVivo } from "@/lib/contexto-vivo.server";
import { encryptKairosSnapshot } from "@/lib/kairos-crypto.server";
import type { Database } from "@/integrations/supabase/types";

const MAX_MENSAGENS = 25;
const MAX_REUNIOES = 5;
const MAX_IDENTIDADE = 5;
const MAX_SEDIMENTOS = 20;
const MAX_TRANSCRICAO_CHARS = 4000;

export const Route = createFileRoute("/api/bridge/olhar-de-kairos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL!;
        const publishableKey =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY!;
        const supabaseAsUser = createClient<Database>(supabaseUrl, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userRes, error: userErr } = await supabaseAsUser.auth.getUser(token);
        if (userErr || !userRes.user) return new Response("Unauthorized", { status: 401 });
        const userId = userRes.user.id;

        const limited = rateLimit(userId, "bridge_olhar_de_kairos", 6, 60);
        if (limited) return limited;

        const sharedSecret = process.env.KALINE_BRIDGE_SHARED_KEY;
        if (!sharedSecret) {
          return new Response(
            JSON.stringify({
              error: "misconfigured",
              message: "KALINE_BRIDGE_SHARED_KEY não está configurada neste deployment.",
            }),
            { status: 503, headers: { "content-type": "application/json" } },
          );
        }

        const [contexto, identidadeRows, reunioesRows, sedimentosRows, mensagensRows] =
          await Promise.all([
            lerContextoVivo(supabaseAsUser, userId),
            supabaseAsUser
              .from("contexto_externo")
              .select("titulo, conteudo, updated_at")
              .eq("user_id", userId)
              .eq("ativo", true)
              .order("updated_at", { ascending: false })
              .limit(MAX_IDENTIDADE)
              .then((r) => r.data ?? []),
            supabaseAsUser
              .from("reunioes")
              .select("id, titulo, resumo, transcricao, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(MAX_REUNIOES)
              .then((r) => r.data ?? []),
            supabaseAsUser
              .from("sedimentos")
              .select("nivel, hipotese, resumo, status, confianca, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(MAX_SEDIMENTOS)
              .then((r) => r.data ?? []),
            supabaseAsUser
              .from("chat_messages")
              .select("id, thread_id, role, content, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(MAX_MENSAGENS)
              .then((r) => r.data ?? []),
          ]);

        const snapshot = {
          geradoEm: new Date().toISOString(),
          contexto,
          identidade: identidadeRows.map((r) => ({
            titulo: r.titulo,
            conteudo: r.conteudo,
            atualizadoEm: r.updated_at,
          })),
          reunioes: reunioesRows.map((r) => ({
            id: r.id,
            titulo: r.titulo,
            resumo: r.resumo,
            transcricao: (r.transcricao ?? "").slice(0, MAX_TRANSCRICAO_CHARS),
            criadoEm: r.created_at,
          })),
          sedimentacao: sedimentosRows.map((r) => ({
            nivel: r.nivel,
            hipotese: r.hipotese,
            resumo: r.resumo,
            status: r.status,
            confianca: r.confianca,
            criadoEm: r.created_at,
          })),
          mensagens: mensagensRows
            .slice()
            .reverse()
            .map((m) => ({
              id: m.id,
              threadId: m.thread_id,
              role: m.role,
              content: m.content,
              criadoEm: m.created_at,
            })),
        };

        const envelope = await encryptKairosSnapshot(sharedSecret, snapshot);
        return new Response(JSON.stringify(envelope), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
