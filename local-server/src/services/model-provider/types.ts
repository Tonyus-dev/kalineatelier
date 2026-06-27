export type ModelRole = "general" | "coder" | "summary";

export type ModelStatus = {
  provider: "mock" | "openrouter" | "ollama";
  configured: boolean;
  models: Record<ModelRole, string>;
  fallbackToMock: boolean;
  message: string;
};

export type EngineStatusKind =
  | "available"
  | "disabled"
  | "misconfigured"
  | "missing_model"
  | "unreachable"
  | "experimental";

export type OllamaModelAvailability = {
  name: string;
  available: boolean;
};

export type OllamaModelRole =
  | "general"
  | "router"
  | "summary"
  | "reasoning"
  | "textFallback"
  | "vision"
  | "visionFallback"
  | "coder";

export type OllamaStatus =
  | {
      provider: "ollama";
      status: EngineStatusKind;
      available: true;
      baseUrl: string;
      models: Record<OllamaModelRole, OllamaModelAvailability>;
      message: string;
    }
  | {
      provider: "ollama";
      status: EngineStatusKind;
      available: false;
      baseUrl: string;
      message: string;
    };

export type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
};
