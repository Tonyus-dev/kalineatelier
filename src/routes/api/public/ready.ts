// Readiness check — confirma que dependências críticas estão acessíveis.
// Mais pesado que /health: faz um HEAD no Supabase. Use em smoke tests de deploy,
// não em monitores de alta frequência.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ready")({
  server: {
    handlers: {
      GET: async () => {
        const checks: Record<string, { ok: boolean; ms?: number; error?: string }> = {};
        let allOk = true;

        const supabaseUrl = process.env.SUPABASE_URL;
        if (supabaseUrl) {
          const t0 = Date.now();
          try {
            const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
              method: "GET",
              signal: AbortSignal.timeout(3000),
            });
            checks.supabase = { ok: res.ok, ms: Date.now() - t0 };
            if (!res.ok) allOk = false;
          } catch (err) {
            checks.supabase = {
              ok: false,
              ms: Date.now() - t0,
              error: err instanceof Error ? err.message : String(err),
            };
            allOk = false;
          }
        } else {
          checks.supabase = { ok: false, error: "supabase_not_configured" };
          allOk = false;
        }

        checks.openrouter_ai = {
          ok: Boolean(process.env.OPENROUTER_API_KEY),
          ...(process.env.OPENROUTER_API_KEY ? {} : { error: "ai_not_configured" }),
        };
        if (!checks.openrouter_ai.ok) allOk = false;

        return new Response(
          JSON.stringify({
            status: allOk ? "ready" : "degraded",
            time: new Date().toISOString(),
            checks,
          }),
          {
            status: allOk ? 200 : 503,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
