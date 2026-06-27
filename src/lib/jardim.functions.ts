import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createLocalMemoria,
  listLocalMemories,
  dueLocalMemorias,
  reviewLocalMemoria,
  archiveLocalMemoria,
} from "@/lib/local/local-api-client";

// quality numérico (0..3) usado pelos botões de revisão, mapeado para a
// qualidade textual aceita pelo SM-2 do local-server.
const QUALITY_BY_NUMBER: Record<0 | 1 | 2 | 3, string> = {
  0: "errei",
  1: "dificil",
  2: "ok",
  3: "facil",
};

type MemoriaRow = {
  id: string;
  title: string;
  content: string;
  tags_json: string;
  ease: number;
  interval_days: number;
  due_at: string | null;
  review_count: number;
  source: string | null;
  source_ref: string | null;
  category: string;
  importance: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

function toClientShape(row: MemoriaRow) {
  return {
    id: row.id,
    title: row.title,
    body: row.content,
    tags: JSON.parse(row.tags_json ?? "[]") as string[],
    ease: row.ease,
    interval_days: row.interval_days,
    next_review_at: row.due_at ?? new Date().toISOString(),
    review_count: row.review_count,
    source: row.source,
    source_ref: row.source_ref,
    category: row.category,
    importance: row.importance,
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
  };
}

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(8000),
  source: z.string().trim().max(60).optional(),
  source_ref: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  importance: z.number().int().min(1).max(3).optional(),
});

export const createMemoria = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof CreateSchema>) => CreateSchema.parse(d))
  .handler(async ({ data }) => {
    const { memoria } = await createLocalMemoria({
      title: data.title,
      content: data.body,
      tags: data.tags ?? [],
      source: data.source,
      sourceRef: data.source_ref,
      category: data.category ?? "geral",
      importance: data.importance ?? 2,
    });
    return toClientShape(memoria as MemoriaRow);
  });

export const listMemorias = createServerFn({ method: "POST" })
  .inputValidator((d: { archived?: boolean; limit?: number; category?: string }) =>
    z
      .object({
        archived: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        category: z.string().trim().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { memories } = await listLocalMemories({
      includeArchived: data.archived,
      limit: data.limit ?? 100,
    });
    let rows = (memories as MemoriaRow[]).map(toClientShape);
    if (data.category) rows = rows.filter((m) => m.category === data.category);
    return rows;
  });

export const dueMemorias = createServerFn({ method: "POST" })
  .inputValidator((d: { limit?: number }) =>
    z.object({ limit: z.number().int().min(1).max(100).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { memories } = await dueLocalMemorias(data.limit ?? 20);
    return (memories as MemoriaRow[]).map(toClientShape);
  });

export const reviewMemoria = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; quality: 0 | 1 | 2 | 3 }) =>
    z.object({ id: z.string().uuid(), quality: z.number().int().min(0).max(3) }).parse(d),
  )
  .handler(async ({ data }) => {
    const quality = QUALITY_BY_NUMBER[data.quality as 0 | 1 | 2 | 3];
    const { memoria } = await reviewLocalMemoria(data.id, quality);
    return toClientShape(memoria as MemoriaRow);
  });

export const archiveMemoria = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; archive: boolean }) =>
    z.object({ id: z.string().uuid(), archive: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.archive) {
      await archiveLocalMemoria(data.id);
    }
    return { ok: true };
  });
