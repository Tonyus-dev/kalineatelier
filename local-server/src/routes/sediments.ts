import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import {
  runSedimentation,
  listSediments,
  confirmSediment,
  discardSediment,
} from "../services/sedimentation.service.js";

const runSchema = z.object({ threadId: z.string().min(1) });

export async function registerSedimentsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/sediments", async (req) => {
    const query = req.query as { status?: string };
    return { sediments: listSediments(getDb(), { status: query.status }) };
  });

  app.post("/sediments/run", async (req, reply) => {
    const parsed = runSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return { created: runSedimentation(getDb(), parsed.data.threadId) };
  });

  app.post<{ Params: { id: string } }>("/sediments/:id/confirm", async (req, reply) => {
    const result = confirmSediment(getDb(), req.params.id);
    if (!result)
      return reply.code(404).send({ ok: false, error: "sedimento não encontrado ou já decidido" });
    return result;
  });

  app.post<{ Params: { id: string } }>("/sediments/:id/discard", async (req, reply) => {
    const sedimento = discardSediment(getDb(), req.params.id);
    if (!sedimento)
      return reply.code(404).send({ ok: false, error: "sedimento não encontrado ou já decidido" });
    return { sedimento };
  });
}
