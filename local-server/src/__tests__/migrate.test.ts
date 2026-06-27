import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { runMigrations } from "../db/migrate.js";

test("runMigrations é idempotente (roda duas vezes sem erro)", () => {
  const db = new Database(":memory:");
  runMigrations(db);
  assert.doesNotThrow(() => runMigrations(db));

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all() as Array<{ name: string }>;
  const names = tables.map((t) => t.name);
  for (const expected of ["chat_threads", "registro_vivo", "jardim_memorias", "sedimentos"]) {
    assert.ok(names.includes(expected), `tabela ${expected} deveria existir`);
  }

  const migrations = db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get() as {
    n: number;
  };
  assert.equal(migrations.n, 1, "a migração inicial deveria ser registrada uma única vez");
  db.close();
});
