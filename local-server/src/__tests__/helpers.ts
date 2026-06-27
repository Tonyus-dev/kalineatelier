import Database from "better-sqlite3";
import { runMigrations } from "../db/migrate.js";

/** Banco SQLite em memória, já migrado — isolado por teste, sem tocar em disco. */
export function makeTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}
