import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRecorder, formatElapsed } from "@/components/companion/useRecorder";
import { transcribeLocalMeeting, saveLocalMeeting } from "@/lib/local/local-api-client";

/**
 * Gravar reunião: captura SÓ o microfone (PR 1), transcreve (Whisper) e grava como
 * evento revisável em inbox_events (trust_level='untrusted', status='pending'). Nada é
 * promovido automaticamente — a pessoa revisa depois em Revisão.
 *
 * Áudio interno do sistema/loopback fica fora de escopo (companion nativo, PR 2).
 */
export function ReuniaoCard({ compact = false }: { compact?: boolean }) {
  const recorder = useRecorder();
  const [fase, setFase] = useState<"idle" | "transcrevendo" | "salvando">("idle");
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function iniciar() {
    setErro(null);
    setResultado(null);
    await recorder.start();
  }

  async function encerrar() {
    const durationMs = recorder.elapsedMs;
    const audio = await recorder.stop();
    if (!audio) {
      setErro("Nada foi capturado.");
      return;
    }
    try {
      setFase("transcrevendo");
      const t = await transcribeLocalMeeting(audio);
      if (!t.ok) {
        setErro(t.error);
        setFase("idle");
        return;
      }
      setFase("salvando");
      await saveLocalMeeting({ transcript: t.text, durationMs });
      setResultado("Reunião transcrita e enviada para revisão na inbox.");
      setFase("idle");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar a reunião.");
      setFase("idle");
    }
  }

  const recording = recorder.state === "recording";
  const busy = fase !== "idle";

  return (
    <div className="space-y-3">
      {recording && (
        <div className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-600"
            aria-hidden
          />
          <span className="font-mono">{formatElapsed(recorder.elapsedMs)}</span>
          <span className="text-muted-foreground">gravando reunião (microfone)…</span>
        </div>
      )}
      <div className="flex gap-2">
        {!recording ? (
          <Button size="sm" onClick={iniciar} disabled={busy} className="flex-1">
            {busy ? (fase === "transcrevendo" ? "Transcrevendo…" : "Salvando…") : "Gravar reunião"}
          </Button>
        ) : (
          <>
            <Button size="sm" variant="destructive" onClick={encerrar} className="flex-1">
              Encerrar reunião
            </Button>
            <Button size="sm" variant="outline" onClick={recorder.cancel}>
              Cancelar
            </Button>
          </>
        )}
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Captura só do microfone. O áudio cru não é enviado à nuvem; só a transcrição fica salva,
          como pendente de revisão.
        </p>
      )}
      {resultado && <p className="text-sm text-emerald-600">{resultado}</p>}
      {(erro || recorder.error) && (
        <p className="text-xs text-destructive">{erro ?? recorder.error}</p>
      )}
    </div>
  );
}
