import type { FastifyInstance } from "fastify";
import { getIdentitySummary } from "../services/identity.service.js";

export async function registerIdentityRoutes(app: FastifyInstance): Promise<void> {
  app.get("/identity", async () => {
    return getIdentitySummary();
  });
}
