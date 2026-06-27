import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { TIPOS_EVENTO, createEvento, deleteEvento, listEventos } from "../services/agenda.service.js";

const createSchema = z.object({
  titulo: z.string().min(1),
  tipo: z.enum(TIPOS_EVENTO),
  inicio: z.string().min(1),
  fim: z.string().nullable().optional(),
  local: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
});

const listQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function registerAgendaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/eventos", async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return { eventos: listEventos(getDb(), parsed.data) };
  });

  app.post("/eventos", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return { evento: createEvento(getDb(), parsed.data) };
  });

  app.delete<{ Params: { id: string } }>("/eventos/:id", async (req, reply) => {
    const ok = deleteEvento(getDb(), req.params.id);
    if (!ok) return reply.code(404).send({ ok: false, error: "Evento não encontrado" });
    return { ok: true };
  });
}
