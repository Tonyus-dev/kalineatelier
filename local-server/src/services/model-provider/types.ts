export type ModelRole = "general" | "coder" | "summary";

export type ModelStatus = {
  provider: "mock" | "openrouter" | "ollama";
  configured: boolean;
  models: Record<ModelRole, string>;
  fallbackToMock: boolean;
  message: string;
};

export type OllamaModelAvailability = {
  name: string;
  available: boolean;
};

export type OllamaStatus =
  | {
      provider: "ollama";
      available: true;
      baseUrl: string;
      models: Record<"general" | "summary" | "vision" | "coder", OllamaModelAvailability>;
      message: string;
    }
  | {
      provider: "ollama";
      available: false;
      baseUrl: string;
      message: string;
    };

export type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
};
