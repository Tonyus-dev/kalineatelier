// Hook client para TTS via /api/tts.
// A OpenRouter devolve o áudio (mp3) como bytes crus numa resposta única —
// decodificamos com o AudioContext e tocamos do início ao fim.
// `speak(id, text)` toca; `stop()` interrompe. `speakingId` indica qual bolha
// está falando — usado pelo botão para exibir ícone de stop.
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Opts = { voice?: string; model?: string };

export function useTTS() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.onended = null;
        sourceRef.current.stop();
      } catch {
        /* já parado */
      }
      sourceRef.current = null;
    }
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close().catch(() => {});
    }
    ctxRef.current = null;
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    async (id: string, text: string, opts?: Opts) => {
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
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text, ...opts }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => `tts ${res.status}`);
          throw new Error(msg.slice(0, 300) || `tts ${res.status}`);
        }
        const bytes = await res.arrayBuffer();
        if (controller.signal.aborted) return;

        if (typeof document !== "undefined" && document.hidden) {
          throw new Error("A aba precisa estar visível para tocar áudio.");
        }

        try {
          const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
          const audio = new Audio(url);
          audioRef.current = audio;
          await audio.play();
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
          });
          return;
        } catch {
          if (audioRef.current) {
            URL.revokeObjectURL(audioRef.current.src);
            audioRef.current = null;
          }
        }

        const ctx = new AudioContext();
        ctxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();

        const buffer = await ctx.decodeAudioData(bytes);
        if (controller.signal.aborted || ctxRef.current !== ctx) return;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        sourceRef.current = source;
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "erro de áudio";
        setError(msg);
      } finally {
        if (abortRef.current === controller) {
          stop();
        }
      }
    },
    [speakingId, stop],
  );

  return { speak, stop, speakingId, error };
}
