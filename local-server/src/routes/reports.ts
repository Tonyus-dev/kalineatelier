import type { FastifyInstance } from "fastify";
import { getDb } from "../db/connection.js";
import { generateReport, listReports } from "../services/reports.service.js";

export async function registerReportsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/reports", async () => {
    return { reports: listReports(getDb()) };
  });

  app.post("/reports/generate", async () => {
    return { report: generateReport(getDb()) };
  });
}
