import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createLocalRegistro,
  listLocalRegistros,
  archiveLocalRegistro,
} from "@/lib/local/local-api-client";

const kinds = [
  "nota",
  "evento",
  "sentimento",
  "ideia",
  "dor",
  "ganho",
  "sonho",
  "pergunta",
] as const;

const CreateSchema = z.object({
  kind: z.enum(kinds),
  body: z.string().trim().min(1).max(8000),
  mood: z.number().int().min(-3).max(3).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  occurred_at: z.string().datetime().optional(),
});

const ListSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  kind: z.enum(kinds).optional(),
  since: z.string().datetime().optional(),
});

type RegistroRow = {
  id: string;
  kind: string;
  content: string;
  mood: number | null;
  tags_json: string;
  occurred_at: string | null;
};

function toClientShape(row: RegistroRow) {
  return {
    id: row.id,
    kind: row.kind,
    body: row.content,
    mood: row.mood,
    tags: JSON.parse(row.tags_json ?? "[]") as string[],
    occurred_at: row.occurred_at ?? new Date().toISOString(),
  };
}

export const createRegistro = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof CreateSchema>) => CreateSchema.parse(data))
  .handler(async ({ data }) => {
    const { registro } = await createLocalRegistro({
      kind: data.kind,
      title: data.body.slice(0, 80),
      content: data.body,
      mood: data.mood ?? null,
      tags: data.tags ?? [],
      occurred_at: data.occurred_at,
    });
    return toClientShape(registro as RegistroRow);
  });

export const listRegistros = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof ListSchema>) => ListSchema.parse(data))
  .handler(async ({ data }) => {
    const { registros } = await listLocalRegistros({
      kind: data.kind,
      limit: data.limit ?? 50,
      since: data.since,
    });
    return (registros as RegistroRow[]).map(toClientShape);
  });

export const deleteRegistro = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await archiveLocalRegistro(data.id);
    return { ok: true };
  });
