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

export function listLocalRegistros() {
  return localApiRequest<{ registros: unknown[] }>("/registro");
}

export function listLocalMemories() {
  return localApiRequest<{ memories: unknown[] }>("/memories");
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
}) {
  return localApiRequest<{ registro: unknown }>("/registro", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function archiveLocalRegistro(id: string) {
  return localApiRequest<{ ok: true }>(`/registro/${id}`, { method: "DELETE" });
}

export function createLocalMemoria(input: { title: string; content: string; tags?: string[] }) {
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

export type LocalModelStatus = {
  ok: boolean;
  provider: "mock" | "openrouter" | "ollama";
  configured: boolean;
  fallbackToMock: boolean;
  message: string;
};

export function getLocalModelStatus() {
  return localApiRequest<LocalModelStatus>("/model/status");
}

export type LocalBridgeStatus = {
  ok: boolean;
  mode: string;
  deviceIdConfigured: boolean;
  cloudBridgeConfigured: boolean;
  bridgePublicKeyConfigured: boolean;
  lastCloudCheckAt: string | null;
  message: string;
};

export function getLocalBridgeStatus() {
  return localApiRequest<LocalBridgeStatus>("/bridge/status");
}
