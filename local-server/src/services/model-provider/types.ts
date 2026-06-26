export type ModelRole = "general" | "coder" | "summary";

export type ModelStatus = {
  provider: "mock" | "openrouter" | "ollama";
  configured: boolean;
  models: Record<ModelRole, string>;
  fallbackToMock: boolean;
  message: string;
};
