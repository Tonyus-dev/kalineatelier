import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";

export type MemoriaRow = {
  id: string;
  title: string;
  content: string;
  tags_json: string;
  ease: number;
  interval_days: number;
  due_at: string | null;
  review_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  source_sedimento_id: string | null;
};

export type ReviewQuality = "errei" | "dificil" | "ok" | "facil";

const QUALITY_ALIASES: Record<string, ReviewQuality> = {
  errei: "errei",
  dificil: "dificil",
  difícil: "dificil",
  ok: "ok",
  facil: "facil",
  fácil: "facil",
};

export function normalizeQuality(raw: string): ReviewQuality | null {
  return QUALITY_ALIASES[raw.trim().toLowerCase()] ?? null;
}

/** SM-2 simplificado, mesmo espírito da repetição espaçada usada no app online. */
function nextSchedule(
  prev: { ease: number; interval_days: number; review_count: number },
  quality: ReviewQuality,
) {
  const qualityScore: Record<ReviewQuality, number> = { errei: 0, dificil: 1, ok: 2, facil: 3 };
  const q = qualityScore[quality];

  let { ease, interval_days, review_count } = prev;
  ease = Math.max(1.3, Math.min(2.8, ease + (0.1 - (3 - q) * 0.08)));

  if (q === 0) {
    interval_days = 1;
    review_count = 0;
  } else if (review_count === 0) {
    interval_days = 1;
  } else if (review_count === 1) {
    interval_days = q >= 2 ? 3 : 1;
  } else {
    interval_days = Math.max(1, Math.round(interval_days * ease));
  }

  return {
    ease,
    interval_days,
    review_count: review_count + 1,
    due_at: new Date(Date.now() + interval_days * 86_400_000).toISOString(),
  };
}

export function createMemoria(
  db: Database.Database,
  input: { title: string; content: string; tags?: string[]; sourceSedimentoId?: string | null },
): MemoriaRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO jardim_memorias
       (id, title, content, tags_json, ease, interval_days, due_at, review_count, created_at, updated_at, archived_at, source_sedimento_id)
     VALUES (@id, @title, @content, @tags_json, 2.5, 0, NULL, 0, @created_at, @updated_at, NULL, @source_sedimento_id)`,
  ).run({
    id,
    title: input.title,
    content: input.content,
    tags_json: JSON.stringify(input.tags ?? []),
    created_at: now,
    updated_at: now,
    source_sedimento_id: input.sourceSedimentoId ?? null,
  });
  return db.prepare("SELECT * FROM jardim_memorias WHERE id = ?").get(id) as MemoriaRow;
}

export function listMemorias(
  db: Database.Database,
  opts: { includeArchived?: boolean; limit?: number } = {},
): MemoriaRow[] {
  const where = opts.includeArchived ? "" : "WHERE archived_at IS NULL";
  return db
    .prepare(`SELECT * FROM jardim_memorias ${where} ORDER BY created_at DESC LIMIT @limit`)
    .all({ limit: opts.limit ?? 100 }) as MemoriaRow[];
}

export function reviewMemoria(
  db: Database.Database,
  id: string,
  quality: ReviewQuality,
): MemoriaRow | null {
  const prev = db.prepare("SELECT * FROM jardim_memorias WHERE id = ?").get(id) as
    | MemoriaRow
    | undefined;
  if (!prev) return null;

  const next = nextSchedule(
    { ease: prev.ease, interval_days: prev.interval_days, review_count: prev.review_count },
    quality,
  );
  db.prepare(
    `UPDATE jardim_memorias
     SET ease = @ease, interval_days = @interval_days, due_at = @due_at,
         review_count = @review_count, updated_at = @updated_at
     WHERE id = @id`,
  ).run({ id, ...next, updated_at: nowIso() });
  return db.prepare("SELECT * FROM jardim_memorias WHERE id = ?").get(id) as MemoriaRow;
}

export function archiveMemoria(db: Database.Database, id: string): boolean {
  const result = db
    .prepare("UPDATE jardim_memorias SET archived_at = @now, updated_at = @now WHERE id = @id")
    .run({ id, now: nowIso() });
  return result.changes > 0;
}
