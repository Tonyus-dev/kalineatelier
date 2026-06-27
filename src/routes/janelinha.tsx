import { createFileRoute } from "@tanstack/react-router";
import { FalarCard } from "@/components/companion/FalarCard";
import { ReuniaoCard } from "@/components/companion/ReuniaoCard";

export const Route = createFileRoute("/janelinha")({ component: JanelinhaPage });

/**
 * Conteúdo web da "janelinha" flutuante da Kaline. No PR 1 é só uma rota acessível pelo
 * navegador; no PR 2 o companion nativo (Tauri) a embrulha numa WebviewWindow pequena,
 * sem decoração e always-on-top. Topo com o sinal do KITT (dentro do FalarCard), embaixo
 * os dois botões: enviar mensagem (resposta falada via Kokoro/Dora) e gravar reunião.
 */
function JanelinhaPage() {
  return (
    <div className="min-h-screen bg-background p-3 text-foreground">
      <div className="mx-auto max-w-xs space-y-4">
        <FalarCard compact />
        <div className="border-t pt-3">
          <ReuniaoCard compact />
        </div>
      </div>
    </div>
  );
}
