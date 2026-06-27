import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import {
  createMemoria,
  listMemorias,
  dueMemorias,
  reviewMemoria,
  archiveMemoria,
  normalizeQuality,
} from "../services/memory.service.js";

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  sourceRef: z.string().optional(),
  sourceSedimentoId: z.string().optional(),
  category: z.string().optional(),
  importance: z.number().int().optional(),
});
const reviewSchema = z.object({ quality: z.string() });

export async function registerMemoriesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/memories", async (req) => {
    const query = req.query as { includeArchived?: string; limit?: string };
    return {
      memories: listMemorias(getDb(), {
        includeArchived: query.includeArchived === "true",
        limit: query.limit ? Number(query.limit) : undefined,
      }),
    };
  });

  app.get("/memories/due", async (req) => {
    const query = req.query as { limit?: string };
    return {
      memories: dueMemorias(getDb(), {
        limit: query.limit ? Number(query.limit) : undefined,
      }),
    };
  });

  app.post("/memories", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return { memoria: createMemoria(getDb(), parsed.data) };
  });

  app.patch<{ Params: { id: string } }>("/memories/:id/review", async (req, reply) => {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    const quality = normalizeQuality(parsed.data.quality);
    if (!quality) return reply.code(400).send({ ok: false, error: "qualidade inválida" });
    const memoria = reviewMemoria(getDb(), req.params.id, quality);
    if (!memoria) return reply.code(404).send({ ok: false, error: "memória não encontrada" });
    return { memoria };
  });

  app.patch<{ Params: { id: string } }>("/memories/:id/archive", async (req, reply) => {
    const ok = archiveMemoria(getDb(), req.params.id);
    if (!ok) return reply.code(404).send({ ok: false, error: "memória não encontrada" });
    return { ok: true };
  });
}
