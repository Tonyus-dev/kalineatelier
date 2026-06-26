import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";

export const REGISTRO_KINDS = [
  "nota",
  "evento",
  "sentimento",
  "ideia",
  "dor",
  "ganho",
  "sonho",
  "pergunta",
  "decisao",
] as const;
export type RegistroKind = (typeof REGISTRO_KINDS)[number];

export type RegistroRow = {
  id: string;
  kind: RegistroKind;
  title: string;
  content: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export function createRegistro(
  db: Database.Database,
  input: { kind: RegistroKind; title: string; content: string; source?: string | null },
): RegistroRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO registro_vivo (id, kind, title, content, source, created_at, updated_at, archived_at)
     VALUES (@id, @kind, @title, @content, @source, @created_at, @updated_at, NULL)`,
  ).run({
    id,
    kind: input.kind,
    title: input.title,
    content: input.content,
    source: input.source ?? null,
    created_at: now,
    updated_at: now,
  });
  return db.prepare("SELECT * FROM registro_vivo WHERE id = ?").get(id) as RegistroRow;
}

export function listRegistros(
  db: Database.Database,
  opts: { kind?: RegistroKind; includeArchived?: boolean; limit?: number } = {},
): RegistroRow[] {
  const limit = opts.limit ?? 100;
  const clauses: string[] = [];
  const params: Record<string, unknown> = { limit };

  if (!opts.includeArchived) clauses.push("archived_at IS NULL");
  if (opts.kind) {
    clauses.push("kind = @kind");
    params.kind = opts.kind;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(`SELECT * FROM registro_vivo ${where} ORDER BY created_at DESC LIMIT @limit`)
    .all(params) as RegistroRow[];
}

export function updateRegistro(
  db: Database.Database,
  id: string,
  patch: Partial<{ title: string; content: string; kind: RegistroKind }>,
): RegistroRow | null {
  const existing = db.prepare("SELECT * FROM registro_vivo WHERE id = ?").get(id) as
    | RegistroRow
    | undefined;
  if (!existing) return null;

  db.prepare(
    `UPDATE registro_vivo SET title = @title, content = @content, kind = @kind, updated_at = @updated_at
     WHERE id = @id`,
  ).run({
    id,
    title: patch.title ?? existing.title,
    content: patch.content ?? existing.content,
    kind: patch.kind ?? existing.kind,
    updated_at: nowIso(),
  });
  return db.prepare("SELECT * FROM registro_vivo WHERE id = ?").get(id) as RegistroRow;
}

/** Soft delete via archived_at. */
export function archiveRegistro(db: Database.Database, id: string): boolean {
  const result = db
    .prepare("UPDATE registro_vivo SET archived_at = @now, updated_at = @now WHERE id = @id")
    .run({ id, now: nowIso() });
  return result.changes > 0;
}
