import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";

export const TIPOS_EVENTO = [
  "compromisso",
  "aula",
  "reuniao",
  "evento",
  "prazo",
  "outro",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export type EventoRow = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoEvento;
  inicio: string;
  fim: string | null;
  local: string | null;
  created_at: string;
  updated_at: string;
};

export function createEvento(
  db: Database.Database,
  input: {
    titulo: string;
    tipo: TipoEvento;
    inicio: string;
    fim?: string | null;
    local?: string | null;
    descricao?: string | null;
  },
): EventoRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO eventos (id, titulo, descricao, tipo, inicio, fim, local, created_at, updated_at)
     VALUES (@id, @titulo, @descricao, @tipo, @inicio, @fim, @local, @created_at, @updated_at)`,
  ).run({
    id,
    titulo: input.titulo,
    descricao: input.descricao ?? null,
    tipo: input.tipo,
    inicio: input.inicio,
    fim: input.fim ?? null,
    local: input.local ?? null,
    created_at: now,
    updated_at: now,
  });
  return db.prepare("SELECT * FROM eventos WHERE id = ?").get(id) as EventoRow;
}

export function listEventos(
  db: Database.Database,
  opts: { from?: string; to?: string } = {},
): EventoRow[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.from) {
    clauses.push("inicio >= @from");
    params.from = opts.from;
  }
  if (opts.to) {
    clauses.push("inicio < @to");
    params.to = opts.to;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(`SELECT * FROM eventos ${where} ORDER BY inicio ASC`)
    .all(params) as EventoRow[];
}

export function deleteEvento(db: Database.Database, id: string): boolean {
  const result = db.prepare("DELETE FROM eventos WHERE id = ?").run(id);
  return result.changes > 0;
}
