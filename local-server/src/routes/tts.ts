/**
 * Rotas GET /tts/status e POST /tts/speak — TTS local.
 *
 * - /tts/status retorna status honesto do provider configurado (kokoro-python ou
 *   kokoro-js experimental).
 * - /tts/speak sintetiza de verdade com a voz Dora (pt-BR) via kokoro-python
 *   quando TTS_PROVIDER=kokoro-python; caso contrário, usa kokoro-js experimental
 *   (af_bella). Em falha, responde 503 honesto, sem fingir voz.
 */

import type { FastifyInstance } from "fastify";
import { getTtsStatus, synthesizeSpeech, KokoroError } from "../services/tts/kokoro.js";
import {
  getKokoroPythonStatus,
  synthesizeWithKokoroPython,
  KokoroPythonError,
} from "../services/tts/kokoro-python.js";
import { TTS_CONFIG } from "../config.js";

export async function registerTtsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tts/status", async () => {
    if (TTS_CONFIG.provider === "kokoro-python") {
      return { ok: true, ...getKokoroPythonStatus() };
    }
    return { ok: true, ...getTtsStatus() };
  });

  app.post("/tts/speak", async (req, reply) => {
    const body = (req.body ?? {}) as { text?: string; voice?: string; speed?: number };
    const text = (body.text ?? "").trim();
    if (!text) {
      return reply.code(400).send({ ok: false, error: "Envie 'text' com o que deve ser falado." });
    }

    if (TTS_CONFIG.provider === "kokoro-python") {
      const status = getKokoroPythonStatus();
      if (status.status !== "available") {
        return reply
          .code(503)
          .send({ ok: false, status: status.status, message: status.message });
      }
      try {
        const wav = await synthesizeWithKokoroPython(text, { speed: body.speed });
        reply.header("content-type", "audio/wav");
        reply.header("cache-control", "no-store");
        return reply.send(wav);
      } catch (err) {
        const message =
          err instanceof KokoroPythonError ? err.message : "Falha na síntese de voz.";
        req.log.error(
          { provider: "kokoro-python", success: false, error: message },
          "tts.speak",
        );
        return reply.code(503).send({ ok: false, error: message });
      }
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
      req.log.error({ provider: "kokoro-js", success: false }, "tts.speak");
      return reply.code(503).send({ ok: false, error: message });
    }
  });
}
