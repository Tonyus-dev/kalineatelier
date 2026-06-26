import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { createDecisao, listDecisoes } from "../services/decisao.service.js";

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  project: z.string().optional(),
});

export async function registerDecisoesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/decisoes", async () => {
    return { decisoes: listDecisoes(getDb()) };
  });

  app.post("/decisoes", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return { decisao: createDecisao(getDb(), parsed.data) };
  });
}
