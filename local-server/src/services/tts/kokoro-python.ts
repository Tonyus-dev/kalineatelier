/**
 * TTS local via kokoro-python (Dora PT-BR offline).
 *
 * Chama o script `local-server/scripts/kokoro_dora_tts.py` com o Python do venv
 * do usuário. Não depende de Hugging Face, Supabase, Fal ou OpenRouter em runtime.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TTS_CONFIG } from "../../config.js";

export class KokoroPythonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KokoroPythonError";
  }
}

export type KokoroPythonStatus =
  | {
      provider: "kokoro-python";
      status: "available";
      enabled: true;
      engine: "kokoro-python";
      voice: "pf_dora";
      lang: "pt-br";
      offline: true;
      message: string;
    }
  | {
      provider: "kokoro-python";
      status: "misconfigured" | "disabled";
      enabled: false;
      message: string;
    };

const MAX_TEXT_CHARS = 2000;

function resolveHome(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

export function getKokoroPythonStatus(): KokoroPythonStatus {
  const cfg = TTS_CONFIG.kokoroPython;
  if (!cfg.enabled) {
    return {
      provider: "kokoro-python",
      status: "disabled",
      enabled: false,
      message: "kokoro-python desabilitado (KOKORO_PYTHON_ENABLED=false).",
    };
  }

  const baseDir = resolveHome(cfg.baseDir);
  const configPath = path.join(baseDir, "config.json");
  const modelPath = path.join(baseDir, "kokoro-v1_0.pth");
  const voicePath = path.join(baseDir, "voices", "pf_dora.pt");

  const missing: string[] = [];
  if (!fs.existsSync(configPath)) missing.push("config.json");
  if (!fs.existsSync(modelPath)) missing.push("kokoro-v1_0.pth");
  if (!fs.existsSync(voicePath)) missing.push("voices/pf_dora.pt");
  if (missing.length > 0) {
    return {
      provider: "kokoro-python",
      status: "misconfigured",
      enabled: false,
      message: `Arquivo(s) não encontrado(s) em ${baseDir}: ${missing.join(", ")}.`,
    };
  }

  if (!cfg.pythonBin || !fs.existsSync(cfg.pythonBin)) {
    return {
      provider: "kokoro-python",
      status: "misconfigured",
      enabled: false,
      message: `Python do venv não encontrado: ${cfg.pythonBin}.`,
    };
  }

  return {
    provider: "kokoro-python",
    status: "available",
    enabled: true,
    engine: "kokoro-python",
    voice: "pf_dora",
    lang: "pt-br",
    offline: true,
    message: "Dora PT-BR offline configurada.",
  };
}

export interface SynthesizeOptions {
  speed?: number;
}

export function synthesizeWithKokoroPython(
  text: string,
  opts: SynthesizeOptions = {},
): Promise<Buffer> {
  const cfg = TTS_CONFIG.kokoroPython;
  const scriptPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "..",
    "..",
    "scripts",
    "kokoro_dora_tts.py",
  );

  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    return Promise.reject(new KokoroPythonError("Texto vazio."));
  }
  if (trimmed.length > MAX_TEXT_CHARS) {
    return Promise.reject(new KokoroPythonError(`Texto excede ${MAX_TEXT_CHARS} caracteres.`));
  }

  const speed = opts.speed ?? 1.0;
  const outFile = path.join(os.tmpdir(), `kaline-dora-${process.pid}-${Date.now()}.wav`);

  return new Promise<Buffer>((resolve, reject) => {
    const child = spawn(
      cfg.pythonBin,
      [
        scriptPath,
        "--text",
        trimmed,
        "--out",
        outFile,
        "--speed",
        String(speed),
        "--base-dir",
        resolveHome(cfg.baseDir),
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      cleanup();
      reject(new KokoroPythonError(`kokoro-python excedeu o timeout de ${cfg.timeoutMs}ms.`));
    }, cfg.timeoutMs);

    function cleanup(): void {
      if (fs.existsSync(outFile)) {
        try {
          fs.unlinkSync(outFile);
        } catch {
          // ignora erro de limpeza
        }
      }
    }

    child.on("error", (err) => {
      clearTimeout(timer);
      cleanup();
      reject(new KokoroPythonError(`Falha ao executar kokoro-python: ${err.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        cleanup();
        const detail = stderr.trim() || stdout.trim() || "(sem saída)";
        reject(new KokoroPythonError(`kokoro-python falhou (exit=${code}): ${detail}`));
        return;
      }
      try {
        const buf = fs.readFileSync(outFile);
        fs.unlinkSync(outFile);
        resolve(buf);
      } catch (err) {
        cleanup();
        reject(new KokoroPythonError(`Falha ao ler WAV gerado: ${(err as Error).message}`));
      }
    });
  });
}
