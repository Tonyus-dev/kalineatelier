import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";

export type LivroRow = {
  id: string;
  titulo: string;
  autor: string | null;
  texto_extraido: string;
  resumo: string | null;
  created_at: string;
  updated_at: string;
};

export function createLivro(
  db: Database.Database,
  input: { titulo: string; autor?: string | null; textoExtraido: string },
): LivroRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO livros (id, titulo, autor, texto_extraido, resumo, created_at, updated_at)
     VALUES (@id, @titulo, @autor, @texto_extraido, NULL, @created_at, @updated_at)`,
  ).run({
    id,
    titulo: input.titulo,
    autor: input.autor ?? null,
    texto_extraido: input.textoExtraido,
    created_at: now,
    updated_at: now,
  });
  return getLivro(db, id) as LivroRow;
}

export function getLivro(db: Database.Database, id: string): LivroRow | null {
  return (db.prepare("SELECT * FROM livros WHERE id = ?").get(id) as LivroRow) ?? null;
}

export function listLivros(db: Database.Database): LivroRow[] {
  return db.prepare("SELECT * FROM livros ORDER BY created_at DESC").all() as LivroRow[];
}

export function deleteLivro(db: Database.Database, id: string): boolean {
  const result = db.prepare("DELETE FROM livros WHERE id = ?").run(id);
  return result.changes > 0;
}

export function setResumo(db: Database.Database, id: string, resumo: string): void {
  db.prepare("UPDATE livros SET resumo = ?, updated_at = ? WHERE id = ?").run(
    resumo,
    nowIso(),
    id,
  );
}
