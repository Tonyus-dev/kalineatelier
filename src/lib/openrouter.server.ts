import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return key;
}

export function createOpenRouterProvider() {
  return createOpenAICompatible({
    name: "openrouter",
    apiKey: getOpenRouterApiKey(),
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer":
        process.env.OPENROUTER_SITE_URL ??
        process.env.APP_PUBLIC_URL ??
        "https://kaline-totalidade.local",
      "X-Title": process.env.OPENROUTER_APP_NAME ?? "Kaline Totalidade",
    },
  });
}
