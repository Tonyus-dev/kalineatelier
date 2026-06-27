/**
 * Provider real do Ollama local. Conversa via HTTP com `OLLAMA_BASE_URL`
 * (padrão http://127.0.0.1:11434) — nenhuma chamada de rede externa.
 */

import { MODEL_CONFIG } from "../../config.js";
import type { OllamaChatMessage, OllamaStatus } from "./types.js";

type OllamaTagsResponse = {
  models?: Array<{ name: string }>;
};

type OllamaChatResponse = {
  message?: { role: string; content: string };
  eval_count?: number;
  prompt_eval_count?: number;
};

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function listInstalledModels(): Promise<string[] | null> {
  try {
    const res = await fetchWithTimeout(
      `${MODEL_CONFIG.ollama.baseUrl}/api/tags`,
      { method: "GET" },
      MODEL_CONFIG.ollama.requestTimeoutMs,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as OllamaTagsResponse;
    return (body.models ?? []).map((m) => m.name);
  } catch {
    return null;
  }
}

function modelMatches(installed: string[], wanted: string): boolean {
  return installed.some((name) => name === wanted || name.startsWith(`${wanted.split(":")[0]}:`));
}

export async function getOllamaStatus(): Promise<OllamaStatus> {
  const baseUrl = MODEL_CONFIG.ollama.baseUrl;
  const installed = await listInstalledModels();

  if (installed === null) {
    return {
      provider: "ollama",
      available: false,
      baseUrl,
      message: `Ollama não respondeu em ${baseUrl}.`,
    };
  }

  const { general, summary, vision, coder } = MODEL_CONFIG.ollama.models;
  const models = {
    general: { name: general, available: modelMatches(installed, general) },
    summary: { name: summary, available: modelMatches(installed, summary) },
    vision: { name: vision, available: modelMatches(installed, vision) },
    coder: { name: coder, available: modelMatches(installed, coder) },
  };

  if (!models.general.available) {
    return {
      provider: "ollama",
      available: false,
      baseUrl,
      message: `Ollama ativo, mas o modelo ${general} não foi encontrado. Rode: ollama pull ${general}`,
    };
  }

  return {
    provider: "ollama",
    available: true,
    baseUrl,
    models,
    message: "Ollama conectado e modelo disponível.",
  };
}

export class OllamaError extends Error {}

export async function ollamaChat(input: {
  model: string;
  messages: OllamaChatMessage[];
}): Promise<{ text: string; usage: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await fetchWithTimeout(
      `${MODEL_CONFIG.ollama.baseUrl}/api/chat`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: input.model, stream: false, messages: input.messages }),
      },
      MODEL_CONFIG.ollama.requestTimeoutMs,
    );
  } catch (err) {
    throw new OllamaError(
      `Não foi possível conectar ao Ollama em ${MODEL_CONFIG.ollama.baseUrl}: ${(err as Error).message}`,
    );
  }

  if (!res.ok) {
    throw new OllamaError(`Ollama respondeu com status ${res.status}.`);
  }

  const body = (await res.json()) as OllamaChatResponse;
  if (!body.message?.content) {
    throw new OllamaError("Ollama respondeu sem conteúdo de mensagem.");
  }

  return {
    text: body.message.content,
    usage: {
      promptTokens: body.prompt_eval_count ?? null,
      completionTokens: body.eval_count ?? null,
    },
  };
}
