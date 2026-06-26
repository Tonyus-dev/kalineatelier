import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, CalendarDays, Feather, Flower2, Mic, Sparkle, Sprout } from "lucide-react";
import { listRegistros } from "@/lib/registro-vivo.functions";
import { dueMemorias } from "@/lib/jardim.functions";
import { KittScanner, type KittState } from "@/components/KittScanner";
import { setKittPulse, useKittPulse } from "@/lib/kitt-pulse";
import { useProfile, welcomeGreeting } from "@/lib/use-profile";
import { SemaforoPresence } from "@/components/SemaforoPresence";

import {
  InlineListSkeleton,
  RouteErrorBoundary,
  RouteNotFoundBoundary,
} from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomeCockpit,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

type Card = {
  to: string;
  title: string;
  sub: string;
  icon: typeof Sparkle;
  accent?: string;
};

const PRIMARY: Card[] = [
  {
    to: "/chat",
    title: "Kaline · Conversa",
    sub: "presença plena",
    icon: Sparkle,
    accent: "from-[#C98A65]/30",
  },
  {
    to: "/klio",
    title: "Klio · Estudo",
    sub: "sala acadêmica",
    icon: BookOpen,
    accent: "from-[#D9A441]/25",
  },
  {
    to: "/registro-vivo",
    title: "Registro Vivo",
    sub: "captura densa do dia",
    icon: Feather,
    accent: "from-[#16A34A]/25",
  },
  {
    to: "/jardim",
    title: "Jardim",
    sub: "memórias que voltam",
    icon: Flower2,
    accent: "from-[#D9A441]/20",
  },
];

const SATELLITES: Card[] = [
  { to: "/revisao", title: "Revisão", sub: "o que vence hoje", icon: Sprout },
  { to: "/agenda", title: "Agenda", sub: "compromissos", icon: CalendarDays },
  { to: "/livros", title: "Livros", sub: "leituras e resumos", icon: BookOpen },
  { to: "/camara", title: "Câmara de Eco", sub: "áudio e atas", icon: Mic },
];

function HomeCockpit() {
  const listRegs = useServerFn(listRegistros);
  const listDue = useServerFn(dueMemorias);
  const kittState: KittState = useKittPulse("idle");
  const { profile } = useProfile();

  const regs = useQuery({
    queryKey: ["home-registros"],
    queryFn: () => listRegs({ data: { limit: 5 } }),
  });
  const due = useQuery({
    queryKey: ["home-due"],
    queryFn: () => listDue({ data: { limit: 5 } }),
  });

  const todayCount = (regs.data ?? []).filter((r) => {
    const d = new Date(r.occurred_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const KITT_STATES: KittState[] = [
    "idle",
    "listening",
    "transcribing",
    "thinking",
    "radar",
    "speaking",
    "unavailable",
  ];

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#08080E] text-[#F3EBDD]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 pb-24">
        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#D9A441]">Kaline · cockpit</p>
          <h1 className="serif text-3xl sm:text-4xl">{welcomeGreeting(profile?.gender ?? null)}</h1>
          <p className="text-sm text-[#F3EBDD]/55">
            Hoje: <span className="text-[#F3EBDD]">{todayCount}</span> registros vivos ·{" "}
            <span className="text-[#F3EBDD]">{due.data?.length ?? 0}</span> memórias para revisar.
          </p>
        </header>

        <SemaforoPresence defaultOpen />

        <section
          aria-label="KITT — pulso da Kaline"
          className="rounded-2xl border border-white/5 bg-[#0C0B12] p-4 sm:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/55">
              KITT · pulso
            </p>
            <span className="text-[10px] uppercase tracking-[0.22em] text-[#C98A65]">
              {kittState}
            </span>
          </div>
          <KittScanner state={kittState} variant="ruby" height={36} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {KITT_STATES.map((s) => (
              <button
                key={s}
                onClick={() => setKittPulse("system", s === "idle" ? null : s)}
                className={
                  "text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded border transition " +
                  (kittState === s
                    ? "border-[#C98A65] text-[#F3EBDD] bg-[#C98A65]/10"
                    : "border-white/10 text-[#F3EBDD]/55 hover:text-[#F3EBDD] hover:border-white/25")
                }
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        <section className="fade-up">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/45 mb-3">
            Entradas principais
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger">
            {PRIMARY.map((c) => (
              <CardLink key={c.to} card={c} large />
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          <section className="rounded-2xl border border-white/5 bg-[#111016] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/55">
                Últimos registros
              </p>
              <Link
                to="/registro-vivo"
                className="text-[11px] uppercase tracking-[0.22em] text-[#C98A65] hover:text-[#D9A441]"
              >
                abrir
              </Link>
            </div>
            {regs.isLoading && <InlineListSkeleton rows={4} />}
            {regs.data && regs.data.length === 0 && (
              <p className="text-xs italic text-[#F3EBDD]/45">
                Nenhum registro ainda. Comece capturando o que está vivo.
              </p>
            )}
            <ul className="space-y-2 fade-up">
              {(regs.data ?? []).slice(0, 5).map((r) => (
                <li key={r.id} className="text-sm border-b border-white/5 pb-2 last:border-b-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#D9A441]/80">
                    <span>{r.kind}</span>
                    <span className="text-[#F3EBDD]/40">
                      {new Date(r.occurred_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-[#F3EBDD]/85 line-clamp-2 mt-0.5">{r.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-white/5 bg-[#111016] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/55">
                Para revisar hoje
              </p>
              <Link
                to="/revisao"
                className="text-[11px] uppercase tracking-[0.22em] text-[#C98A65] hover:text-[#D9A441]"
              >
                revisar
              </Link>
            </div>
            {due.isLoading && <InlineListSkeleton rows={4} />}
            {due.data && due.data.length === 0 && (
              <p className="text-xs italic text-[#F3EBDD]/45">
                Nada vencido. Memórias dormem até a próxima estação.
              </p>
            )}
            <ul className="space-y-2 fade-up">
              {(due.data ?? []).slice(0, 5).map((m) => (
                <li key={m.id} className="text-sm border-b border-white/5 pb-2 last:border-b-0">
                  <p className="text-[#F3EBDD]">{m.title}</p>
                  <p className="text-[11px] text-[#F3EBDD]/45 line-clamp-1">{m.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="fade-up">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/45 mb-3">Módulos</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 stagger">
            {SATELLITES.map((c) => (
              <CardLink key={c.to} card={c} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CardLink({ card, large }: { card: Card; large?: boolean }) {
  const Icon = card.icon;
  return (
    <Link
      to={card.to}
      className={
        "lift-card group block rounded-2xl border border-white/5 bg-[#111016] relative overflow-hidden " +
        (large ? "p-4 sm:p-5" : "p-3")
      }
    >
      {card.accent && (
        <div
          className={`absolute inset-0 bg-gradient-to-br ${card.accent} to-transparent opacity-0 group-hover:opacity-100 transition`}
        />
      )}
      <div className="relative">
        <Icon className={(large ? "w-5 h-5" : "w-4 h-4") + " text-[#C98A65] mb-2"} />
        <p className={(large ? "serif text-lg" : "text-sm") + " text-[#F3EBDD]"}>{card.title}</p>
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#F3EBDD]/45 mt-0.5">
          {card.sub}
        </p>
      </div>
    </Link>
  );
}
