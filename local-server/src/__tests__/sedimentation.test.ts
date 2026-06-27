import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTestDb } from "./helpers.js";
import { createThread } from "../services/chat.service.js";
import {
  runSedimentation,
  confirmSediment,
  discardSediment,
  listSediments,
} from "../services/sedimentation.service.js";
import { listMemorias } from "../services/memory.service.js";

function seedMessages(db: ReturnType<typeof makeTestDb>, threadId: string, count: number): void {
  const stmt = db.prepare(
    `INSERT INTO chat_messages (id, thread_id, role, content, created_at, metadata_json)
     VALUES (@id, @thread_id, @role, @content, @created_at, NULL)`,
  );
  for (let i = 0; i < count; i++) {
    stmt.run({
      id: `msg-${i}`,
      thread_id: threadId,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `mensagem ${i}`,
      created_at: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
    });
  }
}

test("runSedimentation cria 1 hipótese a cada janela de 5 mensagens", () => {
  const db = makeTestDb();
  const thread = createThread(db, { facet: "kaline" });
  seedMessages(db, thread.id, 5);

  const created = runSedimentation(db, thread.id);
  assert.equal(created.length, 1);
  assert.equal(created[0].status, "em_revisao");

  // Rodar de novo não duplica a mesma janela.
  assert.equal(runSedimentation(db, thread.id).length, 0);
  db.close();
});

test("confirmSediment promove a memória atomicamente e marca confirmado", () => {
  const db = makeTestDb();
  const thread = createThread(db, { facet: "kaline" });
  seedMessages(db, thread.id, 5);
  const [sed] = runSedimentation(db, thread.id);

  const result = confirmSediment(db, sed.id);
  assert.ok(result, "confirmSediment deveria retornar resultado");

  const memorias = listMemorias(db, { limit: 10 });
  assert.equal(memorias.length, 1);
  assert.equal(memorias[0].id, result!.memoriaId);
  assert.equal(memorias[0].source_sedimento_id, sed.id);

  const confirmados = listSediments(db, { status: "confirmado" });
  assert.equal(confirmados.length, 1);

  // Confirmar de novo não faz nada (já não está em_revisao).
  assert.equal(confirmSediment(db, sed.id), null);
  db.close();
});

test("discardSediment marca descartado sem criar memória", () => {
  const db = makeTestDb();
  const thread = createThread(db, { facet: "kaline" });
  seedMessages(db, thread.id, 5);
  const [sed] = runSedimentation(db, thread.id);

  const discarded = discardSediment(db, sed.id);
  assert.ok(discarded);
  assert.equal(discarded!.status, "descartado");
  assert.equal(listMemorias(db, { limit: 10 }).length, 0);
  db.close();
});
