/**
 * Olhar de Kairós — montagem do snapshot LOCAL que o app online pode puxar.
 *
 * Escopo deliberado: um retrato consolidado, de tamanho limitado, do estado atual da
 * Kaline Offline. NÃO é sync genérico — sem cursor, sem fila, sem incremental. Cada
 * chamada recalcula o snapshot do zero. Nunca inclui segredos, tokens, chaves nem
 * áudio cru. Schema fixo e versionado: `olhar-de-kairos.snapshot.v1`.
 */

import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import { BRIDGE_CONFIG } from "../config.js";
import { nowIso } from "../utils/dates.js";
import { listRegistros } from "./registro.service.js";
import { listSediments } from "./sedimentation.service.js";
import { listDecisoes } from "./decisao.service.js";
import { listInboxEvents } from "./inbox.service.js";
import { getIdentitySummary } from "./identity.service.js";

export const SNAPSHOT_SCHEMA = "olhar-de-kairos.snapshot.v1";

const LIMITS = {
  maxMessages: 25,
  maxCalendarEvents: 25,
  maxMeetingTranscripts: 10,
  maxRegistro: 25,
  maxSediments: 25,
  maxDecisions: 25,
  maxTranscriptChars: 4000,
  maxBytes: 250000,
} as const;

// Tempo de validade do retrato — orienta o consumidor a não tratar como verdade eterna.
const EXPIRES_IN_MS = 10 * 60 * 1000;

type MessageRow = {
  id: string;
  thread_id: string;
  role: string;
  content: string;
  created_at: string;
};

export function buildLocalKairosSnapshot(db: Database.Database): {
  schema: string;
  origin: "offline";
  deviceId: string;
  createdAt: string;
  expiresAt: string;
  summary: { title: string; description: string };
  identity: { summary: string; sources: string[] };
  calendar: { events: unknown[] };
  meetings: {
    transcripts: Array<{ id: string; title: string | null; transcript: string; createdAt: string }>;
  };
  chat: {
    lastMessages: Array<{
      id: string;
      threadId: string;
      role: string;
      content: string;
      createdAt: string;
    }>;
  };
  memory: {
    registroVivo: Array<{
      id: string;
      kind: string;
      title: string;
      content: string;
      createdAt: string;
    }>;
    sediments: Array<{ id: string; status: string; content: string; createdAt: string }>;
    decisions: Array<{
      id: string;
      title: string;
      content: string;
      status: string;
      createdAt: string;
    }>;
  };
  limits: typeof LIMITS;
  integrity: { hash: string };
} {
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + EXPIRES_IN_MS).toISOString();

  const identity = getIdentitySummary();

  const lastMessages = (
    db
      .prepare(
        "SELECT id, thread_id, role, content, created_at FROM chat_messages ORDER BY created_at DESC LIMIT ?",
      )
      .all(LIMITS.maxMessages) as MessageRow[]
  )
    .slice()
    .reverse()
    .map((m) => ({
      id: m.id,
      threadId: m.thread_id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));

  // Reuniões transcritas vivem como eventos de inbox (type='meeting_transcript').
  const meetingEvents = listInboxEvents(db, { type: "meeting_transcript" });
  const transcripts = meetingEvents.slice(0, LIMITS.maxMeetingTranscripts).map((e) => {
    let transcript = "";
    try {
      const payload = JSON.parse(e.payload_json) as { transcript?: string };
      transcript = (payload?.transcript ?? "").slice(0, LIMITS.maxTranscriptChars);
    } catch {
      transcript = "";
    }
    return { id: e.id, title: e.title, transcript, createdAt: e.received_at };
  });

  const registroVivo = listRegistros(db, { limit: LIMITS.maxRegistro }).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    content: r.content,
    createdAt: r.created_at,
  }));

  const sediments = listSediments(db, { status: "em_revisao" })
    .slice(0, LIMITS.maxSediments)
    .map((s) => ({ id: s.id, status: s.status, content: s.content, createdAt: s.created_at }));

  const decisions = listDecisoes(db)
    .slice(0, LIMITS.maxDecisions)
    .map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      status: d.status,
      createdAt: d.created_at,
    }));

  const snapshot = {
    schema: SNAPSHOT_SCHEMA,
    origin: "offline" as const,
    deviceId: BRIDGE_CONFIG.deviceId || "kaline-offline",
    createdAt,
    expiresAt,
    summary: {
      title: "Snapshot da Kaline Offline",
      description: "Contexto consolidado para revisão. Nada aqui é verdade final.",
    },
    identity,
    calendar: { events: [] as unknown[] }, // calendário local ainda não modelado nesta fase
    meetings: { transcripts },
    chat: { lastMessages },
    memory: { registroVivo, sediments, decisions },
    limits: LIMITS,
    integrity: { hash: "" },
  };

  // Hash de integridade calculado sobre o corpo (sem o próprio campo hash).
  const body = JSON.stringify({ ...snapshot, integrity: undefined });
  snapshot.integrity.hash = `sha256:${createHash("sha256").update(body).digest("hex")}`;

  return snapshot;
}
