import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { PRESENCA_STATES, getPresenca, setPresenca } from "../services/presenca.service.js";

const putSchema = z.object({ state: z.enum(PRESENCA_STATES) });

export async function registerPresencaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/presenca", async () => {
    return { presenca: getPresenca(getDb()) };
  });

  app.put("/presenca", async (req, reply) => {
    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return { presenca: setPresenca(getDb(), parsed.data.state) };
  });
}
