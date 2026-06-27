/**
 * Contexto externo: blocos de identidade/memória relacional migrados de outra
 * instância (ex.: markdown de uma Kaline anterior), injetados como diretriz
 * adicional no system prompt do chat enquanto `ativo`.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "../db/connection.js";
import {
  createContexto,
  deleteContexto,
  listContextos,
  setAtivo,
} from "../services/contexto-externo.service.js";

const MAX_CONTEUDO = 60_000;

const createSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  conteudo: z.string().trim().min(1).max(MAX_CONTEUDO),
  tipo: z.enum(["identidade", "memoria_relacional"]).optional(),
});

const toggleSchema = z.object({ ativo: z.boolean() });

export async function registerContextoExternoRoutes(app: FastifyInstance): Promise<void> {
  app.get("/contexto-externo", async () => {
    return { contextos: listContextos(getDb()) };
  });

  app.post("/contexto-externo", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    const contexto = createContexto(getDb(), parsed.data);
    return { contexto };
  });

  app.post<{ Params: { id: string } }>("/contexto-externo/:id/toggle", async (req, reply) => {
    const parsed = toggleSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    const ok = setAtivo(getDb(), req.params.id, parsed.data.ativo);
    if (!ok) return reply.code(404).send({ ok: false, error: "Contexto não encontrado" });
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/contexto-externo/:id", async (req, reply) => {
    const ok = deleteContexto(getDb(), req.params.id);
    if (!ok) return reply.code(404).send({ ok: false, error: "Contexto não encontrado" });
    return { ok: true };
  });
}
