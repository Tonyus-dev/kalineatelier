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

export function runMigrations(db: Database.Database): void {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);

  const id = "0001_initial_schema";
  const already = db.prepare("SELECT 1 FROM schema_migrations WHERE id = ?").get(id);
  if (!already) {
    db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
      id,
      new Date().toISOString(),
    );
  }
}
