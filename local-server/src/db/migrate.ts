/**
 * Migração idempotente: aplica schema.sql inteiro a cada boot.
 * Todas as instruções usam CREATE TABLE/INDEX IF NOT EXISTS, então rodar de novo é seguro.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function runMigrations(db: Database.Database): void {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);

  addColumnIfMissing(db, "registro_vivo", "mood", "INTEGER");
  addColumnIfMissing(db, "registro_vivo", "tags_json", "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(db, "registro_vivo", "occurred_at", "TEXT");
  addColumnIfMissing(db, "jardim_memorias", "source", "TEXT");
  addColumnIfMissing(db, "jardim_memorias", "source_ref", "TEXT");
  addColumnIfMissing(db, "jardim_memorias", "category", "TEXT NOT NULL DEFAULT 'geral'");
  addColumnIfMissing(db, "jardim_memorias", "importance", "INTEGER NOT NULL DEFAULT 2");

  const id = "0001_initial_schema";
  const already = db.prepare("SELECT 1 FROM schema_migrations WHERE id = ?").get(id);
  if (!already) {
    db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
      id,
      new Date().toISOString(),
    );
  }
}
