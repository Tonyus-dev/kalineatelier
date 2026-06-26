/**
 * Conexão SQLite da Kaline Offline.
 *
 * PRAGMAs aplicados na abertura (ver docs/offline/ARCHITECTURE.md):
 * - WAL: melhora concorrência entre leitura e escrita.
 * - foreign_keys: garante integridade relacional.
 * - busy_timeout: reduz falhas imediatas em pequenas contenções locais.
 */

import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = path.resolve(__dirname, "../../data");
export const DB_PATH = path.join(DATA_DIR, "kaline-local.sqlite");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  return db;
}

export function closeDb(): void {
  db?.close();
  db = null;
}
