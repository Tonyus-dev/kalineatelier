/**
 * TTS local via kokoro-python (Dora PT-BR offline) — persistent worker.
 *
 * Spawns the `kokoro_dora_worker.py` process once on first use. The worker
 * loads the Kokoro model into memory and stays alive, accepting JSON-RPC
 * requests over stdin/stdout. This avoids the ~10s cold-start of loading
 * the model on every call.
 *
 * Protocol:
 *   TS → Python (stdin):  {"id":N,"method":"synthesize","text":"...","speed":1.0}
 *   Python → TS (stdout): JSON header line + raw WAV bytes
 *   Error:                {"id":N,"ok":false,"error":"..."}
 *
 * The worker is automatically restarted if it crashes. On server shutdown,
 * a "shutdown" request is sent and the process is allowed to exit gracefully.
 */

import { spawn, type ChildProcess } from "node:child_process";
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

// ---------------------------------------------------------------------------
// Persistent worker manager
// ---------------------------------------------------------------------------

let nextReqId = 1;

interface PendingRequest {
  resolve: (wav: Buffer) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface WorkerState {
  process: ChildProcess | null;
  ready: boolean;
  pending: Map<number, PendingRequest>;
  /** Buffer accumulating stdout bytes for the current response. */
  headerLine: string | null;
  remainingWavBytes: number;
  wavChunks: Buffer[];
  initResolve: ((value: boolean) => void) | null;
  initReject: ((reason: Error) => void) | null;
}

const state: WorkerState = {
  process: null,
  ready: false,
  pending: new Map(),
  headerLine: null,
  remainingWavBytes: 0,
  wavChunks: [],
  initResolve: null,
  initReject: null,
};

function getScriptPath(): string {
  return path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "..",
    "..",
    "..",
    "scripts",
    "kokoro_dora_worker.py",
  );
}

/**
 * Start the persistent worker process. Resolves to `true` when the worker
 * reports it is ready, or rejects on failure.
 */
function startWorker(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const cfg = TTS_CONFIG.kokoroPython;
    const scriptPath = getScriptPath();
    const baseDir = resolveHome(cfg.baseDir);

    const child = spawn(
      cfg.pythonBin,
      [scriptPath, "--base-dir", baseDir],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    state.process = child;
    state.ready = false;
    state.headerLine = null;
    state.remainingWavBytes = 0;
    state.wavChunks = [];
    state.initResolve = resolve;
    state.initReject = reject;

    let stderrBuf = "";

    child.stderr!.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString("utf8");
      // Log worker stderr for debugging but don't treat as fatal
      process.stderr?.write?.(`[kokoro-worker stderr] ${chunk.toString("utf8")}`);
    });

    child.on("error", (err) => {
      const error = new KokoroPythonError(`Falha ao iniciar worker: ${err.message}`);
      // Reject all pending requests
      for (const [id, pending] of state.pending) {
        clearTimeout(pending.timer);
        pending.reject(error);
      }
      state.pending.clear();
      state.process = null;
      state.ready = false;
      if (state.initReject) {
        state.initReject(error);
        state.initResolve = null;
        state.initReject = null;
      }
    });

    child.on("close", (code, signal) => {
      const error = new KokoroPythonError(
        `Worker encerrou inesperadamente (code=${code}, signal=${signal})`,
      );
      // Reject all pending requests
      for (const [id, pending] of state.pending) {
        clearTimeout(pending.timer);
        pending.reject(error);
      }
      state.pending.clear();
      state.process = null;
      state.ready = false;
      // If we were still initializing, reject the init promise
      if (state.initReject) {
        state.initReject(error);
        state.initResolve = null;
        state.initReject = null;
      }
    });

    // Process stdout: JSON header line + WAV binary data
    child.stdout!.on("data", (chunk: Buffer) => {
      processStdoutChunk(chunk);
    });
  });
}

/**
 * Process a chunk of stdout data from the worker.
 *
 * The protocol is:
 *   1. A JSON line (terminated by \n) — the header
 *   2. If ok=true, exactly `size_bytes` raw WAV bytes follow
 *   3. Next request's JSON line, etc.
 */
function processStdoutChunk(chunk: Buffer): void {
  let offset = 0;

  while (offset < chunk.length) {
    if (state.headerLine === null) {
      // We're looking for the JSON header line
      const newlineIdx = chunk.indexOf(0x0a, offset); // \n
      if (newlineIdx === -1) {
        // No newline yet — buffer partial line
        state.headerLine = chunk.subarray(offset).toString("utf8");
        return;
      }

      // We have a complete header line
      const line = chunk.subarray(offset, newlineIdx).toString("utf8");
      offset = newlineIdx + 1;

      // If we had a partial line buffered, prepend it
      const fullLine = state.headerLine !== "" ? state.headerLine + line : line;
      state.headerLine = null;

      let header: Record<string, unknown>;
      try {
        header = JSON.parse(fullLine) as Record<string, unknown>;
      } catch {
        // Malformed JSON — skip
        continue;
      }

      const reqId = header.id as number;

      // Init message (id=0)
      if (reqId === 0) {
        if (header.ok === true) {
          state.ready = true;
          if (state.initResolve) {
            state.initResolve(true);
            state.initResolve = null;
            state.initReject = null;
          }
        } else {
          const errMsg = (header.error as string) ?? "Erro desconhecido na inicialização.";
          if (state.initReject) {
            state.initReject(new KokoroPythonError(errMsg));
            state.initResolve = null;
            state.initReject = null;
          }
        }
        continue;
      }

      // Error response (no WAV data follows)
      if (header.ok !== true) {
        const pending = state.pending.get(reqId);
        if (pending) {
          clearTimeout(pending.timer);
          state.pending.delete(reqId);
          pending.reject(
            new KokoroPythonError((header.error as string) ?? "Erro desconhecido."),
          );
        }
        continue;
      }

      // Success response — WAV data of `size_bytes` follows
      const sizeBytes = header.size_bytes as number;
      state.remainingWavBytes = sizeBytes;
      state.wavChunks = [];

      // Store header for the pending request (we'll need it when all bytes arrive)
      // We use a special marker: store the header on the pending request
      const pending = state.pending.get(reqId);
      if (pending) {
        // Attach header info for later use
        (pending as PendingRequest & { _header: Record<string, unknown> })._header = header;
      }

      // If there are remaining bytes in this chunk after the header, process them as WAV
      if (offset < chunk.length) {
        const wavPart = chunk.subarray(offset, Math.min(offset + state.remainingWavBytes, chunk.length));
        state.wavChunks.push(wavPart);
        state.remainingWavBytes -= wavPart.length;
        offset += wavPart.length;

        if (state.remainingWavBytes <= 0) {
          finishWavResponse(reqId);
        }
      }
    } else {
      // We're reading WAV bytes
      const wavPart = chunk.subarray(offset, Math.min(offset + state.remainingWavBytes, chunk.length));
      state.wavChunks.push(wavPart);
      state.remainingWavBytes -= wavPart.length;
      offset += wavPart.length;

      if (state.remainingWavBytes <= 0) {
        // Find the reqId for this response — it's the one with a _header
        let reqId = 0;
        for (const [id, pending] of state.pending) {
          if ((pending as PendingRequest & { _header?: unknown })._header) {
            reqId = id;
            break;
          }
        }
        if (reqId > 0) {
          finishWavResponse(reqId);
        }
      }
    }
  }
}

function finishWavResponse(reqId: number): void {
  const pending = state.pending.get(reqId);
  if (!pending) return;

  clearTimeout(pending.timer);
  state.pending.delete(reqId);

  const wav = Buffer.concat(state.wavChunks);
  state.wavChunks = [];
  state.remainingWavBytes = 0;
  state.headerLine = null;

  pending.resolve(wav);
}

/**
 * Ensure the worker is running and ready. Starts it if needed, or waits
 * for the current startup to complete.
 */
let initPromise: Promise<boolean> | null = null;

async function ensureWorker(): Promise<void> {
  if (state.process && state.ready) return;

  if (!initPromise) {
    initPromise = startWorker();
  }

  const ok = await initPromise;
  if (!ok) {
    initPromise = null;
    throw new KokoroPythonError("Worker não inicializou.");
  }
}

/**
 * Send a synthesize request to the persistent worker.
 */
export async function synthesizeWithKokoroPython(
  text: string,
  opts: SynthesizeOptions = {},
): Promise<Buffer> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    return Promise.reject(new KokoroPythonError("Texto vazio."));
  }
  if (trimmed.length > MAX_TEXT_CHARS) {
    return Promise.reject(new KokoroPythonError(`Texto excede ${MAX_TEXT_CHARS} caracteres.`));
  }

  // If worker is dead, reset so it restarts
  if (state.process === null) {
    initPromise = null;
  }

  await ensureWorker();

  const reqId = nextReqId++;
  const speed = opts.speed ?? 1.0;
  const cfg = TTS_CONFIG.kokoroPython;

  return new Promise<Buffer>((resolve, reject) => {
    const timer = setTimeout(() => {
      state.pending.delete(reqId);
      reject(new KokoroPythonError(`kokoro-python excedeu o timeout de ${cfg.timeoutMs}ms.`));
    }, cfg.timeoutMs);

    state.pending.set(reqId, { resolve, reject, timer });

    const request = JSON.stringify({
      id: reqId,
      method: "synthesize",
      text: trimmed,
      speed,
    });

    try {
      state.process!.stdin!.write(request + "\n");
    } catch (err) {
      clearTimeout(timer);
      state.pending.delete(reqId);
      reject(new KokoroPythonError(`Falha ao enviar request ao worker: ${(err as Error).message}`));
    }
  });
}

/**
 * Gracefully shut down the persistent worker. Call on server close.
 */
export function shutdownKokoroWorker(): void {
  if (!state.process) return;

  try {
    const shutdownReq = JSON.stringify({ id: 0, method: "shutdown" });
    state.process.stdin!.write(shutdownReq + "\n");
    state.process.stdin!.end();
  } catch {
    // Best effort
  }

  // Give it a moment, then force kill
  setTimeout(() => {
    if (state.process) {
      state.process.kill("SIGKILL");
      state.process = null;
      state.ready = false;
    }
  }, 3000);

  // Reject any remaining pending requests
  for (const [id, pending] of state.pending) {
    clearTimeout(pending.timer);
    pending.reject(new KokoroPythonError("Worker encerrado."));
  }
  state.pending.clear();
}