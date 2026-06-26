import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { ensureThread } from "@/lib/ensure-thread";

const CHIPS = [
  "Ajustar treino de hoje",
  "Substituir exercício",
  "Estou sem energia hoje",
  "Tenho 20 minutos só",
  "Registrar treino livre",
  "Ver minha evolução",
];

export function KhoraChatChips() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function abrirComKhora(seed: string) {
    if (busy) return;
    setBusy(true);
    try {
      const seedWithContext = `[contexto: domain=training, facet=khora]\n${seed}`;
      const id = await ensureThread("kaline");
      if (!id) return;
      await navigate({
        to: "/chat/$threadId",
        params: { threadId: id },
        search: { seed: seedWithContext },
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-[#111016] p-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-4 h-4 text-[#C98A65]" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/50">
          Perguntar à Khora
        </p>
      </div>
      <p className="text-[11px] text-[#F3EBDD]/55 mb-3">
        Khora é a faceta da Kaline para corpo e movimento. A conversa abre no chat real da Kaline,
        com contexto de treino.
      </p>
      <div className="flex gap-1 flex-wrap">
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => abrirComKhora(c)}
            disabled={busy}
            className="text-[11px] px-2.5 h-7 rounded-full border border-white/10 hover:border-[#C98A65] text-[#F3EBDD]/75 hover:text-[#D9A441] transition disabled:opacity-50 disabled:cursor-wait"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
