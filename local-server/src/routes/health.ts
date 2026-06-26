/**
 * Rota GET /health — sinal de vida do servidor local, incluindo o estado do SQLite.
 */

import type { FastifyInstance } from "fastify";
import { SERVICE_INFO } from "../config.js";
import { getDb } from "../db/connection.js";

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    let sqlite: "ok" | "error" = "ok";
    try {
      getDb().prepare("SELECT 1").get();
    } catch {
      sqlite = "error";
    }
    return { ok: true, ...SERVICE_INFO, sqlite };
  });
}
