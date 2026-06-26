import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  query: z.string().min(3),
  modo: z.enum(["jurisprudencia", "legislacao"]),
});

export const pesquisarJuridico = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    // Imports server-only dinâmicos: este módulo é referenciado por rotas de
    // cliente via RPC, então import estático de `*.server.*` quebra o build.
    const { createOpenRouterProvider } = await import("@/lib/openrouter.server");
    const { AI_MODELS } = await import("@/lib/ai-models.server");
    let gateway: ReturnType<typeof createOpenRouterProvider>;
    try {
      gateway = createOpenRouterProvider();
    } catch (err) {
      console.error("AI provider configuration error", err instanceof Error ? err.message : err);
      throw new Error("A IA ainda não está configurada neste ambiente.");
    }

    const system =
      data.modo === "jurisprudencia"
        ? `Você é um pesquisador jurídico. Pesquise jurisprudência brasileira (STF, STJ, TST, TJs) sobre o tema. SEMPRE cite tribunal, número do processo/acórdão e link de fonte oficial. Se não houver fonte confiável que você conheça, responda APENAS: "SEM_FONTE". Formato: markdown com seções "Tese", "Fundamento", "Fonte".`
        : `Você é um pesquisador de legislação brasileira. Indique lei, artigo, inciso e parágrafo aplicáveis, com link do Planalto. Se não souber com certeza, responda APENAS: "SEM_FONTE". Formato: markdown com seções "Dispositivo", "Texto", "Fonte".`;

    const { text } = await generateText({
      model: gateway(AI_MODELS.reasoning),
      system,
      prompt: data.query,
    });

    const semFonte = text.trim().toUpperCase().startsWith("SEM_FONTE");
    return {
      query: data.query,
      modo: data.modo,
      resultado: semFonte ? null : text,
      aviso: semFonte
        ? "Não encontrei fonte normativa/jurisprudencial confiável para esse tema. Posso ajudar com organização conceitual."
        : null,
    };
  });
