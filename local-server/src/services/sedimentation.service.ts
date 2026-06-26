/**
 * Sedimentação determinística (PR 2). Sem IA: a cada 5 mensagens não-sedimentadas de uma
 * thread, cria 1 hipótese em revisão. Nunca confirma automaticamente.
 *
 * Sedimento é hipótese. Sedimentação não confirma verdade.
 */

import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";
import { createMemoria } from "./memory.service.js";

const WINDOW = 5;

export type SedimentoRow = {
  id: string;
  source_type: string;
  source_id: string;
  level: number;
  content: string;
  status: "em_revisao" | "confirmado" | "descartado" | "promovido";
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  discarded_at: string | null;
  metadata_json: string | null;
};

function summarizeWindow(messages: Array<{ role: string; content: string }>): string {
  const joined = messages.map((m) => `[${m.role}] ${m.content}`).join(" · ");
  const trimmed = joined.replace(/\s+/g, " ").trim();
  const max = 500;
  const text = trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
  return `Hipótese determinística sobre 5 mensagens consecutivas: ${text}`;
}

/**
 * Roda a sedimentação de uma thread: para cada bloco de 5 mensagens ainda não
 * sedimentadas (rastreado via metadata_json.threadId + source_id da última mensagem
 * do bloco), cria 1 sedimento em "em_revisao".
 */
export function runSedimentation(db: Database.Database, threadId: string): SedimentoRow[] {
  const messages = db
    .prepare(
      "SELECT id, role, content, created_at FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC",
    )
    .all(threadId) as Array<{ id: string; role: string; content: string; created_at: string }>;

  const existing = db
    .prepare(
      "SELECT source_id FROM sedimentos WHERE source_type = 'chat_window' AND metadata_json LIKE @pattern",
    )
    .all({ pattern: `%"threadId":"${threadId}"%` }) as Array<{ source_id: string }>;
  const sedimentedLastIds = new Set(existing.map((r) => r.source_id));

  const created: SedimentoRow[] = [];

  for (let i = 0; i + WINDOW <= messages.length; i += WINDOW) {
    const window = messages.slice(i, i + WINDOW);
    const lastId = window[window.length - 1].id;
    if (sedimentedLastIds.has(lastId)) continue;

    const id = newId();
    const now = nowIso();
    db.prepare(
      `INSERT INTO sedimentos
         (id, source_type, source_id, level, content, status, created_at, updated_at, confirmed_at, discarded_at, metadata_json)
       VALUES (@id, 'chat_window', @source_id, 1, @content, 'em_revisao', @now, @now, NULL, NULL, @metadata_json)`,
    ).run({
      id,
      source_id: lastId,
      content: summarizeWindow(window),
      now,
      metadata_json: JSON.stringify({ threadId, messageIds: window.map((m) => m.id) }),
    });
    created.push(db.prepare("SELECT * FROM sedimentos WHERE id = ?").get(id) as SedimentoRow);
  }

  return created;
}

export function listSediments(
  db: Database.Database,
  opts: { status?: string } = {},
): SedimentoRow[] {
  if (opts.status) {
    return db
      .prepare("SELECT * FROM sedimentos WHERE status = ? ORDER BY created_at DESC")
      .all(opts.status) as SedimentoRow[];
  }
  return db.prepare("SELECT * FROM sedimentos ORDER BY created_at DESC").all() as SedimentoRow[];
}

/** Confirmar promove o sedimento a uma memória no Jardim. */
export function confirmSediment(
  db: Database.Database,
  id: string,
): { sedimento: SedimentoRow; memoriaId: string } | null {
  const sed = db.prepare("SELECT * FROM sedimentos WHERE id = ?").get(id) as
    | SedimentoRow
    | undefined;
  if (!sed || sed.status !== "em_revisao") return null;

  const memoria = createMemoria(db, {
    title: `Sedimento confirmado · nível ${sed.level}`,
    content: sed.content,
    tags: ["sedimentado"],
    sourceSedimentoId: sed.id,
  });

  const now = nowIso();
  db.prepare(
    "UPDATE sedimentos SET status = 'confirmado', confirmed_at = @now, updated_at = @now WHERE id = @id",
  ).run({ id, now });

  return {
    sedimento: db.prepare("SELECT * FROM sedimentos WHERE id = ?").get(id) as SedimentoRow,
    memoriaId: memoria.id,
  };
}

export function discardSediment(db: Database.Database, id: string): SedimentoRow | null {
  const sed = db.prepare("SELECT * FROM sedimentos WHERE id = ?").get(id) as
    | SedimentoRow
    | undefined;
  if (!sed || sed.status !== "em_revisao") return null;

  const now = nowIso();
  db.prepare(
    "UPDATE sedimentos SET status = 'descartado', discarded_at = @now, updated_at = @now WHERE id = @id",
  ).run({ id, now });
  return db.prepare("SELECT * FROM sedimentos WHERE id = ?").get(id) as SedimentoRow;
}
