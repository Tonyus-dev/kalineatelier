import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import {
  FACETS,
  createThread,
  listThreads,
  getThread,
  updateThread,
} from "../services/chat.service.js";

const createSchema = z.object({ title: z.string().optional(), facet: z.enum(FACETS) });
const patchSchema = z.object({ title: z.string().optional(), archived: z.boolean().optional() });

export async function registerThreadsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/threads", async () => {
    return { threads: listThreads(getDb()) };
  });

  app.post("/threads", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return { thread: createThread(getDb(), parsed.data) };
  });

  app.get<{ Params: { id: string } }>("/threads/:id", async (req, reply) => {
    const thread = getThread(getDb(), req.params.id);
    if (!thread) return reply.code(404).send({ ok: false, error: "thread não encontrada" });
    return { thread };
  });

  app.patch<{ Params: { id: string } }>("/threads/:id", async (req, reply) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    const thread = updateThread(getDb(), req.params.id, parsed.data);
    if (!thread) return reply.code(404).send({ ok: false, error: "thread não encontrada" });
    return { thread };
  });
}
