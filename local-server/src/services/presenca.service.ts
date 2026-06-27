import type Database from "better-sqlite3";
import { nowIso } from "../utils/dates.js";

export const PRESENCA_STATES = ["green", "yellow", "blue", "red"] as const;
export type PresencaState = (typeof PRESENCA_STATES)[number];

export type PresencaRow = { id: "current"; state: PresencaState; updated_at: string };

export function getPresenca(db: Database.Database): PresencaRow | null {
  return (db.prepare("SELECT * FROM presenca_regime WHERE id = 'current'").get() as
    | PresencaRow
    | undefined) ?? null;
}

export function setPresenca(db: Database.Database, state: PresencaState): PresencaRow {
  const now = nowIso();
  db.prepare(
    `INSERT INTO presenca_regime (id, state, updated_at) VALUES ('current', @state, @now)
     ON CONFLICT(id) DO UPDATE SET state = @state, updated_at = @now`,
  ).run({ state, now });
  return getPresenca(db) as PresencaRow;
}
