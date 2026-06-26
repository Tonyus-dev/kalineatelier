/**
 * Geração determinística de relatórios em Markdown. Sem IA: agrega dados já existentes
 * no SQLite local em um snapshot legível.
 */

import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";
import { listRegistros } from "./registro.service.js";
import { listMemorias } from "./memory.service.js";
import { listSediments } from "./sedimentation.service.js";
import { listDecisoes } from "./decisao.service.js";

export type ReportRow = {
  id: string;
  title: string;
  kind: string;
  content_md: string;
  created_at: string;
  updated_at: string;
};

function buildDailySummaryMarkdown(db: Database.Database): string {
  const registros = listRegistros(db, { limit: 10 });
  const decisoes = listDecisoes(db).slice(0, 10);
  const sedimentosEmRevisao = listSediments(db, { status: "em_revisao" }).slice(0, 10);
  const memorias = listMemorias(db, { limit: 10 });

  const lines: string[] = [];
  lines.push(`# Resumo do dia — ${nowIso()}`, "");

  lines.push("## Decisões recentes");
  if (decisoes.length === 0) lines.push("- (nenhuma)");
  for (const d of decisoes) lines.push(`- [${d.status}] ${d.title}`);
  lines.push("");

  lines.push("## Sedimentos em revisão");
  if (sedimentosEmRevisao.length === 0) lines.push("- (nenhum)");
  for (const s of sedimentosEmRevisao) lines.push(`- (nível ${s.level}) ${s.content}`);
  lines.push("");

  lines.push("## Registro Vivo recente");
  if (registros.length === 0) lines.push("- (nenhum)");
  for (const r of registros) lines.push(`- [${r.kind}] ${r.title}`);
  lines.push("");

  lines.push("## Memórias do Jardim (pendentes/recentes)");
  if (memorias.length === 0) lines.push("- (nenhuma)");
  for (const m of memorias) lines.push(`- ${m.title} (revisões: ${m.review_count})`);
  lines.push("");

  lines.push("## Próximos passos");
  lines.push("- Revisar sedimentos em_revisao no Jardim.");
  lines.push("- Confirmar ou descartar hipóteses pendentes.");

  return lines.join("\n");
}

export function generateReport(db: Database.Database, input: { kind?: string } = {}): ReportRow {
  const kind = input.kind ?? "resumo_diario";
  const content_md = buildDailySummaryMarkdown(db);
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO reports (id, title, kind, content_md, created_at, updated_at)
     VALUES (@id, @title, @kind, @content_md, @now, @now)`,
  ).run({ id, title: `Resumo do dia — ${now}`, kind, content_md, now });
  return db.prepare("SELECT * FROM reports WHERE id = ?").get(id) as ReportRow;
}

export function listReports(db: Database.Database): ReportRow[] {
  return db.prepare("SELECT * FROM reports ORDER BY created_at DESC").all() as ReportRow[];
}
