import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";

export type CamaraSessaoRow = {
  id: string;
  titulo: string;
  origem: "audio" | "texto";
  texto: string | null;
  analise_json: string | null;
  analise_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CamaraSegmentoRow = {
  id: string;
  sessao_id: string;
  ordem: number;
  status: "pending" | "processing" | "transcribed" | "failed";
  transcricao: string | null;
  erro: string | null;
  created_at: string;
  updated_at: string;
};

export function createSessao(
  db: Database.Database,
  input: { titulo: string; origem: "audio" | "texto"; texto?: string | null },
): CamaraSessaoRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO camara_sessoes (id, titulo, origem, texto, created_at, updated_at)
     VALUES (@id, @titulo, @origem, @texto, @created_at, @updated_at)`,
  ).run({
    id,
    titulo: input.titulo,
    origem: input.origem,
    texto: input.texto ?? null,
    created_at: now,
    updated_at: now,
  });
  return getSessao(db, id) as CamaraSessaoRow;
}

export function getSessao(db: Database.Database, id: string): CamaraSessaoRow | null {
  return (
    (db.prepare("SELECT * FROM camara_sessoes WHERE id = ?").get(id) as
      | CamaraSessaoRow
      | undefined) ?? null
  );
}

export function listSessoes(db: Database.Database): CamaraSessaoRow[] {
  return db
    .prepare("SELECT * FROM camara_sessoes ORDER BY created_at DESC")
    .all() as CamaraSessaoRow[];
}

export function deleteSessao(db: Database.Database, id: string): boolean {
  const result = db.prepare("DELETE FROM camara_sessoes WHERE id = ?").run(id);
  return result.changes > 0;
}

export function setAnalise(db: Database.Database, id: string, analiseJson: string): void {
  db.prepare(
    "UPDATE camara_sessoes SET analise_json = ?, analise_at = ?, updated_at = ? WHERE id = ?",
  ).run(analiseJson, nowIso(), nowIso(), id);
}

export function createSegmento(
  db: Database.Database,
  input: { sessaoId: string; ordem: number },
): CamaraSegmentoRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO camara_segmentos (id, sessao_id, ordem, status, created_at, updated_at)
     VALUES (@id, @sessao_id, @ordem, 'pending', @created_at, @updated_at)`,
  ).run({ id, sessao_id: input.sessaoId, ordem: input.ordem, created_at: now, updated_at: now });
  return getSegmento(db, id) as CamaraSegmentoRow;
}

export function getSegmento(db: Database.Database, id: string): CamaraSegmentoRow | null {
  return (
    (db.prepare("SELECT * FROM camara_segmentos WHERE id = ?").get(id) as
      | CamaraSegmentoRow
      | undefined) ?? null
  );
}

export function listSegmentos(db: Database.Database, sessaoId: string): CamaraSegmentoRow[] {
  return db
    .prepare("SELECT * FROM camara_segmentos WHERE sessao_id = ? ORDER BY ordem ASC")
    .all(sessaoId) as CamaraSegmentoRow[];
}

export function setSegmentoStatus(
  db: Database.Database,
  id: string,
  patch: { status: CamaraSegmentoRow["status"]; transcricao?: string | null; erro?: string | null },
): void {
  db.prepare(
    "UPDATE camara_segmentos SET status = ?, transcricao = ?, erro = ?, updated_at = ? WHERE id = ?",
  ).run(patch.status, patch.transcricao ?? null, patch.erro ?? null, nowIso(), id);
}
