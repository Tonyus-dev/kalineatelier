/**
 * Status do provider de modelo configurado. Reporta a configuração de forma honesta
 * (sem expor secrets) e, no caso do Ollama, consulta o serviço local real.
 */

import { MODEL_CONFIG } from "../../config.js";
import { getOllamaStatus } from "./ollama.js";
import type { ModelStatus, OllamaStatus } from "./types.js";

export function getModelStatus(): ModelStatus {
  const provider = MODEL_CONFIG.provider as ModelStatus["provider"];

  if (provider === "openrouter") {
    return {
      provider,
      configured: MODEL_CONFIG.openrouter.apiKey !== "",
      models: MODEL_CONFIG.openrouter.models,
      fallbackToMock: MODEL_CONFIG.fallbackToMock,
      message: MODEL_CONFIG.openrouter.apiKey
        ? "OpenRouter configurado. Consumirá créditos da conta configurada."
        : "OpenRouter selecionado, mas OPENROUTER_API_KEY não está configurada.",
    };
  }

  if (provider === "ollama") {
    return {
      provider,
      configured: true,
      primaryModel: MODEL_CONFIG.ollama.models.general,
      fallbackModel: MODEL_CONFIG.ollama.models.textFallback,
      models: MODEL_CONFIG.ollama.models,
      fallbackToMock: MODEL_CONFIG.fallbackToMock,
      message: `Ollama selecionado em ${MODEL_CONFIG.ollama.baseUrl}. Verifique se o Ollama está rodando localmente.`,
    };
  }

  return {
    provider: "mock",
    configured: true,
    models: MODEL_CONFIG.models,
    fallbackToMock: MODEL_CONFIG.fallbackToMock,
    message: "Provider mock ativo — nenhuma IA real é consultada nesta fase.",
  };
}

export async function getRealModelStatus(): Promise<
  | { provider: "mock"; available: true; message: string }
  | { provider: "openrouter"; available: boolean; message: string }
  | OllamaStatus
> {
  const provider = MODEL_CONFIG.provider as ModelStatus["provider"];

  if (provider === "ollama") {
    return getOllamaStatus();
  }

  if (provider === "openrouter") {
    const configured = MODEL_CONFIG.openrouter.apiKey !== "";
    return {
      provider,
      available: configured,
      message: configured
        ? "OpenRouter configurado. Consumirá créditos da conta configurada."
        : "OpenRouter selecionado, mas OPENROUTER_API_KEY não está configurada.",
    };
  }

  return {
    provider: "mock",
    available: true,
    message: "Provider mock ativo — nenhuma IA real é consultada nesta fase.",
  };
}
