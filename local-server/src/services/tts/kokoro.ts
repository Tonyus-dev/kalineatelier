/**
 * TTS Kokoro 82M local — fallback experimental via kokoro-js (Node).
 *
 * A voz Dora PT-BR offline é sintetizada pelo provider `kokoro-python` (Python).
 * Este módulo é mantido apenas como fallback experimental. NÃO configurar
 * `pf_dora` para `kokoro-js` — essa voz não está disponível no pacote ONNX
 * Community suportado pelo kokoro-js; use `af_bella` (ou outra voz suportada)
 * para testes experimentais com o kokoro-js.
 */

import fs from "node:fs";
import { TTS_CONFIG } from "../../config.js";
import type { EngineStatusKind } from "../model-provider/types.js";

export class KokoroError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KokoroError";
  }
}

export type TtsStatus =
  | {
      provider: string;
      status: EngineStatusKind;
      enabled: true;
      engine: string;
      model: string;
      voice: string;
      lang: string;
      offline: boolean;
      experimental: true;
      message: string;
    }
  | {
      provider: string;
      status: EngineStatusKind;
      enabled: false;
      message: string;
    };

export function getTtsStatus(): TtsStatus {
  const { enabled, engine, model, modelPath, voicesPath, defaultLang } = TTS_CONFIG.kokoro;
  const provider = TTS_CONFIG.provider;
  const experimentalVoice = "af_bella";

  if (!enabled) {
    return {
      provider,
      status: "disabled",
      enabled: false,
      message:
        "kokoro-js desabilitado (KOKORO_ENABLED=false). Dora PT-BR offline usa kokoro-python.",
    };
  }

  if (!modelPath || !fs.existsSync(modelPath) || !voicesPath || !fs.existsSync(voicesPath)) {
    return {
      provider,
      status: "misconfigured",
      enabled: false,
      message:
        "kokoro-js: KOKORO_MODEL_PATH ou KOKORO_VOICES_PATH não encontrados. " +
        "Dora PT-BR offline requer kokoro-python.",
    };
  }

  return {
    provider,
    status: "available",
    enabled: true,
    engine,
    model,
    voice: experimentalVoice,
    lang: defaultLang,
    offline: false,
    experimental: true,
    message: "kokoro-js experimental (fallback). Dora PT-BR offline requer kokoro-python.",
  };
}

// Carregamento preguiçoso e reaproveitado da engine Kokoro. O import é indireto
// (string) de propósito: assim o typecheck/build não exigem a dependência instalada
// neste container; ela só é necessária em runtime, na máquina do usuário.
let kokoroPromise: Promise<{
  generate: (
    text: string,
    opts: { voice: string; speed: number },
  ) => Promise<{ toWav: () => ArrayBuffer | Buffer }>;
}> | null = null;

async function loadKokoro() {
  const status = getTtsStatus();
  if (status.status !== "available") {
    throw new KokoroError(status.message);
  }
  if (!kokoroPromise) {
    kokoroPromise = (async () => {
      const specifier = "kokoro-js";
      let mod: {
        KokoroTTS?: { from_pretrained: (id: string, opts: { dtype: string }) => Promise<unknown> };
      };
      try {
        mod = (await import(specifier as string)) as typeof mod;
      } catch {
        throw new KokoroError(
          "Dependência 'kokoro-js' não instalada. Rode `npm install` em local-server na máquina onde o Kokoro está disponível.",
        );
      }
      if (!mod.KokoroTTS) throw new KokoroError("Pacote 'kokoro-js' sem KokoroTTS.");
      const modelId = TTS_CONFIG.kokoro.modelPath || "onnx-community/Kokoro-82M-v1.0-ONNX";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await mod.KokoroTTS.from_pretrained(modelId, { dtype: "q8" })) as any;
    })();
  }
  return kokoroPromise;
}

/**
 * Sintetiza `text` em áudio WAV com a voz pedida.
 * Lança KokoroError se o Kokoro não estiver disponível. Nunca devolve voz fingida.
 *
 * Experimental: Dora PT-BR offline requer `kokoro-python`.
 */
export async function synthesizeSpeech(
  text: string,
  opts: { voice?: string; speed?: number } = {},
): Promise<Buffer> {
  const { defaultSpeed } = TTS_CONFIG.kokoro;
  const experimentalVoice = opts.voice || "af_bella";
  const tts = await loadKokoro();
  const audio = await tts.generate(text, {
    voice: experimentalVoice,
    speed: opts.speed ?? defaultSpeed,
  });
  const wav = audio.toWav();
  return Buffer.isBuffer(wav) ? wav : Buffer.from(wav);
}
