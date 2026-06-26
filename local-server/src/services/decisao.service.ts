import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";

export type DecisaoRow = {
  id: string;
  title: string;
  content: string;
  project: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export function createDecisao(
  db: Database.Database,
  input: { title: string; content: string; project?: string | null },
): DecisaoRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO decisoes (id, title, content, project, status, created_at, updated_at)
     VALUES (@id, @title, @content, @project, 'aberta', @now, @now)`,
  ).run({ id, title: input.title, content: input.content, project: input.project ?? null, now });
  return db.prepare("SELECT * FROM decisoes WHERE id = ?").get(id) as DecisaoRow;
}

export function listDecisoes(db: Database.Database): DecisaoRow[] {
  return db.prepare("SELECT * FROM decisoes ORDER BY created_at DESC").all() as DecisaoRow[];
}
