/**
 * Client mínimo da API local da Kaline Offline.
 *
 * `checkLocalHealth()` nunca lança: em qualquer falha (servidor desligado, timeout,
 * resposta inesperada) retorna um estado controlado, para que a UI possa ser honesta
 * sobre a disponibilidade local sem quebrar.
 *
 * As demais funções (`localApi*`) são chamadas finas sobre os endpoints do PR 2 — sem
 * lógica de UI, sem cache, sem retry. Ainda não são usadas em telas principais.
 */

import { localApiUrl } from "./local-config";

const HEALTH_TIMEOUT_MS = 1500;

export type LocalHealthOk = {
  ok: true;
  service: string;
  mode: string;
  version: string;
};

export type LocalHealthError = {
  ok: false;
  reason: "offline" | "timeout" | "bad-response";
  message: string;
};

export type LocalHealthResult = LocalHealthOk | LocalHealthError;

export async function checkLocalHealth(timeoutMs = HEALTH_TIMEOUT_MS): Promise<LocalHealthResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(localApiUrl("/health"), {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!res.ok) {
      return {
        ok: false,
        reason: "bad-response",
        message: `API local respondeu com status ${res.status}.`,
      };
    }

    const body = (await res.json()) as Partial<LocalHealthOk>;
    if (body?.ok !== true) {
      return { ok: false, reason: "bad-response", message: "Resposta de /health inesperada." };
    }

    return {
      ok: true,
      service: body.service ?? "kaline-local",
      mode: body.mode ?? "unknown",
      version: body.version ?? "0.0.0",
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, reason: "timeout", message: "Tempo de resposta da API local esgotado." };
    }
    return {
      ok: false,
      reason: "offline",
      message: "API local indisponível. Inicie o local-server em 127.0.0.1:64113.",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function localApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(localApiUrl(path), {
    headers: { "content-type": "application/json", accept: "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API local respondeu com status ${res.status} em ${path}.`);
  }
  return (await res.json()) as T;
}

export function listLocalThreads() {
  return localApiRequest<{ threads: unknown[] }>("/threads");
}

export function createLocalThread(input: { title?: string; facet: string }) {
  return localApiRequest<{ thread: unknown }>("/threads", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getLocalThread(threadId: string) {
  return localApiRequest<{ thread: unknown }>(`/threads/${threadId}`);
}

export function listLocalMessages(threadId: string) {
  return localApiRequest<{ messages: unknown[] }>(`/messages/${threadId}`);
}

export function sendLocalChatMessage(input: {
  threadId?: string;
  message: string;
  facet?: string;
}) {
  return localApiRequest<{ thread: unknown; userMessage: unknown; assistantMessage: unknown }>(
    "/chat",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function listLocalRegistros(opts: { kind?: string; limit?: number; since?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.kind) params.set("kind", opts.kind);
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.since) params.set("since", opts.since);
  const query = params.toString() ? `?${params.toString()}` : "";
  return localApiRequest<{ registros: unknown[] }>(`/registro${query}`);
}

export function listLocalMemories(opts: { includeArchived?: boolean; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.includeArchived) params.set("includeArchived", "true");
  if (opts.limit) params.set("limit", String(opts.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return localApiRequest<{ memories: unknown[] }>(`/memories${query}`);
}

export function dueLocalMemorias(limit?: number) {
  const query = limit ? `?limit=${limit}` : "";
  return localApiRequest<{ memories: unknown[] }>(`/memories/due${query}`);
}

export function listLocalSediments(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return localApiRequest<{ sediments: unknown[] }>(`/sediments${query}`);
}

export function createLocalRegistro(input: {
  kind: string;
  title: string;
  content: string;
  source?: string;
  mood?: number | null;
  tags?: string[];
  occurred_at?: string;
}) {
  return localApiRequest<{ registro: unknown }>("/registro", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function archiveLocalRegistro(id: string) {
  return localApiRequest<{ ok: true }>(`/registro/${id}`, { method: "DELETE" });
}

export function createLocalMemoria(input: {
  title: string;
  content: string;
  tags?: string[];
  source?: string;
  sourceRef?: string;
  category?: string;
  importance?: number;
}) {
  return localApiRequest<{ memoria: unknown }>("/memories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function reviewLocalMemoria(id: string, quality: string) {
  return localApiRequest<{ memoria: unknown }>(`/memories/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify({ quality }),
  });
}

export function archiveLocalMemoria(id: string) {
  return localApiRequest<{ ok: true }>(`/memories/${id}/archive`, { method: "PATCH" });
}

export function runLocalSedimentation(threadId: string) {
  return localApiRequest<{ created: unknown[] }>("/sediments/run", {
    method: "POST",
    body: JSON.stringify({ threadId }),
  });
}

export function confirmLocalSediment(id: string) {
  return localApiRequest<{ sedimento: unknown; memoriaId: string }>(`/sediments/${id}/confirm`, {
    method: "POST",
  });
}

export function discardLocalSediment(id: string) {
  return localApiRequest<{ sedimento: unknown }>(`/sediments/${id}/discard`, { method: "POST" });
}

export function listLocalDecisoes() {
  return localApiRequest<{ decisoes: unknown[] }>("/decisoes");
}

export function createLocalDecisao(input: { title: string; content: string; project?: string }) {
  return localApiRequest<{ decisao: unknown }>("/decisoes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listLocalInbox(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return localApiRequest<{ events: unknown[] }>(`/inbox${query}`);
}

export function createLocalInboxEvent(input: {
  source: string;
  type: string;
  title?: string;
  payload: unknown;
}) {
  return localApiRequest<{ event: unknown }>("/inbox", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateLocalInboxEventStatus(id: string, status: string) {
  return localApiRequest<{ event: unknown }>(`/inbox/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listLocalReports() {
  return localApiRequest<{ reports: unknown[] }>("/reports");
}

export function generateLocalReport() {
  return localApiRequest<{ report: unknown }>("/reports/generate", { method: "POST" });
}

export function listLocalSettings() {
  return localApiRequest<{ settings: unknown[] }>("/settings");
}

export function putLocalSetting(key: string, value: unknown) {
  return localApiRequest<{ setting: unknown }>(`/settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
}

export function getLocalIdentity() {
  return localApiRequest<{ summary: string; sources: string[] }>("/identity");
}

export function listLocalEventos(opts: { from?: string; to?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  const query = params.toString() ? `?${params.toString()}` : "";
  return localApiRequest<{ eventos: unknown[] }>(`/eventos${query}`);
}

export function createLocalEvento(input: {
  titulo: string;
  tipo: string;
  inicio: string;
  fim?: string | null;
  local?: string | null;
  descricao?: string | null;
}) {
  return localApiRequest<{ evento: unknown }>("/eventos", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteLocalEvento(id: string) {
  return localApiRequest<{ ok: true }>(`/eventos/${id}`, { method: "DELETE" });
}

export type LocalPresencaState = "green" | "yellow" | "blue" | "red";

export function getLocalPresenca() {
  return localApiRequest<{ presenca: { id: "current"; state: LocalPresencaState; updated_at: string } | null }>(
    "/presenca",
  );
}

export function setLocalPresenca(state: LocalPresencaState) {
  return localApiRequest<{ presenca: { id: "current"; state: LocalPresencaState; updated_at: string } }>(
    "/presenca",
    { method: "PUT", body: JSON.stringify({ state }) },
  );
}

export type LocalModelStatus = {
  ok: boolean;
  provider: "mock" | "openrouter" | "ollama";
  configured: boolean;
  fallbackToMock: boolean;
  message: string;
  status?: string;
  available?: boolean;
  baseUrl?: string;
  models?: Record<string, string | { name: string; available: boolean }>;
  vision?: {
    enabled: boolean;
    experimental: boolean;
    primaryModel: string;
    fallbackModel: string;
    warning: string;
  };
  tts?: {
    provider: string;
    status: string;
    enabled: boolean;
    engine?: string;
    model?: string;
    voice?: string;
    lang?: string;
    message: string;
  };
};

export function getLocalModelStatus() {
  return localApiRequest<LocalModelStatus>("/model/status");
}

export type LocalTestResult =
  | { ok: true; text: string; provider?: string; fallback?: boolean; warning?: string }
  | { ok: false; message: string };

export async function testLocalModel(
  message = "Responda em português: Kaline Offline está acordada?",
): Promise<LocalTestResult> {
  try {
    const res = await sendLocalChatMessage({ message });
    const assistantMessage = res.assistantMessage as {
      content: string;
      metadata_json?: string | null;
    };
    const metadata = assistantMessage.metadata_json
      ? (JSON.parse(assistantMessage.metadata_json) as Record<string, unknown>)
      : null;
    return {
      ok: true,
      text: assistantMessage.content,
      provider: metadata?.provider as string | undefined,
      fallback: metadata?.fallback as boolean | undefined,
      warning: metadata?.warning as string | undefined,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao testar o modelo local.",
    };
  }
}

export type LocalVisionResult =
  | { ok: true; text: string; provider: string; model: string }
  | { ok: false; message: string };

export async function testLocalVision(input: {
  prompt?: string;
  imageBase64: string;
}): Promise<LocalVisionResult> {
  try {
    const body = await localApiRequest<{ provider: string; model: string; text: string }>(
      "/model/vision",
      {
        method: "POST",
        body: JSON.stringify({
          prompt: input.prompt ?? "Leia esta imagem e diga quais textos aparecem nela.",
          imageBase64: input.imageBase64,
        }),
      },
    );
    return { ok: true, text: body.text, provider: body.provider, model: body.model };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao testar a visão local.",
    };
  }
}

export type LocalTranscribeStatus =
  | {
      ok: boolean;
      provider: "whisper_cpp";
      status: string;
      available: true;
      bin: string;
      model: string;
      language: string;
      message: string;
    }
  | { ok: boolean; provider: "whisper_cpp"; status: string; available: false; message: string };

export function getLocalTranscribeStatus() {
  return localApiRequest<LocalTranscribeStatus>("/transcribe/status");
}

export type LocalTtsStatus =
  | {
      ok: boolean;
      provider: string;
      status: string;
      enabled: true;
      engine: string;
      model: string;
      voice: string;
      lang: string;
      message: string;
    }
  | { ok: boolean; provider: string; status: string; enabled: false; message: string };

export function getLocalTtsStatus() {
  return localApiRequest<LocalTtsStatus>("/tts/status");
}

export type LocalTranscribeResult =
  | {
      ok: true;
      text: string;
      provider: string;
      model: string;
      language: string;
      durationMs: number;
    }
  | { ok: false; message: string };

export async function transcribeLocalFile(file: File): Promise<LocalTranscribeResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(localApiUrl("/transcribe/file"), { method: "POST", body: formData });
    const body = await res.json();
    if (!res.ok) {
      return { ok: false, message: body?.error ?? `API local respondeu com status ${res.status}.` };
    }
    return {
      ok: true,
      text: body.text,
      provider: body.provider,
      model: body.model,
      language: body.language,
      durationMs: body.durationMs,
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Falha ao transcrever o áudio.",
    };
  }
}

export type LocalBridgeStatus = {
  ok: boolean;
  mode: string;
  deviceIdConfigured: boolean;
  cloudBridgeConfigured: boolean;
  bridgePublicKeyConfigured: boolean;
  bridgeSharedKeyConfigured: boolean;
  lastCloudCheckAt: string | null;
  lastError: string | null;
  kairos?: {
    enabled: boolean;
    mode: string;
    cloudBridgeConfigured: boolean;
    sharedKeyConfigured: boolean;
    userTokenConfigured: boolean;
    lastPullAt: string | null;
    lastPullStatus: "ok" | "error" | null;
    lastError: string | null;
  };
  message: string;
};

export function getLocalBridgeStatus() {
  return localApiRequest<LocalBridgeStatus>("/bridge/status");
}

export type LocalBridgePullResult =
  | { ok: true; eventsCreated: number }
  | { ok: false; error: string };

export async function pullLocalBridge(): Promise<LocalBridgePullResult> {
  try {
    // Endpoint canônico (online -> offline); /bridge/pull segue como alias deprecado.
    const res = await fetch(localApiUrl("/bridge/olhar-de-kairos/pull-online"), { method: "POST" });
    const body = await res.json();
    if (!res.ok) return { ok: false, error: body?.error ?? `API local respondeu ${res.status}.` };
    return { ok: true, eventsCreated: body.eventsCreated };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao puxar o Olhar de Kairós.",
    };
  }
}

// --- Reuniões (gravação local pelo PWA) ---

export type LocalMeetingTranscribeResult =
  | { ok: true; text: string; durationMs: number; model: string; language: string }
  | { ok: false; error: string };

export async function transcribeLocalMeeting(file: Blob): Promise<LocalMeetingTranscribeResult> {
  try {
    const formData = new FormData();
    formData.append("file", file, "reuniao.webm");
    const res = await fetch(localApiUrl("/meetings/transcribe"), {
      method: "POST",
      body: formData,
    });
    const body = await res.json();
    if (!res.ok) return { ok: false, error: body?.error ?? `API local respondeu ${res.status}.` };
    return {
      ok: true,
      text: body.text,
      durationMs: body.durationMs,
      model: body.model,
      language: body.language,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao transcrever a reunião.",
    };
  }
}

export function saveLocalMeeting(input: {
  title?: string;
  transcript: string;
  durationMs?: number;
  summary?: string;
  participants?: string[];
}) {
  return localApiRequest<{ ok: true; event: unknown }>("/meetings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listLocalMeetings() {
  return localApiRequest<{ meetings: unknown[] }>("/meetings");
}

// --- Câmara de Eco (sessões de escuta, texto ou áudio segmentado) ---

export function listLocalCamaraSessoes() {
  return localApiRequest<{ sessoes: unknown[] }>("/camara/sessoes");
}

export function createLocalCamaraSessao(input: {
  titulo: string;
  origem: "audio" | "texto";
  texto?: string;
}) {
  return localApiRequest<{ sessao: unknown }>("/camara/sessoes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getLocalCamaraSessao(id: string) {
  return localApiRequest<{ sessao: unknown; segmentos: unknown[] }>(`/camara/sessoes/${id}`);
}

export function deleteLocalCamaraSessao(id: string) {
  return localApiRequest<{ ok: true }>(`/camara/sessoes/${id}`, { method: "DELETE" });
}

export function createLocalCamaraSegmento(sessaoId: string) {
  return localApiRequest<{ segmento: unknown }>(`/camara/sessoes/${sessaoId}/segmentos`, {
    method: "POST",
  });
}

export type LocalCamaraTranscreverResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export async function transcreverLocalCamaraSegmento(
  segmentoId: string,
  file: Blob,
): Promise<LocalCamaraTranscreverResult> {
  try {
    const formData = new FormData();
    formData.append("file", file, "segmento.webm");
    const res = await fetch(localApiUrl(`/camara/segmentos/${segmentoId}/transcrever`), {
      method: "POST",
      body: formData,
    });
    const body = await res.json();
    if (!res.ok) return { ok: false, error: body?.error ?? `API local respondeu ${res.status}.` };
    return { ok: true, text: body.text };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Falha ao transcrever o segmento.",
    };
  }
}

export function analisarLocalCamaraSessao(sessaoId: string) {
  return localApiRequest<{
    resumo_operacional: string;
    interlocutores: { nome: string; confianca: string }[];
    temas: string[];
    decisoes: string[];
    sinais: string[];
    proximos_gestos: string[];
    candidatos_revisao: string[];
  }>(`/camara/sessoes/${sessaoId}/analisar`, { method: "POST" });
}

export function semearLocalCamaraHipotese(
  sessaoId: string,
  input: { title: string; body: string; origem: string },
) {
  return localApiRequest<{ id: string }>(`/camara/sessoes/${sessaoId}/semear`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function criarLocalCamaraKairos(
  sessaoId: string,
  input: {
    titulo: string;
    descricao?: string;
    inicio: string;
    fim?: string | null;
    tipo?: string;
  },
) {
  return localApiRequest<{ id: string }>(`/camara/sessoes/${sessaoId}/kairos`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Livros & Resumos ---

export type LocalLivro = {
  id: string;
  titulo: string;
  autor: string | null;
  texto_extraido: string;
  resumo: string | null;
  created_at: string;
  updated_at: string;
};

export function listLocalLivros() {
  return localApiRequest<{ livros: LocalLivro[] }>("/livros");
}

export function createLocalLivro(input: { titulo: string; autor?: string; texto_extraido: string }) {
  return localApiRequest<{ livro: LocalLivro }>("/livros", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteLocalLivro(id: string) {
  return localApiRequest<{ ok: true }>(`/livros/${id}`, { method: "DELETE" });
}

export function gerarLocalResumoLivro(id: string) {
  return localApiRequest<{ resumo: string }>(`/livros/${id}/resumo`, { method: "POST" });
}

// --- Voz (Kokoro, voz Dora) com fallback honesto para o navegador ---

/**
 * Fala `text` usando o Kokoro local (voz Dora) via POST /tts/speak. Se o Kokoro não
 * estiver disponível, cai para a síntese do navegador (window.speechSynthesis) — voz do
 * SO, não fingida. Nunca lança.
 */
export async function speakLocal(text: string, voice = "pf_dora"): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  try {
    const res = await fetch(localApiUrl("/tts/speak"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: trimmed, voice }),
    });
    if (res.ok && (res.headers.get("content-type") ?? "").includes("audio")) {
      const blob = await res.blob();
      await playAudioBlob(blob);
      return;
    }
  } catch {
    // cai para o fallback do navegador
  }
  speakWithBrowser(trimmed);
}

function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const done = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onended = done;
    audio.onerror = done;
    void audio.play().catch(done);
  });
}

function speakWithBrowser(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "pt-BR";
  const ptVoice = window.speechSynthesis
    .getVoices()
    .find(
      (v) =>
        v.lang?.toLowerCase().startsWith("pt") && /female|dora|luciana|maria|fem/i.test(v.name),
    );
  if (ptVoice) utter.voice = ptVoice;
  window.speechSynthesis.speak(utter);
}
