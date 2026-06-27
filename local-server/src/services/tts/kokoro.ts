/**
 * TTS Kokoro 82M local. `getTtsStatus()` relata configuração/disponibilidade de forma
 * honesta; `synthesizeSpeech()` sintetiza de verdade com a voz Dora (pt-BR) usando o
 * modelo instalado pelo usuário. A inferência é carregada via import dinâmico, então
 * este servidor compila mesmo sem a dependência/modelo presentes — nesse caso a
 * síntese falha com erro claro (KokoroError), nunca com voz fingida.
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
 * Sintetiza `text` em áudio WAV com a voz pedida (default `pf_dora` — Dora, pt-BR).
 * Lança KokoroError se o Kokoro não estiver disponível. Nunca devolve voz fingida.
 */
export async function synthesizeSpeech(
  text: string,
  opts: { voice?: string; speed?: number } = {},
): Promise<Buffer> {
  const { defaultVoice, defaultSpeed } = TTS_CONFIG.kokoro;
  const tts = await loadKokoro();
  const audio = await tts.generate(text, {
    voice: opts.voice || defaultVoice,
    speed: opts.speed ?? defaultSpeed,
  });
  const wav = audio.toWav();
  return Buffer.isBuffer(wav) ? wav : Buffer.from(wav);
}
