/**
 * Serviço de transcrição via whisper.cpp local. Chama o binário `whisper-cli` com
 * `execFile` (argumentos em array, sem shell) — nunca concatena comando como string.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import { TRANSCRIPTION_CONFIG } from "../../config.js";
import type { EngineStatusKind } from "../model-provider/types.js";

export type TranscriptionStatus =
  | {
      provider: "whisper_cpp";
      status: EngineStatusKind;
      available: true;
      engine: string;
      bin: string;
      model: string;
      language: string;
      message: string;
    }
  | {
      provider: "whisper_cpp";
      status: EngineStatusKind;
      available: false;
      message: string;
    };

export function getTranscriptionStatus(): TranscriptionStatus {
  const { enabled, engine, bin, modelPath, language } = TRANSCRIPTION_CONFIG.whisperCpp;

  if (!enabled) {
    return {
      provider: "whisper_cpp",
      status: "disabled",
      available: false,
      message: "Whisper desabilitado (WHISPER_ENABLED=false).",
    };
  }

  if (!bin || !fs.existsSync(bin)) {
    return {
      provider: "whisper_cpp",
      status: "misconfigured",
      available: false,
      message: "WHISPER_CPP_BIN não encontrado. Configure o caminho do binário whisper-cli.",
    };
  }

  if (!modelPath || !fs.existsSync(modelPath)) {
    return {
      provider: "whisper_cpp",
      status: "misconfigured",
      available: false,
      message: "WHISPER_MODEL_PATH não encontrado.",
    };
  }

  return {
    provider: "whisper_cpp",
    status: "available",
    available: true,
    engine,
    bin,
    model: modelPath,
    language: language || "pt",
    message: "Whisper.cpp configurado.",
  };
}

export class WhisperError extends Error {}

/**
 * Transcreve um arquivo de áudio já salvo em disco (caminho temporário).
 * Não apaga o arquivo — quem chama é responsável por limpar depois.
 */
export function transcribeFile(filePath: string): Promise<{ text: string; durationMs: number }> {
  const status = getTranscriptionStatus();
  if (!status.available) {
    return Promise.reject(new WhisperError(status.message));
  }

  const { bin, model, language } = status;
  const args = ["-m", model, "-f", filePath, "-l", language, "-nt"];
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    execFile(
      bin,
      args,
      { timeout: TRANSCRIPTION_CONFIG.whisperCpp.requestTimeoutMs, maxBuffer: 1024 * 1024 * 16 },
      (err, stdout) => {
        const durationMs = Date.now() - startedAt;
        if (err) {
          reject(new WhisperError(`Falha ao executar whisper-cli: ${err.message}`));
          return;
        }
        resolve({ text: stdout.trim(), durationMs });
      },
    );
  });
}
