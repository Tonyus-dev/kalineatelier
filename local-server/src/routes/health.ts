/**
 * Rota GET /health — sinal de vida do servidor local.
 *
 * Nesta fase reporta apenas o serviço, o modo e a versão. No PR 2 passará a reportar
 * também o estado do SQLite.
 */

import type { FastifyInstance } from "fastify";
import { SERVICE_INFO } from "../config.js";

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return { ok: true, ...SERVICE_INFO };
  });
}
