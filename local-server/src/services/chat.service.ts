import type Database from "better-sqlite3";
import { newId } from "../utils/ids.js";
import { nowIso } from "../utils/dates.js";

export const FACETS = ["kaline", "kharis", "kuanyin", "coder"] as const;
export type Facet = (typeof FACETS)[number];

export type ThreadRow = {
  id: string;
  title: string;
  facet: Facet;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type MessageRow = {
  id: string;
  thread_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
  metadata_json: string | null;
};

export function createThread(
  db: Database.Database,
  input: { title?: string; facet: Facet },
): ThreadRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO chat_threads (id, title, facet, created_at, updated_at, archived_at)
     VALUES (@id, @title, @facet, @now, @now, NULL)`,
  ).run({ id, title: input.title?.trim() || "Nova conversa", facet: input.facet, now });
  return getThread(db, id) as ThreadRow;
}

export function listThreads(db: Database.Database): ThreadRow[] {
  return db
    .prepare("SELECT * FROM chat_threads WHERE archived_at IS NULL ORDER BY updated_at DESC")
    .all() as ThreadRow[];
}

export function getThread(db: Database.Database, id: string): ThreadRow | null {
  return (db.prepare("SELECT * FROM chat_threads WHERE id = ?").get(id) as ThreadRow) ?? null;
}

export function updateThread(
  db: Database.Database,
  id: string,
  patch: Partial<{ title: string; archived: boolean }>,
): ThreadRow | null {
  const existing = getThread(db, id);
  if (!existing) return null;

  db.prepare(
    `UPDATE chat_threads SET title = @title, archived_at = @archived_at, updated_at = @now WHERE id = @id`,
  ).run({
    id,
    title: patch.title ?? existing.title,
    archived_at:
      patch.archived === undefined ? existing.archived_at : patch.archived ? nowIso() : null,
    now: nowIso(),
  });
  return getThread(db, id);
}

export function listMessages(db: Database.Database, threadId: string): MessageRow[] {
  return db
    .prepare("SELECT * FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC")
    .all(threadId) as MessageRow[];
}

function insertMessage(
  db: Database.Database,
  input: { threadId: string; role: MessageRow["role"]; content: string },
): MessageRow {
  const id = newId();
  const now = nowIso();
  db.prepare(
    `INSERT INTO chat_messages (id, thread_id, role, content, created_at, metadata_json)
     VALUES (@id, @thread_id, @role, @content, @now, NULL)`,
  ).run({ id, thread_id: input.threadId, role: input.role, content: input.content, now });
  db.prepare("UPDATE chat_threads SET updated_at = @now WHERE id = @id").run({
    id: input.threadId,
    now,
  });
  return db.prepare("SELECT * FROM chat_messages WHERE id = ?").get(id) as MessageRow;
}

/**
 * Provider de modelo MOCK do local-server. Espelha o contrato de
 * `src/lib/local/model-provider.mock.ts` do frontend, mas é independente: os dois
 * projetos são isolados de propósito (ver docs/offline/ARCHITECTURE.md).
 */
function mockGenerate(userMessage: string): string {
  return (
    "[resposta mock estrutural — nenhum modelo real foi consultado]\n\n" +
    `Você disse: ${userMessage}`
  );
}

export function runChat(
  db: Database.Database,
  input: { threadId?: string; message: string; facet?: Facet },
): { thread: ThreadRow; userMessage: MessageRow; assistantMessage: MessageRow } {
  const thread = input.threadId
    ? (getThread(db, input.threadId) ?? createThread(db, { facet: input.facet ?? "kaline" }))
    : createThread(db, { facet: input.facet ?? "kaline" });

  const userMessage = insertMessage(db, {
    threadId: thread.id,
    role: "user",
    content: input.message,
  });

  const assistantMessage = insertMessage(db, {
    threadId: thread.id,
    role: "assistant",
    content: mockGenerate(input.message),
  });

  return { thread: getThread(db, thread.id) as ThreadRow, userMessage, assistantMessage };
}
