// Trilha de sedimentação inline + leitura de provenance — Kaline Offline.
// Cliente puro (sem chamada AI) — só lê o que já existe no local-server.

import { listLocalMessages, listLocalSediments } from "@/lib/local/local-api-client";

export type SedimentoRow = {
  id: string;
  thread_id: string;
  nivel: string;
  status: string;
  source_kind: string;
  source_ids: string[];
  hipotese: string;
  resumo: string | null;
  confianca: number;
  created_at: string;
  promovido_para: string | null;
  promovido_tipo: string | null;
};

export type ChatMessageRow = {
  id: string;
  role: string;
  content: string;
  created_at: string;
  derived_from: string[];
};

type LocalSedimentoRow = {
  id: string;
  source_type: string;
  source_id: string;
  level: number;
  content: string;
  status: string;
  created_at: string;
  metadata_json: string | null;
};

type LocalMessageRow = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

function toSedimentoRow(row: LocalSedimentoRow, threadId: string): SedimentoRow | null {
  const metadata = row.metadata_json
    ? (JSON.parse(row.metadata_json) as { threadId?: string; messageIds?: string[] })
    : null;
  if (!metadata || metadata.threadId !== threadId) return null;
  return {
    id: row.id,
    thread_id: threadId,
    nivel: "short_term",
    status: row.status,
    source_kind: row.source_type === "chat_window" ? "chat_message" : row.source_type,
    source_ids: metadata.messageIds ?? [],
    hipotese: row.content,
    resumo: null,
    confianca: 2,
    created_at: row.created_at,
    promovido_para: null,
    promovido_tipo: null,
  };
}

export async function loadTrilha(threadId: string) {
  const [msgsRes, sedsRes] = await Promise.all([
    listLocalMessages(threadId),
    listLocalSediments(),
  ]);

  const messages = (msgsRes.messages as LocalMessageRow[]).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    created_at: m.created_at,
    derived_from: [],
  }));

  const sedimentos = (sedsRes.sediments as LocalSedimentoRow[])
    .map((s) => toSedimentoRow(s, threadId))
    .filter((s): s is SedimentoRow => s !== null);

  return { messages, sedimentos };
}

// Sedimentos que cobrem uma dada mensagem (aparecem como "compactado a partir daqui").
export function sedimentosForMessage(sedimentos: SedimentoRow[], messageId: string) {
  return sedimentos.filter(
    (s) => s.source_kind === "chat_message" && s.source_ids.includes(messageId),
  );
}

// Mensagens-fonte que entraram no contexto de uma resposta da Kaline.
export function sourcesForAssistant(messages: ChatMessageRow[], assistantId: string) {
  const target = messages.find((m) => m.id === assistantId);
  if (!target) return [];
  const ids = new Set(target.derived_from);
  return messages.filter((m) => ids.has(m.id));
}

export const NIVEL_META: Record<string, { label: string; subtitle: string }> = {
  iconic: {
    label: "Icônica · impressão sensorial",
    subtitle: "registro instantâneo do que apareceu antes de virar linguagem",
  },
  echoic: {
    label: "Ecoica · ressonância auditiva",
    subtitle: "eco curto da fala, tom e formulação antes da primeira síntese",
  },
  short_term: {
    label: "Atencional · curto prazo",
    subtitle: "traço ativo recém-comprimido: 5 mensagens → 1 hipótese",
  },
  working: {
    label: "Operatória · memória de trabalho",
    subtitle: "bancada mental que combina 5 hipóteses em uma síntese manipulável",
  },
  prospective: {
    label: "Prospectiva · simulação de futuro",
    subtitle: "direções, intenções e possibilidades que começam a ganhar vetor",
  },
  episodic: {
    label: "Episódica · cena autobiográfica",
    subtitle: "conjunto situado de acontecimentos, contexto e passagem no tempo",
  },
  semantic: {
    label: "Semântica · significado consolidado",
    subtitle: "entendimento conceitual mais estável, menos preso à cena original",
  },
  procedural: {
    label: "Procedural · hábito incorporado",
    subtitle: "regra de operação, preferência ou modo de agir que pode orientar execução",
  },
};

export const NIVEL_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(NIVEL_META).map(([nivel, meta]) => [nivel, meta.label]),
);

export const NIVEL_SUBTITLE: Record<string, string> = Object.fromEntries(
  Object.entries(NIVEL_META).map(([nivel, meta]) => [nivel, meta.subtitle]),
);

export const STATUS_LABEL: Record<string, string> = {
  rascunho: "rascunho",
  em_revisao: "em revisão",
  confirmado: "confirmado",
  descartado: "descartado",
};
