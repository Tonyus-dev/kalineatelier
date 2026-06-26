/**
 * Configuração do servidor local da Kaline Offline.
 *
 * Host e porta têm default loopback (127.0.0.1:4517) e podem ser ajustados via env
 * para cenários de desenvolvimento, mas o servidor NUNCA deve escutar em 0.0.0.0
 * por padrão: é estritamente local-first e privado. Ver docs/offline/TUNNEL_READY.md.
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

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

export const HOST = env("KALINE_LOCAL_HOST", "127.0.0.1");
export const PORT = Number(env("KALINE_LOCAL_PORT", "4517"));

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
  timeoutMs: Number(env("KALINE_MODEL_TIMEOUT_MS", "60000")),
  maxInputChars: Number(env("KALINE_MODEL_MAX_INPUT_CHARS", "24000")),
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
    baseUrl: env("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
    models: {
      general: env("OLLAMA_MODEL_GENERAL", "qwen2.5:1.5b"),
      coder: env("OLLAMA_MODEL_CODER", "qwen2.5-coder:1.5b"),
      summary: env("OLLAMA_MODEL_SUMMARY", "qwen2.5:1.5b"),
    },
  },
} as const;

export const BRIDGE_CONFIG = {
  tunnelMode: env("KALINE_TUNNEL_MODE", "disabled"),
  deviceId: env("KALINE_DEVICE_ID", ""),
  cloudBridgeUrl: env("KALINE_CLOUD_BRIDGE_URL", ""),
  bridgePublicKey: env("KALINE_BRIDGE_PUBLIC_KEY", ""),
  lastCloudCheckAt: null as string | null,
} as const;

export const CORS_ALLOWED_ORIGINS = env(
  "KALINE_CORS_ALLOWED_ORIGINS",
  "http://localhost:5173,http://127.0.0.1:5173",
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
