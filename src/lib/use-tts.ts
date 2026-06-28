// Hook client para TTS via local-server (voz Dora PT-BR, Kokoro offline).
//
// Chama POST /tts/speak no local-server (http://127.0.0.1:64113 por padrão),
// recebe um WAV e toca no navegador. Sem Supabase, sem auth, sem OpenRouter.
//
// `speak(id, text)` toca; `stop()` interrompe. `speakingId` indica qual bolha
// está falando — usado pelo botão para exibir ícone de stop.
import { useCallback, useRef, useState } from "react";
import { localApiUrl } from "@/lib/local/local-config";

export type TTSSpeakOpts = { speed?: number };

export function useTTS() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      revokeObjectUrl();
      audioRef.current = null;
    }
    setSpeakingId(null);
  }, [revokeObjectUrl]);

  const speak = useCallback(
    async (id: string, text: string, opts?: TTSSpeakOpts) => {
      const trimmed = text?.trim();
      if (!trimmed) return;

      // Se já tocando o mesmo id → pausar (toggle).
      if (speakingId === id) {
        stop();
        return;
      }
      // Trocar de bolha enquanto outra fala → parar a anterior.
      stop();
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;
      setSpeakingId(id);

      try {
        const res = await fetch(localApiUrl("/tts/speak"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed, speed: opts?.speed ?? 1 }),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!res.ok) {
          const msg = await res.text().catch(() => `tts ${res.status}`);
          throw new Error(msg.slice(0, 300) || `tts ${res.status}`);
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("audio/")) {
          throw new Error(
            `Resposta inesperada do TTS local (content-type: ${contentType || "ausente"}).`,
          );
        }

        const blob = await res.blob();
        if (controller.signal.aborted) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;

        await audio.play();

        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
        });
      } catch (err) {
        if (controller.signal.aborted) return;

        const isNetworkError = err instanceof TypeError && err.message.includes("fetch");

        const msg = isNetworkError
          ? "TTS local indisponível. Verifique se o local-server está rodando em http://127.0.0.1:64113."
          : err instanceof Error
            ? err.message
            : "erro de áudio";
        setError(msg);
      } finally {
        revokeObjectUrl();
        if (abortRef.current === controller) {
          stop();
        }
      }
    },
    [speakingId, stop, revokeObjectUrl],
  );

  return { speak, stop, speakingId, error };
}
