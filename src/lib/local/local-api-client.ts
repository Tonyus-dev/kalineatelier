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
      message: "API local indisponível. Inicie o local-server em 127.0.0.1:4517.",
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
