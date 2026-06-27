import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";

export type ContextoTipo = "identidade" | "memoria_relacional";

export type ContextoExternoRow = {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: ContextoTipo;
  ativo: 0 | 1;
  created_at: string;
  updated_at: string;
};

export function createContexto(
  db: Database.Database,
  input: { titulo: string; conteudo: string; tipo?: ContextoTipo },
): ContextoExternoRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO contexto_externo (id, titulo, conteudo, tipo, ativo, created_at, updated_at)
     VALUES (@id, @titulo, @conteudo, @tipo, 1, @created_at, @updated_at)`,
  ).run({
    id,
    titulo: input.titulo,
    conteudo: input.conteudo,
    tipo: input.tipo ?? "identidade",
    created_at: now,
    updated_at: now,
  });
  return db.prepare("SELECT * FROM contexto_externo WHERE id = ?").get(id) as ContextoExternoRow;
}

export function listContextos(db: Database.Database): ContextoExternoRow[] {
  return db
    .prepare("SELECT * FROM contexto_externo ORDER BY updated_at DESC")
    .all() as ContextoExternoRow[];
}

export function listContextosAtivos(db: Database.Database): ContextoExternoRow[] {
  return db
    .prepare("SELECT * FROM contexto_externo WHERE ativo = 1 ORDER BY updated_at DESC LIMIT 10")
    .all() as ContextoExternoRow[];
}

export function setAtivo(db: Database.Database, id: string, ativo: boolean): boolean {
  const result = db
    .prepare("UPDATE contexto_externo SET ativo = ?, updated_at = ? WHERE id = ?")
    .run(ativo ? 1 : 0, nowIso(), id);
  return result.changes > 0;
}

export function deleteContexto(db: Database.Database, id: string): boolean {
  const result = db.prepare("DELETE FROM contexto_externo WHERE id = ?").run(id);
  return result.changes > 0;
}
