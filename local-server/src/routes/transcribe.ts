/**
 * Rotas GET /transcribe/status e POST /transcribe/file — transcrição local via whisper.cpp.
 * O áudio enviado é salvo apenas em arquivo temporário e removido após a transcrição.
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { DATA_DIR } from "../config.js";
import {
  getTranscriptionStatus,
  transcribeFile,
  WhisperError,
} from "../services/transcription/whisper-cpp.js";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

export async function registerTranscribeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/transcribe/status", async () => {
    return { ok: true, ...getTranscriptionStatus() };
  });

  app.post("/transcribe/file", async (req, reply) => {
    const data = await req.file({ limits: { fileSize: MAX_UPLOAD_BYTES } }).catch(() => null);
    if (!data) {
      return reply.code(400).send({ ok: false, error: "Envie o áudio no campo 'file'." });
    }

    const tmpDir = path.join(DATA_DIR, "tmp");
    await fs.mkdir(tmpDir, { recursive: true });
    const ext = path.extname(data.filename || "") || ".wav";
    const tmpPath = path.join(tmpDir, `transcribe-${randomUUID()}${ext}`);

    try {
      await fs.writeFile(tmpPath, await data.toBuffer());
    } catch (err) {
      return reply
        .code(400)
        .send({ ok: false, error: `Falha ao salvar áudio temporário: ${(err as Error).message}` });
    }

    try {
      const status = getTranscriptionStatus();
      const result = await transcribeFile(tmpPath);
      const modelName = status.available ? path.basename(status.model) : "desconhecido";
      const language = status.available ? status.language : "pt";

      req.log.info(
        { provider: "whisper_cpp", model: modelName, durationMs: result.durationMs, success: true },
        "transcribe.file",
      );

      return {
        provider: "whisper_cpp",
        model: modelName,
        language,
        text: result.text,
        durationMs: result.durationMs,
      };
    } catch (err) {
      req.log.error({ provider: "whisper_cpp", success: false }, "transcribe.file");
      const message = err instanceof WhisperError ? err.message : "Falha ao transcrever o áudio.";
      return reply.code(502).send({ ok: false, error: message });
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  });
}
