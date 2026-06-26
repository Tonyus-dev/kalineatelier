import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import {
  createInboxEvent,
  listInboxEvents,
  updateInboxEventStatus,
} from "../services/inbox.service.js";

const createSchema = z.object({
  source: z.string().min(1),
  type: z.string().min(1),
  title: z.string().optional(),
  payload: z.unknown(),
});
const patchSchema = z.object({
  status: z.enum(["pending", "accepted", "discarded", "processed", "error"]),
});

export async function registerInboxRoutes(app: FastifyInstance): Promise<void> {
  app.get("/inbox", async (req) => {
    const query = req.query as { status?: string };
    return {
      events: listInboxEvents(getDb(), {
        status: query.status as
          | "pending"
          | "accepted"
          | "discarded"
          | "processed"
          | "error"
          | undefined,
      }),
    };
  });

  app.post("/inbox", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return { event: createInboxEvent(getDb(), parsed.data) };
  });

  app.patch<{ Params: { id: string } }>("/inbox/:id", async (req, reply) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    const event = updateInboxEventStatus(getDb(), req.params.id, parsed.data.status);
    if (!event) return reply.code(404).send({ ok: false, error: "evento não encontrado" });
    return { event };
  });
}
