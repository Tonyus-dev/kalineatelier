import type { FastifyInstance } from "fastify";
import { getDb } from "../db/connection.js";
import { listMessages } from "../services/chat.service.js";

export async function registerMessagesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { threadId: string } }>("/messages/:threadId", async (req) => {
    return { messages: listMessages(getDb(), req.params.threadId) };
  });
}
