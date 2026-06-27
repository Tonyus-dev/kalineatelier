// Contexto externo: o usuário cola markdown com contexto de outros apps/conversas
// e Kaline passa a ler como diretriz adicional (até `ativo = false` ou apagado).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createLocalContextoExterno,
  deleteLocalContextoExterno,
  listLocalContextosExternos,
  toggleLocalContextoExterno,
} from "@/lib/local/local-api-client";

const MAX_CONTEUDO = 60_000;

const createSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  conteudo: z.string().trim().min(1).max(MAX_CONTEUDO),
});

const toggleSchema = z.object({
  id: z.string().min(1),
  ativo: z.boolean(),
});

const idSchema = z.object({ id: z.string().min(1) });

export const listarContextos = createServerFn({ method: "GET" }).handler(async () => {
  const { contextos } = await listLocalContextosExternos();
  return contextos.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    conteudo: c.conteudo,
    ativo: !!c.ativo,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));
});

export const criarContexto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { contexto } = await createLocalContextoExterno(data);
    return { id: contexto.id };
  });

export const toggleContexto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => toggleSchema.parse(d))
  .handler(async ({ data }) => {
    return toggleLocalContextoExterno(data.id, data.ativo);
  });

export const apagarContexto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    return deleteLocalContextoExterno(data.id);
  });
