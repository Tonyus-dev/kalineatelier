/**
 * Configuração do servidor local da Kaline Offline.
 *
 * Host e porta têm default loopback (127.0.0.1:64113) e podem ser ajustados via env
 * para cenários de desenvolvimento, mas o servidor NUNCA deve escutar em 0.0.0.0
 * por padrão: é estritamente local-first e privado. Ver docs/offline/TUNNEL_READY.md.
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

function loadDotEnv(): void {
  const envPath = path.join(PROJECT_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === "" ? fallback : value;
}

function envBool(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

export const HOST = env("KALINE_LOCAL_HOST", "127.0.0.1");
export const PORT = Number(env("KALINE_LOCAL_PORT", "64113"));

export const DATA_DIR = path.resolve(PROJECT_ROOT, env("KALINE_DATA_DIR", "./data"));
export const DB_PATH = path.resolve(
  PROJECT_ROOT,
  env("KALINE_DATABASE_PATH", "./data/kaline.sqlite"),
);

export const SERVICE_INFO = {
  service: "kaline-local",
  mode: "offline-foundation",
  version: "0.1.0",
} as const;

export const MODEL_CONFIG = {
  provider: env("KALINE_MODEL_PROVIDER", "mock"),
  fallbackToMock: env("KALINE_MODEL_FALLBACK_TO_MOCK", "false") === "true",
  timeoutMs: Number(env("KALINE_MODEL_TIMEOUT_MS", "180000")),
  maxInputChars: Number(env("KALINE_MODEL_MAX_INPUT_CHARS", "24000")),
  primary: env("KALINE_MODEL_PRIMARY", "qwen2.5:1.5b"),
  fallback: env("KALINE_MODEL_FALLBACK", "llama3.2:1b"),
  models: {
    general: env("KALINE_MODEL_GENERAL", "qwen2.5:1.5b"),
    coder: env("KALINE_MODEL_CODER", "qwen2.5-coder:1.5b"),
    summary: env("KALINE_MODEL_SUMMARY", "qwen2.5:1.5b"),
  },
  openrouter: {
    apiKey: env("OPENROUTER_API_KEY", ""),
    baseUrl: env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
    models: {
      general: env("OPENROUTER_MODEL_GENERAL", ""),
      coder: env("OPENROUTER_MODEL_CODER", ""),
      summary: env("OPENROUTER_MODEL_SUMMARY", ""),
    },
  },
  ollama: {
    enabled: envBool("OLLAMA_ENABLED", true),
    baseUrl: env("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
    models: {
      general: env("OLLAMA_MODEL_GENERAL", "llama3.2:1b"),
      router: env("OLLAMA_MODEL_ROUTER", "llama3.2:1b"),
      summary: env("OLLAMA_MODEL_SUMMARY", "llama3.2:1b"),
      reasoning: env("OLLAMA_MODEL_REASONING", "llama3.2:1b"),
      textFallback: env("OLLAMA_MODEL_TEXT_FALLBACK", "qwen2.5:1.5b"),
      vision: env("OLLAMA_MODEL_VISION", "qwen3.5:2b"),
      visionFallback: env("OLLAMA_MODEL_VISION_FALLBACK", "qwen3.5:0.8b"),
      coder: env("OLLAMA_MODEL_CODER", "qwen3.5:0.8b"),
    },
    requestTimeoutMs: Number(env("OLLAMA_REQUEST_TIMEOUT_MS", "120000")),
    numPredict: Number(env("OLLAMA_NUM_PREDICT", "400")),
    keepAlive: env("OLLAMA_KEEP_ALIVE", "30m"),
  },
} as const;

export const VISION_CONFIG = {
  enabled: envBool("VISION_ENABLED", true),
  experimental: envBool("VISION_EXPERIMENTAL", true),
  warning:
    "Visão local é experimental e não deve ser usada como conclusão final em documentos sensíveis.",
} as const;

export const GOVERNANCE_CONFIG = {
  criticalDomainRequiresSource: envBool("CRITICAL_DOMAIN_REQUIRES_SOURCE", true),
  noSourceMessage:
    "Este tema exige fonte verificável. Não encontrei base suficiente para responder com segurança.",
} as const;

export const TRANSCRIPTION_CONFIG = {
  provider: env("KALINE_TRANSCRIBE_PROVIDER", "whisper_cpp"),
  whisperCpp: {
    enabled: envBool("WHISPER_ENABLED", true),
    engine: env("WHISPER_ENGINE", "whisper.cpp"),
    modelSize: env("WHISPER_MODEL", "small"),
    bin: env("WHISPER_CPP_BIN", ""),
    modelPath: env("WHISPER_MODEL_PATH", ""),
    language: env("WHISPER_LANGUAGE", "pt"),
    requestTimeoutMs: Number(env("WHISPER_REQUEST_TIMEOUT_MS", "180000")),
  },
} as const;

export const TTS_CONFIG = {
  provider: env("TTS_PROVIDER", "kokoro-python"),
  kokoro: {
    enabled: envBool("KOKORO_ENABLED", false),
    engine: env("KOKORO_ENGINE", "onnx"),
    model: env("KOKORO_MODEL", "kokoro-82m"),
    modelPath: env("KOKORO_MODEL_PATH", ""),
    voicesPath: env("KOKORO_VOICES_PATH", ""),
    defaultVoice: env("KOKORO_DEFAULT_VOICE", "af_bella"),
    defaultLang: env("KOKORO_DEFAULT_LANG", "pt-br"),
    defaultSpeed: Number(env("KOKORO_DEFAULT_SPEED", "1.0")),
  },
  kokoroPython: {
    enabled: envBool("KOKORO_PYTHON_ENABLED", true),
    pythonBin: env(
      "KOKORO_PYTHON_BIN",
      "/home/tonyus/Kaline/motores/kokoro-python-venv/bin/python",
    ),
    baseDir: env("KOKORO_PYTHON_BASE_DIR", "/home/tonyus/Kaline/motores/kokoro-python"),
    timeoutMs: Number(env("KOKORO_PYTHON_TIMEOUT_MS", "120000")),
  },
} as const;

const BRIDGE_SHARED_KEY_PATH = path.join(DATA_DIR, "bridge-shared-key.txt");

// Resolve KALINE_BRIDGE_SHARED_KEY sem exigir configuração manual: se não vier do
// ambiente, lê a chave já persistida em disco (estável entre reinícios — pareamento
// já feito não pode mudar sozinho) ou gera uma nova na primeira execução e a persiste.
// `wasGenerated` indica se a chave acabou de ser criada nesta execução, para o
// index.ts decidir se mostra o banner de pareamento.
function resolveBridgeSharedKey(): { key: string; wasGenerated: boolean } {
  const fromEnv = env("KALINE_BRIDGE_SHARED_KEY", "");
  if (fromEnv) return { key: fromEnv, wasGenerated: false };

  if (fs.existsSync(BRIDGE_SHARED_KEY_PATH)) {
    const persisted = fs.readFileSync(BRIDGE_SHARED_KEY_PATH, "utf8").trim();
    if (persisted) return { key: persisted, wasGenerated: false };
  }

  const generated = randomBytes(32).toString("base64url");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(BRIDGE_SHARED_KEY_PATH, generated, { mode: 0o600 });
  return { key: generated, wasGenerated: true };
}

const resolvedBridgeSharedKey = resolveBridgeSharedKey();

export const BRIDGE_CONFIG = {
  tunnelMode: env("KALINE_TUNNEL_MODE", "disabled"),
  deviceId: env("KALINE_DEVICE_ID", ""),
  cloudBridgeUrl: env("KALINE_CLOUD_BRIDGE_URL", ""),
  bridgePublicKey: env("KALINE_BRIDGE_PUBLIC_KEY", ""),
  bridgeSharedKey: resolvedBridgeSharedKey.key,
  bridgeSharedKeyWasGenerated: resolvedBridgeSharedKey.wasGenerated,
  bridgeSharedKeyPath: BRIDGE_SHARED_KEY_PATH,
  bridgeUserToken: env("KALINE_BRIDGE_USER_TOKEN", ""),
} as const;

// Estado mutável da ponte (separado de BRIDGE_CONFIG, que é só configuração estática).
// Atualizado pelo serviço do Olhar de Kairós a cada tentativa de pull, sucesso ou erro.
export const BRIDGE_STATE = {
  lastCloudCheckAt: null as string | null,
  lastError: null as string | null,
  lastPullAt: null as string | null,
  lastPullStatus: null as "ok" | "error" | null,
};

export const CORS_ALLOWED_ORIGINS = env(
  "KALINE_CORS_ALLOWED_ORIGINS",
  "http://localhost:5173,http://127.0.0.1:5173",
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
