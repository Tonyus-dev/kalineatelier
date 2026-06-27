/**
 * Rota GET /tts/status — status honesto do TTS local (Kokoro 82M).
 * A síntese de voz ainda não é exposta por nenhuma rota nesta fase.
 */

import type { FastifyInstance } from "fastify";
import { getTtsStatus } from "../services/tts/kokoro.js";

export async function registerTtsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/tts/status", async () => {
    return { ok: true, ...getTtsStatus() };
  });
}
