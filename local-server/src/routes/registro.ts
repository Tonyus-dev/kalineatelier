import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import {
  REGISTRO_KINDS,
  createRegistro,
  listRegistros,
  updateRegistro,
  archiveRegistro,
} from "../services/registro.service.js";

const createSchema = z.object({
  kind: z.enum(REGISTRO_KINDS),
  title: z.string().min(1),
  content: z.string().min(1),
  source: z.string().optional(),
});
const patchSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  kind: z.enum(REGISTRO_KINDS).optional(),
});

export async function registerRegistroRoutes(app: FastifyInstance): Promise<void> {
  app.get("/registro", async (req) => {
    const query = req.query as { kind?: string; includeArchived?: string; limit?: string };
    return {
      registros: listRegistros(getDb(), {
        kind: query.kind as (typeof REGISTRO_KINDS)[number] | undefined,
        includeArchived: query.includeArchived === "true",
        limit: query.limit ? Number(query.limit) : undefined,
      }),
    };
  });

  app.post("/registro", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return { registro: createRegistro(getDb(), parsed.data) };
  });

  app.patch<{ Params: { id: string } }>("/registro/:id", async (req, reply) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    const registro = updateRegistro(getDb(), req.params.id, parsed.data);
    if (!registro) return reply.code(404).send({ ok: false, error: "registro não encontrado" });
    return { registro };
  });

  app.delete<{ Params: { id: string } }>("/registro/:id", async (req, reply) => {
    const ok = archiveRegistro(getDb(), req.params.id);
    if (!ok) return reply.code(404).send({ ok: false, error: "registro não encontrado" });
    return { ok: true };
  });
}
