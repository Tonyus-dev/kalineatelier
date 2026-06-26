// TTS via OpenRouter — Kaline fala.
// A OpenRouter devolve o áudio (mp3) como bytes crus numa resposta única;
// repassamos direto ao cliente, que decodifica e toca via AudioContext.
//
// Requer provider de voz configurado no runtime. Se ausente, responde 503 amigável.
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { rateLimit } from "@/lib/rate-limit";

const MAX_INPUT_CHARS = 4000;
const DEFAULT_MODEL = "hexgrad/kokoro-82m";
const DEFAULT_VOICE = "pf_dora"; // voz pt-BR padrão do Kokoro v1.0

type Body = {
  text?: unknown;
  voice?: unknown;
  model?: unknown;
};

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const limited = rateLimit(auth.userId, "tts", 60, 60);
        if (limited) return limited;

        const key = process.env.OPENROUTER_API_KEY;
        if (!key) {
          return Response.json(
            {
              error: "ai_not_configured",
              message: "A voz da Kaline ainda não está configurada neste ambiente.",
            },
            { status: 503 },
          );
        }

        let payload: Body;
        try {
          payload = (await request.json()) as Body;
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const text = typeof payload.text === "string" ? payload.text.trim() : "";
        if (!text) return new Response("text obrigatório", { status: 400 });
        if (text.length > MAX_INPUT_CHARS) {
          return new Response(
            `text excede ${MAX_INPUT_CHARS} caracteres — quebre em chunks no cliente`,
            { status: 413 },
          );
        }

        const voice =
          (typeof payload.voice === "string" && payload.voice) ||
          process.env.OPENROUTER_TTS_VOICE ||
          DEFAULT_VOICE;
        const model =
          (typeof payload.model === "string" && payload.model) ||
          process.env.OPENROUTER_TTS_MODEL ||
          process.env.OPENROUTER_TTS_PRIMARY_MODEL ||
          DEFAULT_MODEL;

        // A OpenRouter devolve bytes de áudio crus (não SSE); pedimos mp3 para o
        // cliente tocar direto via decodeAudioData/HTMLAudioElement.
        const body: Record<string, unknown> = {
          model,
          voice,
          input: text,
          response_format: "mp3",
        };

        const rawReferer =
          request.headers.get("origin") ||
          process.env.OPENROUTER_SITE_URL ||
          process.env.APP_PUBLIC_URL ||
          "https://kaline.app";
        const referer = (() => {
          try {
            const url = new URL(rawReferer);
            return `${url.protocol}//${url.host}`;
          } catch {
            return "https://kaline.app";
          }
        })();

        let upstream: Response;
        try {
          upstream = await fetch("https://openrouter.ai/api/v1/audio/speech", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              "HTTP-Referer": referer,
              "X-Title": process.env.OPENROUTER_APP_NAME ?? "Kaline Totalidade",
            },
            body: JSON.stringify(body),
            signal: request.signal,
          });
        } catch (err) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          const msg = err instanceof Error ? err.message : "erro de rede";
          return new Response(msg, { status: 502 });
        }

        if (!upstream.ok) {
          const errBody = await upstream.text().catch(() => "");
          return new Response(errBody || `openrouter ${upstream.status}`, {
            status: upstream.status,
          });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
            "X-TTS-Voice": voice,
            "X-TTS-Model": model,
          },
        });
      },
    },
  },
});
