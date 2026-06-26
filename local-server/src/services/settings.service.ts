import type Database from "better-sqlite3";
import { nowIso } from "../utils/dates.js";

export type SettingRow = {
  key: string;
  value_json: string;
  updated_at: string;
};

export function listSettings(db: Database.Database): SettingRow[] {
  return db.prepare("SELECT * FROM settings ORDER BY key ASC").all() as SettingRow[];
}

export function getSetting(db: Database.Database, key: string): unknown | null {
  const row = db.prepare("SELECT value_json FROM settings WHERE key = ?").get(key) as
    | { value_json: string }
    | undefined;
  return row ? JSON.parse(row.value_json) : null;
}

export function setSetting(db: Database.Database, key: string, value: unknown): SettingRow {
  const now = nowIso();
  db.prepare(
    `INSERT INTO settings (key, value_json, updated_at) VALUES (@key, @value_json, @now)
     ON CONFLICT(key) DO UPDATE SET value_json = @value_json, updated_at = @now`,
  ).run({ key, value_json: JSON.stringify(value), now });
  return db.prepare("SELECT * FROM settings WHERE key = ?").get(key) as SettingRow;
}
