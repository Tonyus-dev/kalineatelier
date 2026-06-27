import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Gravador de microfone mínimo e honesto para as ações rápidas da Kaline.
 *
 * - Microfone DESLIGADO por padrão: só liga quando `start()` é chamado explicitamente.
 * - Sem wake word, sem always-on, sem gravação invisível.
 * - Libera o stream (desliga o mic) ao parar ou desmontar.
 * - Captura só microfone (PR 1). Áudio interno do sistema fica para o companion nativo.
 */
export type RecorderState = "idle" | "recording" | "error";

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("error");
      setError("Este ambiente não permite acesso ao microfone.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: chunksRef.current[0].type || "audio/webm" })
          : null;
        cleanup();
        setState("idle");
        resolveRef.current?.(blob);
        resolveRef.current = null;
      };
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 250);
      recorder.start();
      setState("recording");
    } catch (err) {
      setState("error");
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Permissão de microfone negada."
          : "Não foi possível acessar o microfone.",
      );
      cleanup();
    }
  }, [cleanup]);

  /** Para a gravação e resolve com o áudio (ou null se nada foi capturado). */
  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      resolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  /** Cancela: para e descarta o áudio, desligando o microfone. */
  const cancel = useCallback(() => {
    const recorder = mediaRef.current;
    if (recorder && recorder.state !== "inactive") {
      resolveRef.current = null;
      recorder.onstop = () => cleanup();
      recorder.stop();
    } else {
      cleanup();
    }
    setState("idle");
    setElapsedMs(0);
  }, [cleanup]);

  return { state, error, elapsedMs, start, stop, cancel };
}

export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
