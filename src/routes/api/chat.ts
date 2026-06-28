import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createOpenRouterProvider } from "@/lib/openrouter.server";
import { AI_MODELS } from "@/lib/ai-models.server";
import { KHARIS_SYSTEM_PROMPT } from "@/lib/kharis-prompt";
import { KALINE_SYSTEM_PROMPT } from "@/lib/kaline-prompt";
import {
  KUANYIN_FACET_BLOCK,
  renderBusinessContextBlock,
  type BusinessContextSnippet,
} from "@/lib/kuanyin-prompt";
import { LEGAL_ANTIHALLUCINATION_BLOCK } from "@/lib/legal-prompt";
import { INJECTION_GUARD } from "@/lib/injection-guard-prompt";
import { CHAT_IDENTITY_REINFORCEMENT_BLOCK } from "@/lib/chat-identity-reinforcement";
import { rateLimit } from "@/lib/rate-limit";
import type { Database } from "@/integrations/supabase/types";

// Faceta "kharis" = superfície de cuidado neurodivergente (antigo valor de enum 'klio',
// renomeado em 20260626010000). Klio (acadêmica) foi absorvida pela Kaline.
type Facet = "kaline" | "kharis" | "kuanyin";

// Validação leve de envelope (mensagens em si seguem o shape do SDK `ai`).
const ChatEnvelope = z.object({
  threadId: z.string().uuid(),
  facet: z.enum(["kaline", "kharis", "kuanyin"]).optional(),
  messages: z.array(z.unknown()).min(1).max(200),
  presencaNota: z.string().max(280).optional(),
});

// Limites duros para reduzir superfície de prompt injection / abuso.
// Janelas maiores favorecem o implicit prompt caching do Gemini 2.x:
// prefixos estáveis (system + histórico antigo) são reusados entre turnos.
const MAX_MESSAGES = 120;
const MAX_CHARS_PER_MSG = 12_000;
const MAX_TOTAL_CHARS = 180_000;

function sanitizeMessages(raw: UIMessage[]): UIMessage[] {
  const trimmed = raw.slice(-MAX_MESSAGES);
  let total = 0;
  const out: UIMessage[] = [];
  for (const m of trimmed) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const parts = (m.parts ?? [])
      .map((p) => {
        if (p.type !== "text") return p;
        let t = typeof p.text === "string" ? p.text : "";
        if (t.length > MAX_CHARS_PER_MSG) t = t.slice(0, MAX_CHARS_PER_MSG);
        total += t.length;
        return { ...p, text: t };
      })
      .filter(Boolean);
    if (total > MAX_TOTAL_CHARS) break;
    out.push({ ...m, parts });
  }
  return out;
}

// Normaliza um anexo para o que o provider espera de forma determinística:
// base64 puro (sem o prefixo `data:<mime>;base64,`) + mediaType derivado.
// Evita depender de `new URL(data:…)` (frágil entre versões do SDK) — o provider
// remonta `data:<mime>;base64,<b64>` (imagem→image_url, PDF→file_data) no envio.
function normalizeFileData(
  value: string,
  fallbackMediaType?: string,
): { data: string; mediaType: string | undefined } {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(value);
  if (!m) return { data: value, mediaType: fallbackMediaType };
  const mediaType = m[1] || fallbackMediaType;
  const isBase64 = Boolean(m[2]);
  return { data: isBase64 ? m[3] : decodeURIComponent(m[3]), mediaType };
}

function toModelMessages(messages: UIMessage[]): ModelMessage[] {
  return messages.map((m) => {
    if (m.role === "assistant") {
      return {
        role: "assistant" as const,
        content: (m.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join(""),
      };
    }

    return {
      role: "user" as const,
      content: (m.parts ?? [])
        .map((p) => {
          if (p.type === "text") return { type: "text" as const, text: p.text };
          if (p.type === "file") {
            if (typeof p.url !== "string") {
              return {
                type: "file" as const,
                mediaType: p.mediaType,
                filename: p.filename,
                data: p.url,
              };
            }
            const { data, mediaType } = normalizeFileData(p.url, p.mediaType);
            return {
              type: "file" as const,
              mediaType: mediaType ?? p.mediaType,
              filename: p.filename,
              data,
            };
          }
          return null;
        })
        .filter((p): p is NonNullable<typeof p> => p !== null),
    };
  });
}

function extractText(m: UIMessage): string {
  return (m.parts ?? [])
    .map((p) => {
      if (p.type === "text") return p.text;
      if (p.type === "file" && p.mediaType?.startsWith("image/")) {
        return `[Imagem anexada para interpretação: ${p.filename ?? "imagem"}]`;
      }
      if (p.type === "file" && p.mediaType === "application/pdf") {
        return `[PDF anexado: ${p.filename ?? "documento.pdf"} — conteúdo enviado ao modelo]`;
      }
      return "";
    })
    .join("\n")
    .trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // ── 1. Auth: exige bearer token e valida usuário ──
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

        // (envelope validado via Zod logo abaixo)

        // ── 2. Body + Zod no envelope ──
        const raw = await request.json().catch(() => null);
        const parsed = ChatEnvelope.safeParse(raw);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "bad_request", issues: parsed.error.issues }),
            {
              status: 400,
              headers: { "content-type": "application/json" },
            },
          );
        }
        const body = { ...parsed.data, messages: parsed.data.messages as unknown as UIMessage[] };

        // ── Rate limit por usuário (best-effort) ──
        const limited = rateLimit(userId, "chat", 20, 60);
        if (limited) return limited;

        // ── 3. Ownership: thread pertence ao usuário ──
        const { data: thread, error: threadErr } = await supabaseAsUser
          .from("chat_threads")
          .select("id, user_id, facet")
          .eq("id", body.threadId)
          .maybeSingle();
        if (threadErr || !thread || thread.user_id !== userId) {
          return new Response("Forbidden", { status: 403 });
        }

        let gateway: ReturnType<typeof createOpenRouterProvider>;
        try {
          gateway = createOpenRouterProvider();
        } catch (err) {
          console.error(
            "AI provider configuration error",
            err instanceof Error ? err.message : err,
          );
          return Response.json(
            {
              error: "ai_not_configured",
              message: "A IA ainda não está configurada neste ambiente.",
            },
            { status: 503 },
          );
        }

        const facet: Facet =
          body.facet === "kaline" ? "kaline" : body.facet === "kuanyin" ? "kuanyin" : "kharis";
        // Kuan-Yin é faceta interna da Kaline: voz continua sendo Kaline,
        // adiciona-se o bloco comercial + contexto do negócio.
        // facet "kharis" == superfície Kháris (cuidado neurodivergente).
        const baseSystem = facet === "kharis" ? KHARIS_SYSTEM_PROMPT : KALINE_SYSTEM_PROMPT;

        // Antialucinação jurídica em todas as facetas.
        const legalBlock = LEGAL_ANTIHALLUCINATION_BLOCK;

        // Bloco da faceta Kuan-Yin: regras comerciais + business_context do usuário.
        let kuanyinBlock = "";
        if (facet === "kuanyin") {
          let bizCtx: BusinessContextSnippet | null = null;
          try {
            const { data: ctx } = await supabaseAsUser
              .from("business_contexts")
              .select(
                "nome, tipo, servicos, precos, tom_voz, formas_pagamento, pix_chave, regras_agenda, limites_decisao, regras_escalonamento, observacoes",
              )
              .eq("user_id", userId)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (ctx) bizCtx = ctx as unknown as BusinessContextSnippet;
          } catch {
            // segue sem contexto
          }
          kuanyinBlock = KUANYIN_FACET_BLOCK + renderBusinessContextBlock(bizCtx);
        }

        // Camada 1+2: leitura transversal das superfícies → contexto vivo no prompt.
        let contextoBlock = "";
        try {
          const { lerContextoVivo, renderContextoVivoBlock } =
            await import("@/lib/contexto-vivo.server");
          const ctx = await lerContextoVivo(supabaseAsUser, userId);
          contextoBlock = "\n\n" + renderContextoVivoBlock(ctx);
        } catch {
          // se a leitura falhar, segue sem contexto vivo (presença honesta > bloqueio)
        }

        // Regime de presença (Semáforo) — modulação do tom/tamanho/iniciativa.
        let presencaBlock = "";
        try {
          const { lerPresencaRegime, renderPresencaRegimeBlock } =
            await import("@/lib/presenca-regime.server");
          const estado = await lerPresencaRegime(supabaseAsUser, userId);
          const rendered = renderPresencaRegimeBlock(estado, body.presencaNota);
          if (rendered) presencaBlock = "\n\n" + rendered;
        } catch {
          // sem semáforo → segue sem bloco de regime
        }

        // Continuidade / identidade migrada de outras Kalines (markdown colado no perfil).
        // Injetada logo após o cânone (baseSystem): peso de identidade, não de dado externo.
        let identidadeBlock = "";
        try {
          const { lerContextosAtivos, renderContextosExternosBlock } =
            await import("@/lib/contexto-externo.server");
          const rows = await lerContextosAtivos(supabaseAsUser, userId);
          const rendered = renderContextosExternosBlock(rows);
          if (rendered) identidadeBlock = "\n\n" + rendered;
        } catch {
          // segue sem continuidade migrada
        }

        const system =
          baseSystem +
          CHAT_IDENTITY_REINFORCEMENT_BLOCK +
          identidadeBlock +
          legalBlock +
          contextoBlock +
          presencaBlock +
          kuanyinBlock +
          INJECTION_GUARD;

        const safeMessages = sanitizeMessages(body.messages);
        if (safeMessages.length === 0) {
          return new Response("no valid messages", { status: 400 });
        }

        // ── 4. Persiste a última user message ANTES de stream (não perde em desconexão) ──
        const lastUser = [...safeMessages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          const text = extractText(lastUser);
          if (text) {
            const isUuid = /^[0-9a-f-]{36}$/i.test(lastUser.id);
            await supabaseAsUser.from("chat_messages").upsert(
              {
                ...(isUuid ? { id: lastUser.id } : {}),
                thread_id: body.threadId,
                user_id: userId,
                role: "user",
                content: text,
              },
              { onConflict: "id" },
            );
          }
        }

        // O modelo de chat padrão é texto-only; anexos exigem um modelo capaz de
        // lê-los, senão o provider rejeita a requisição ou (pior) ignora o anexo
        // silenciosamente e a resposta finge ter lido. Escolhemos por tipo:
        //  - PDF  → modelo de documentos (lê PDF nativamente);
        //  - imagem → modelo de visão;
        //  - sem anexo → modelo de chat padrão.
        const fileParts = safeMessages.flatMap((m) =>
          (m.parts ?? []).filter((p) => p.type === "file"),
        );
        const hasPdf = fileParts.some((p) => p.mediaType === "application/pdf");
        const hasImage = fileParts.some((p) => p.mediaType?.startsWith("image/"));
        const chatModel = hasPdf
          ? AI_MODELS.documents
          : hasImage
            ? AI_MODELS.vision
            : AI_MODELS.chat;

        const result = streamText({
          model: gateway(chatModel),
          system,
          messages: toModelMessages(safeMessages),
          temperature: 0.55,
          frequencyPenalty: 0.4,
          presencePenalty: 0.3,
          // ── 5. Persiste a resposta do assistente quando a stream encerra ──
          onFinish: async ({ text }) => {
            const content = (text ?? "").trim();
            if (!content) return;
            try {
              // Provenance: TODOS os ids de mensagens que entraram no contexto
              // desta resposta (o histórico sanitizado real enviado ao modelo).
              const derivedFrom = safeMessages
                .map((m) => m.id)
                .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
              await supabaseAsUser.from("chat_messages").insert({
                thread_id: body.threadId!,
                user_id: userId,
                role: "assistant",
                content,
                derived_from: derivedFrom,
              });

              // Camada de integridade comercial (faceta Kuan-Yin):
              // classifica resposta contra invariantes e registra alertas.
              if (facet === "kuanyin") {
                try {
                  const { classifyKuanyinResponse } = await import("@/lib/kuanyin-integrity");
                  const signals = classifyKuanyinResponse(content);
                  if (signals.length > 0) {
                    await supabaseAsUser.from("kuanyin_integrity_logs").insert(
                      signals.map((s) => ({
                        user_id: userId,
                        thread_id: body.threadId,
                        severity: s.severity,
                        category: s.category,
                        note: s.note,
                        excerpt: s.excerpt,
                      })) as never,
                    );
                  }
                } catch {
                  // integridade é trilha de auditoria, não bloqueia resposta
                }
              }

              // Sedimentação 5→1 roda via local-server (motor determinístico
              // único, sem cascata) — este endpoint Supabase-based ainda não
              // foi religado ao local-server (ver Tarefa #9 da migração offline).
            } catch (err) {
              console.error("Chat persistence/sedimentation failed", err);
              // Não derrubar a resposta por falha de persistência
            }
          },
        });
        return result.toUIMessageStreamResponse({ originalMessages: safeMessages });
      },
    },
  },
});
