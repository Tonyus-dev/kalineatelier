/**
 * Status do TTS Kokoro 82M local. Apenas declara configuração/status nesta fase —
 * a síntese de voz em si ainda não é chamada por nenhuma rota.
 */

import fs from "node:fs";
import { TTS_CONFIG } from "../../config.js";
import type { EngineStatusKind } from "../model-provider/types.js";

export type TtsStatus =
  | {
      provider: string;
      status: EngineStatusKind;
      enabled: true;
      engine: string;
      model: string;
      voice: string;
      lang: string;
      message: string;
    }
  | {
      provider: string;
      status: EngineStatusKind;
      enabled: false;
      message: string;
    };

export function getTtsStatus(): TtsStatus {
  const { enabled, engine, model, modelPath, voicesPath, defaultVoice, defaultLang } =
    TTS_CONFIG.kokoro;
  const provider = TTS_CONFIG.provider;

  if (!enabled) {
    return {
      provider,
      status: "disabled",
      enabled: false,
      message: "Kokoro desabilitado (KOKORO_ENABLED=false).",
    };
  }

  if (!modelPath || !fs.existsSync(modelPath) || !voicesPath || !fs.existsSync(voicesPath)) {
    return {
      provider,
      status: "misconfigured",
      enabled: false,
      message: "KOKORO_MODEL_PATH ou KOKORO_VOICES_PATH não encontrados.",
    };
  }

  return {
    provider,
    status: "available",
    enabled: true,
    engine,
    model,
    voice: defaultVoice,
    lang: defaultLang,
    message: "Kokoro configurado.",
  };
}
