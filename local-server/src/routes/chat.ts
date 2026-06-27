import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import { ChatModelError, FACETS, runChat } from "../services/chat.service.js";

const chatSchema = z.object({
  threadId: z.string().optional(),
  message: z.string().min(1),
  facet: z.enum(FACETS).optional(),
  system: z.string().optional(),
});

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.post("/chat", async (req, reply) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });

    try {
      return await runChat(getDb(), parsed.data);
    } catch (err) {
      if (err instanceof ChatModelError) {
        return reply.code(502).send({ ok: false, error: err.message });
      }
      throw err;
    }
  });
}
