import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { listSettings, setSetting } from "../services/settings.service.js";

const putSchema = z.object({ value: z.unknown() });

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/settings", async () => {
    return { settings: listSettings(getDb()) };
  });

  app.put<{ Params: { key: string } }>("/settings/:key", async (req, reply) => {
    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return { setting: setSetting(getDb(), req.params.key, parsed.data.value) };
  });
}
