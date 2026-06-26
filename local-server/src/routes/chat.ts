import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { FACETS, runChat } from "../services/chat.service.js";

const chatSchema = z.object({
  threadId: z.string().optional(),
  message: z.string().min(1),
  facet: z.enum(FACETS).optional(),
});

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.post("/chat", async (req, reply) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    return runChat(getDb(), parsed.data);
  });
}
