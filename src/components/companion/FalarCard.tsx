import { useState } from "react";
import { KittScanner, type KittState } from "@/components/KittScanner";
import { Button } from "@/components/ui/button";
import { useRecorder } from "@/components/companion/useRecorder";
import {
  transcribeLocalFile,
  sendLocalChatMessage,
  speakLocal,
} from "@/lib/local/local-api-client";

/**
 * Falar com Kaline: liga o microfone sob demanda, transcreve (Whisper), manda pro chat
 * local e fala a resposta com a voz Dora (Kokoro) — fallback honesto para a voz do
 * navegador se o Kokoro estiver indisponível. Microfone só liga ao clicar.
 */
export function FalarCard({ compact = false }: { compact?: boolean }) {
  const recorder = useRecorder();
  const [kitt, setKitt] = useState<KittState>("idle");
  const [resposta, setResposta] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function iniciar() {
    setErro(null);
    setResposta(null);
    await recorder.start();
    setKitt("listening");
  }

  async function pararEEnviar() {
    const audio = await recorder.stop();
    if (!audio) {
      setKitt("idle");
      setErro("Nada foi capturado.");
      return;
    }
    try {
      setKitt("transcribing");
      const file = new File([audio], "fala.webm", { type: audio.type });
      const t = await transcribeLocalFile(file);
      if (!t.ok) {
        setErro(t.message);
        setKitt("idle");
        return;
      }
      setKitt("thinking");
      const chat = await sendLocalChatMessage({ message: t.text });
      const assistant = chat.assistantMessage as { content: string };
      setResposta(assistant.content);
      setKitt("speaking");
      await speakLocal(assistant.content);
      setKitt("idle");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao falar com a Kaline.");
      setKitt("idle");
    }
  }

  const recording = recorder.state === "recording";
  const busy = kitt === "transcribing" || kitt === "thinking" || kitt === "speaking";

  return (
    <div className="space-y-3">
      <KittScanner state={kitt} height={compact ? 22 : 32} ariaLabel={`Kaline: ${kitt}`} />
      <div className="flex gap-2">
        {!recording ? (
          <Button size="sm" onClick={iniciar} disabled={busy} className="flex-1">
            {busy ? "…" : "Enviar mensagem"}
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={pararEEnviar} className="flex-1">
            Parar e enviar
          </Button>
        )}
      </div>
      {recording && (
        <p className="text-xs text-muted-foreground">Gravando… fale e clique em parar.</p>
      )}
      {resposta && <p className="text-sm whitespace-pre-wrap">{resposta}</p>}
      {(erro || recorder.error) && (
        <p className="text-xs text-destructive">{erro ?? recorder.error}</p>
      )}
    </div>
  );
}
