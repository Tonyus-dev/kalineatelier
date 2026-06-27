/**
 * Inbox de eventos locais. Preparado para a ponte futura, mas nesta fase só aceita
 * eventos enviados diretamente à API local — sem criptografia, Worker ou sync.
 */

import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";

export type TrustLevel = "local" | "untrusted" | "trusted";
export type InboxStatus = "pending" | "accepted" | "discarded" | "processed" | "error";

export type InboxEventRow = {
  id: string;
  source: string;
  type: string;
  title: string | null;
  payload_json: string;
  trust_level: TrustLevel;
  status: InboxStatus;
  received_at: string;
  processed_at: string | null;
  error: string | null;
  metadata_json: string | null;
};

export function createInboxEvent(
  db: Database.Database,
  input: {
    source: string;
    type: string;
    title?: string | null;
    payload?: unknown;
    trustLevel?: TrustLevel;
  },
): InboxEventRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO inbox_events
       (id, source, type, title, payload_json, trust_level, status, received_at, processed_at, error, metadata_json)
     VALUES (@id, @source, @type, @title, @payload_json, @trust_level, 'pending', @now, NULL, NULL, NULL)`,
  ).run({
    id,
    source: input.source,
    type: input.type,
    title: input.title ?? null,
    payload_json: JSON.stringify(input.payload),
    trust_level: input.trustLevel ?? "local",
    now,
  });
  return db.prepare("SELECT * FROM inbox_events WHERE id = ?").get(id) as InboxEventRow;
}

export function listInboxEvents(
  db: Database.Database,
  opts: { status?: InboxStatus; type?: string } = {},
): InboxEventRow[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.status) {
    clauses.push("status = @status");
    params.status = opts.status;
  }
  if (opts.type) {
    clauses.push("type = @type");
    params.type = opts.type;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return db
    .prepare(`SELECT * FROM inbox_events ${where} ORDER BY received_at DESC`)
    .all(params) as InboxEventRow[];
}

export function updateInboxEventStatus(
  db: Database.Database,
  id: string,
  status: InboxStatus,
): InboxEventRow | null {
  const existing = db.prepare("SELECT * FROM inbox_events WHERE id = ?").get(id) as
    | InboxEventRow
    | undefined;
  if (!existing) return null;

  const now = nowIso();
  db.prepare(
    `UPDATE inbox_events SET status = @status,
       processed_at = CASE WHEN @status IN ('processed', 'discarded') THEN @now ELSE processed_at END
     WHERE id = @id`,
  ).run({ id, status, now });
  return db.prepare("SELECT * FROM inbox_events WHERE id = ?").get(id) as InboxEventRow;
}
