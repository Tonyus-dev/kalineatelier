/**
 * Rotas de modelo: GET /model/status (status real do provider configurado) e
 * POST /model/vision (canal MVP de visão local via Ollama).
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MODEL_CONFIG } from "../config.js";
import { getModelStatus, getRealModelStatus } from "../services/model-provider/status.js";
import { ollamaChat, OllamaError } from "../services/model-provider/ollama.js";

const MAX_IMAGE_BASE64_CHARS = 8_000_000; // ~6 MB de imagem decodificada

const visionSchema = z.object({
  prompt: z.string().min(1).max(4000),
  imageBase64: z.string().min(1).max(MAX_IMAGE_BASE64_CHARS),
});

function stripDataUrlPrefix(value: string): string {
  const match = value.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.*)$/s);
  return match ? match[1] : value;
}

export async function registerModelRoutes(app: FastifyInstance): Promise<void> {
  app.get("/model/status", async () => {
    const real = await getRealModelStatus();
    return { ok: true, ...getModelStatus(), ...real };
  });

  app.post("/model/vision", async (req, reply) => {
    const parsed = visionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ ok: false, error: parsed.error.message });
    }

    if (MODEL_CONFIG.provider !== "ollama") {
      return reply.code(409).send({
        ok: false,
        error: `Visão local requer KALINE_MODEL_PROVIDER=ollama (atual: ${MODEL_CONFIG.provider}).`,
      });
    }

    const imageBase64 = stripDataUrlPrefix(parsed.data.imageBase64);
    const model = MODEL_CONFIG.ollama.models.vision;

    const startedAt = Date.now();
    try {
      const result = await ollamaChat({
        model,
        messages: [{ role: "user", content: parsed.data.prompt, images: [imageBase64] }],
      });
      req.log.info(
        { provider: "ollama", model, durationMs: Date.now() - startedAt, success: true },
        "model.vision",
      );
      return { provider: "ollama", model, text: result.text, usage: result.usage };
    } catch (err) {
      req.log.error(
        { provider: "ollama", model, durationMs: Date.now() - startedAt, success: false },
        "model.vision",
      );
      const message = err instanceof OllamaError ? err.message : "Falha ao consultar o Ollama.";
      return reply.code(502).send({ ok: false, error: message });
    }
  });
}
