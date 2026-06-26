/**
 * Rota GET /model/status — reporta o provider de modelo configurado, sem expor secrets.
 */

import type { FastifyInstance } from "fastify";
import { getModelStatus } from "../services/model-provider/status.js";

export async function registerModelRoutes(app: FastifyInstance): Promise<void> {
  app.get("/model/status", async () => {
    return { ok: true, ...getModelStatus() };
  });
}
