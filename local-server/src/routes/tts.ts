/**
 * Rotas GET /tts/status e POST /tts/speak — TTS local (Kokoro 82M).
 * /tts/speak sintetiza de verdade com a voz Dora (pt-BR) quando o Kokoro está
 * disponível; caso contrário responde 503 honesto, sem fingir voz.
 */

import type { FastifyInstance } from "fastify";
import { getTtsStatus, synthesizeSpeech, KokoroError } from "../services/tts/kokoro.js";

export async function registerTtsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tts/status", async () => {
    return { ok: true, ...getTtsStatus() };
  });

  app.post("/tts/speak", async (req, reply) => {
    const body = (req.body ?? {}) as { text?: string; voice?: string; speed?: number };
    const text = (body.text ?? "").trim();
    if (!text) {
      return reply.code(400).send({ ok: false, error: "Envie 'text' com o que deve ser falado." });
    }

    const status = getTtsStatus();
    if (status.status !== "available") {
      return reply.code(503).send({ ok: false, status: status.status, message: status.message });
    }

    try {
      const wav = await synthesizeSpeech(text, { voice: body.voice, speed: body.speed });
      reply.header("content-type", "audio/wav");
      reply.header("cache-control", "no-store");
      return reply.send(wav);
    } catch (err) {
      const message = err instanceof KokoroError ? err.message : "Falha na síntese de voz.";
      req.log.error({ provider: "kokoro", success: false }, "tts.speak");
      return reply.code(503).send({ ok: false, error: message });
    }
  });
}
