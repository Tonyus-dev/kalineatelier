import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sprout } from "lucide-react";
import { dueMemorias, reviewMemoria } from "@/lib/jardim.functions";

import {
  InlineListSkeleton,
  RouteErrorBoundary,
  RouteNotFoundBoundary,
} from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/revisao")({
  component: RevisaoPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

const BUTTONS = [
  {
    q: 0 as const,
    label: "errei",
    hint: "volta amanhã",
    color: "border-[#BE123C]/40 text-[#BE123C]",
  },
  {
    q: 1 as const,
    label: "difícil",
    hint: "intervalo curto",
    color: "border-[#D9A441]/40 text-[#D9A441]",
  },
  { q: 2 as const, label: "ok", hint: "cresce", color: "border-white/15 text-[#F3EBDD]/80" },
  {
    q: 3 as const,
    label: "fácil",
    hint: "grande salto",
    color: "border-[#16A34A]/40 text-[#16A34A]",
  },
];

function RevisaoPage() {
  const qc = useQueryClient();
  const list = useServerFn(dueMemorias);
  const review = useServerFn(reviewMemoria);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["revisao-due"],
    queryFn: () => list({ data: { limit: 50 } }),
  });

  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const queue = data ?? [];
  const current = queue[idx];

  async function answer(q: 0 | 1 | 2 | 3) {
    if (!current) return;
    await review({ data: { id: current.id, quality: q } });
    qc.invalidateQueries({ queryKey: ["home-due"] });
    if (idx + 1 >= queue.length) {
      await refetch();
      setIdx(0);
    } else {
      setIdx((i) => i + 1);
    }
    setRevealed(false);
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#08080E] text-[#F3EBDD]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 space-y-6">
        <header className="flex items-center gap-3">
          <Sprout className="w-5 h-5 text-[#C98A65]" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#D9A441]">Revisão</p>
            <h1 className="serif text-2xl sm:text-3xl">O que vence hoje</h1>
          </div>
          <span className="ml-auto text-[11px] text-[#F3EBDD]/50 tabular-nums">
            {queue.length === 0 ? 0 : idx + 1}/{queue.length}
          </span>
        </header>

        {isLoading && <InlineListSkeleton rows={3} />}

        {!isLoading && queue.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-[#111016] p-6 text-center space-y-3">
            <p className="serif text-lg text-[#F3EBDD]">Nada vencido agora.</p>
            <p className="text-sm text-[#F3EBDD]/55">
              Pode{" "}
              <Link to="/jardim" className="text-[#D9A441] hover:underline">
                visitar o Jardim
              </Link>{" "}
              ou{" "}
              <Link to="/registro-vivo" className="text-[#D9A441] hover:underline">
                capturar algo
              </Link>
              .
            </p>
          </div>
        )}

        {current && (
          <article className="rounded-2xl border border-[#C98A65]/30 bg-gradient-to-b from-[#16131A] to-[#0F0D14] p-5 sm:p-6 shadow-[0_0_40px_rgba(201,138,101,0.08)]">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#D9A441]/80 mb-2">
              <span>{current.category}</span>
              <span className="text-[#F3EBDD]/45">imp {current.importance}</span>
              <span className="text-[#F3EBDD]/45 ml-auto">
                {current.review_count === 0 ? "primeira revisão" : `${current.review_count}ª`}
              </span>
            </div>
            <p className="serif text-xl sm:text-2xl text-[#F3EBDD]">{current.title}</p>
            {revealed ? (
              <p className="text-sm text-[#F3EBDD]/85 whitespace-pre-wrap mt-4">{current.body}</p>
            ) : (
              <button
                onClick={() => setRevealed(true)}
                className="mt-4 text-sm px-3 h-9 rounded-md border border-white/10 text-[#F3EBDD]/70 hover:border-[#C98A65]/50"
              >
                Mostrar resposta
              </button>
            )}
            {revealed && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                {BUTTONS.map((b) => (
                  <button
                    key={b.q}
                    onClick={() => answer(b.q)}
                    className={`px-2 h-12 rounded-md border ${b.color} bg-transparent text-sm flex flex-col items-center justify-center leading-tight`}
                  >
                    <span>{b.label}</span>
                    <span className="text-[10px] opacity-70">{b.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
