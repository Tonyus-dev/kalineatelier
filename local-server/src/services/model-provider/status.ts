/**
 * Status do provider de modelo configurado. Não chama nenhum provider externo,
 * apenas reporta a configuração atual de forma honesta (sem expor secrets).
 */

import { MODEL_CONFIG } from "../../config.js";
import type { ModelStatus } from "./types.js";

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
