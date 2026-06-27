/**
 * Reuniões locais — gravadas pelo PWA (botão "Reunião").
 *
 * POST /meetings/transcribe: recebe o áudio (microfone), transcreve com whisper.cpp e
 *   devolve o texto. NÃO grava nada sozinho.
 * POST /meetings: grava a reunião como evento revisável em inbox_events
 *   (type='meeting_transcript', trust_level='untrusted', status='pending'). Nunca escreve
 *   direto em Registro Vivo/Jardim/Decisões — isso exige revisão humana via /inbox.
 * GET /meetings: lista as reuniões já registradas (eventos meeting_transcript).
 *
 * Escopo PR 1: captura só de microfone. Áudio interno do sistema/loopback fica para o
 * companion nativo (PR 2).
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DATA_DIR } from "../config.js";
import { getDb } from "../db/connection.js";
import { createInboxEvent, listInboxEvents } from "../services/inbox.service.js";
import {
  getTranscriptionStatus,
  transcribeFile,
  WhisperError,
} from "../services/transcription/whisper-cpp.js";

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB (reuniões podem ser longas)

const createMeetingSchema = z.object({
  title: z.string().optional(),
  transcript: z.string().min(1, "transcript vazio"),
  durationMs: z.number().nonnegative().optional(),
  summary: z.string().optional(),
  participants: z.array(z.string()).optional(),
});

export async function registerMeetingsRoutes(app: FastifyInstance): Promise<void> {
  app.post("/meetings/transcribe", async (req, reply) => {
    const data = await req.file({ limits: { fileSize: MAX_UPLOAD_BYTES } }).catch(() => null);
    if (!data) {
      return reply
        .code(400)
        .send({ ok: false, error: "Envie o áudio da reunião no campo 'file'." });
    }

    const tmpDir = path.join(DATA_DIR, "tmp");
    await fs.mkdir(tmpDir, { recursive: true });
    const ext = path.extname(data.filename || "") || ".wav";
    const tmpPath = path.join(tmpDir, `meeting-${randomUUID()}${ext}`);

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
      return {
        provider: "whisper_cpp",
        model: modelName,
        language,
        text: result.text,
        durationMs: result.durationMs,
      };
    } catch (err) {
      const message = err instanceof WhisperError ? err.message : "Falha ao transcrever a reunião.";
      return reply.code(502).send({ ok: false, error: message });
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }
  });

  app.post("/meetings", async (req, reply) => {
    const parsed = createMeetingSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ ok: false, error: parsed.error.issues[0]?.message ?? "inválido" });
    }
    const { title, transcript, durationMs, summary, participants } = parsed.data;
    const when = new Date();
    const defaultTitle = `Reunião gravada em ${when.toISOString().slice(0, 16).replace("T", " ")}`;

    const event = createInboxEvent(getDb(), {
      source: "pwa",
      type: "meeting_transcript",
      title: title || defaultTitle,
      trustLevel: "untrusted",
      payload: {
        transcript,
        durationMs: durationMs ?? 0,
        createdAt: when.toISOString(),
        summary: summary ?? "",
        participants: participants ?? [],
        calendarEventId: null,
      },
    });

    return { ok: true, event };
  });

  app.get("/meetings", async () => {
    const events = listInboxEvents(getDb(), { type: "meeting_transcript" });
    return { meetings: events };
  });
}
