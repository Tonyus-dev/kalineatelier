import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { MessageCircle, Sparkle } from "lucide-react";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

import { BodySignalsCard } from "@/features/treinos/components/BodySignalsCard";
import { ExerciseLibraryPanel } from "@/features/treinos/components/ExerciseLibraryPanel";
import { FocusMode } from "@/features/treinos/components/FocusMode";
import { Header } from "@/features/treinos/components/Header";
import { HistoryPanel } from "@/features/treinos/components/HistoryPanel";
import { KhoraChatChips } from "@/features/treinos/components/KhoraChatChips";
import { SafetyFooter } from "@/features/treinos/components/SafetyFooter";
import { SemaphoreCard } from "@/features/treinos/components/SemaphoreCard";
import { TodayWorkoutCard } from "@/features/treinos/components/TodayWorkoutCard";
import { WeekPlanCard } from "@/features/treinos/components/WeekPlanCard";
import { useTreinos } from "@/features/treinos/use-treinos";

// ─────────────────────────────────────────────────────────────
// 3 abas: hoje · plano · histórico. Estado vive na URL (?tab=).
// Princípio: uma decisão por momento. FocusMode é overlay full-screen
// e não compete por espaço — fica fora do fluxo das abas.
// ─────────────────────────────────────────────────────────────

const TABS = ["hoje", "plano", "historico"] as const;
type Tab = (typeof TABS)[number];

const searchSchema = z.object({
  tab: z.enum(TABS).optional().catch("hoje"),
});

export const Route = createFileRoute("/_authenticated/treinos")({
  validateSearch: (raw) => searchSchema.parse(raw),
  component: TreinosPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

function TreinosPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/treinos" });
  const [khoraOpen, setKhoraOpen] = useState(false);

  const {
    state,
    setState,
    focusBlockId,
    setFocusBlockId,
    remoteHistory,
    prs,
    semaphore,
    patchToday,
    createQuickWorkout,
    finishWorkout,
    discardToday,
  } = useTreinos();

  const goTab = (t: Tab) => navigate({ search: { tab: t } });

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#08080E] text-[#F3EBDD]">
      <Header />

      {/* Tabs sticky — sempre visíveis, sempre claras */}
      <nav
        className="sticky top-0 z-20 bg-[#08080E]/95 backdrop-blur border-b border-white/5"
        aria-label="Modos do treino"
      >
        <div className="max-w-5xl mx-auto px-3 sm:px-4 flex gap-1">
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => goTab(t)}
                className={
                  "relative px-4 py-3 text-[11px] tracking-[0.22em] uppercase transition-colors " +
                  (active ? "text-[#F3EBDD]" : "text-[#F3EBDD]/45 hover:text-[#F3EBDD]/80")
                }
                aria-current={active ? "page" : undefined}
              >
                {t === "historico" ? "histórico" : t}
                {active && (
                  <span className="absolute left-3 right-3 -bottom-px h-px bg-[#C98A65]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-3 sm:px-4 py-5 sm:py-8 pb-28 space-y-5">
        {tab === "hoje" && (
          <TabHoje
            workout={state.todayWorkout}
            exercises={state.exercises}
            prs={prs}
            semaphore={semaphore}
            onCreate={createQuickWorkout}
            onDiscard={discardToday}
            onFinish={finishWorkout}
            onStart={() => {
              patchToday((w) => ({ ...w, status: "in_progress" }));
              setFocusBlockId(state.todayWorkout?.blocks[0]?.id ?? null);
            }}
            onOpenBlock={setFocusBlockId}
            onGoPlano={() => goTab("plano")}
          />
        )}

        {tab === "plano" && (
          <TabPlano
            signals={state.signals}
            onSignalsChange={(sig) => setState((s) => ({ ...s, signals: sig }))}
            semaphore={semaphore}
            week={state.week}
            onWeekSet={(day, value) =>
              setState((s) => ({ ...s, week: { ...s.week, [day]: value } }))
            }
          />
        )}

        {tab === "historico" && (
          <TabHistorico
            remote={remoteHistory}
            localHistory={state.history}
            exercises={state.exercises}
            prs={prs}
          />
        )}
      </main>

      {/* FocusMode permanece como overlay full-screen — não vive numa aba */}
      {state.todayWorkout && focusBlockId && (
        <FocusMode
          workout={state.todayWorkout}
          blockId={focusBlockId}
          exercises={state.exercises}
          prs={prs}
          onAdvance={(nextBlockId) => setFocusBlockId(nextBlockId)}
          onClose={() => setFocusBlockId(null)}
          onLog={(blockId, log) =>
            patchToday((w) => ({
              ...w,
              blocks: w.blocks.map((b) =>
                b.id === blockId ? { ...b, logged: [...b.logged, log] } : b,
              ),
            }))
          }
          onUndoLast={(blockId) =>
            patchToday((w) => ({
              ...w,
              blocks: w.blocks.map((b) =>
                b.id === blockId ? { ...b, logged: b.logged.slice(0, -1) } : b,
              ),
            }))
          }
          onAddSet={(blockId) =>
            patchToday((w) => ({
              ...w,
              blocks: w.blocks.map((b) =>
                b.id === blockId
                  ? {
                      ...b,
                      planned: [
                        ...b.planned,
                        {
                          ...b.planned[b.planned.length - 1],
                          set_number: b.planned.length + 1,
                        },
                      ],
                    }
                  : b,
              ),
            }))
          }
          onReplaceExercise={(blockId, exerciseId) =>
            patchToday((w) => ({
              ...w,
              blocks: w.blocks.map((b) =>
                b.id === blockId ? { ...b, exercise_id: exerciseId, logged: [] } : b,
              ),
            }))
          }
        />
      )}

      {/* FAB Khora — acesso ao chat sem ocupar coluna */}
      <button
        type="button"
        onClick={() => setKhoraOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-30 w-14 h-14 rounded-full bg-[#C98A65] text-[#08080E] grid place-items-center shadow-lg shadow-black/40 hover:scale-105 transition"
        aria-label={khoraOpen ? "Fechar Khora" : "Abrir Khora"}
      >
        {khoraOpen ? <Sparkle className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {khoraOpen && (
        <div
          className="fixed bottom-24 right-5 z-30 w-[min(360px,calc(100vw-2.5rem))] rounded-2xl border border-white/10 bg-[#0C0B12] p-4 shadow-2xl shadow-black/60"
          role="dialog"
          aria-label="Conversa com Khora"
        >
          <KhoraChatChips />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab: HOJE — uma decisão por vez
// ─────────────────────────────────────────────────────────────
function TabHoje({
  workout,
  exercises,
  prs,
  semaphore,
  onCreate,
  onDiscard,
  onFinish,
  onStart,
  onOpenBlock,
  onGoPlano,
}: {
  workout: ReturnType<typeof useTreinos>["state"]["todayWorkout"];
  exercises: ReturnType<typeof useTreinos>["state"]["exercises"];
  prs: ReturnType<typeof useTreinos>["prs"];
  semaphore: ReturnType<typeof useTreinos>["semaphore"];
  onCreate: ReturnType<typeof useTreinos>["createQuickWorkout"];
  onDiscard: ReturnType<typeof useTreinos>["discardToday"];
  onFinish: ReturnType<typeof useTreinos>["finishWorkout"];
  onStart: () => void;
  onOpenBlock: (id: string | null) => void;
  onGoPlano: () => void;
}) {
  // Leitura do semáforo em uma linha — substitui o card PresenceKhora gigante.
  const semColor =
    semaphore === "green"
      ? "#16A34A"
      : semaphore === "yellow"
        ? "#D9A441"
        : semaphore === "red"
          ? "#B91C1C"
          : semaphore === "blue"
            ? "#2563EB"
            : "#6B7280";
  const semLabel =
    semaphore === "green"
      ? "pode puxar forte"
      : semaphore === "yellow"
        ? "ritmo moderado"
        : semaphore === "red"
          ? "descanso ativo recomendado"
          : semaphore === "blue"
            ? "mobilidade e respiração"
            : "registre os sinais pra calibrar";

  return (
    <>
      <header className="flex items-center gap-3">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: semColor, boxShadow: `0 0 12px ${semColor}` }}
          aria-hidden
        />
        <p className="text-sm text-[#F3EBDD]/70 min-w-0">
          <span className="text-[#F3EBDD]">Hoje:</span> {semLabel}
        </p>
        <button
          type="button"
          onClick={onGoPlano}
          className="ml-auto text-[10px] uppercase tracking-[0.22em] text-[#C98A65] hover:text-[#D9A441] shrink-0"
        >
          ajustar
        </button>
      </header>

      <TodayWorkoutCard
        workout={workout}
        onCreate={onCreate}
        onDiscard={onDiscard}
        onStart={onStart}
        onFinish={onFinish}
        onOpenBlock={onOpenBlock}
        exercises={exercises}
        prs={prs}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab: PLANO — semana + sinais corporais
// ─────────────────────────────────────────────────────────────
function TabPlano({
  signals,
  onSignalsChange,
  semaphore,
  week,
  onWeekSet,
}: {
  signals: ReturnType<typeof useTreinos>["state"]["signals"];
  onSignalsChange: (sig: ReturnType<typeof useTreinos>["state"]["signals"]) => void;
  semaphore: ReturnType<typeof useTreinos>["semaphore"];
  week: ReturnType<typeof useTreinos>["state"]["week"];
  onWeekSet: (
    day: keyof ReturnType<typeof useTreinos>["state"]["week"],
    value: ReturnType<typeof useTreinos>["state"]["week"][number],
  ) => void;
}) {
  return (
    <>
      <section>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/45 mb-3">
          Sinais de hoje
        </p>
        <div className="space-y-4">
          <SemaphoreCard signals={signals} onChange={onSignalsChange} state={semaphore} />
          <BodySignalsCard signals={signals} onChange={onSignalsChange} />
        </div>
      </section>

      <section>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/45 mb-3">Semana</p>
        <WeekPlanCard week={week} onSet={onWeekSet} />
      </section>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab: HISTÓRICO — sessões passadas, PRs, biblioteca
// ─────────────────────────────────────────────────────────────
function TabHistorico({
  remote,
  localHistory,
  exercises,
  prs,
}: {
  remote: ReturnType<typeof useTreinos>["remoteHistory"];
  localHistory: ReturnType<typeof useTreinos>["state"]["history"];
  exercises: ReturnType<typeof useTreinos>["state"]["exercises"];
  prs: ReturnType<typeof useTreinos>["prs"];
}) {
  const prList = Object.entries(prs ?? {}).slice(0, 6);
  return (
    <>
      {prList.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/45 mb-3">Recordes</p>
          <div className="flex flex-wrap gap-2">
            {prList.map(([exerciseId, pr]) => {
              const ex = exercises.find((e) => e.id === exerciseId);
              if (!ex || !pr) return null;
              return (
                <span
                  key={exerciseId}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-[#D9A441]/40 bg-[#D9A441]/5 text-[#F3EBDD]"
                >
                  <span className="text-[#D9A441]">{ex.name}</span>{" "}
                  <span className="text-[#F3EBDD]/70">· {pr.weight}kg</span>
                </span>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/45 mb-3">Sessões</p>
        <HistoryPanel remote={remote} localHistory={localHistory} exercises={exercises} />
      </section>

      <section>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/45 mb-3">
          Biblioteca de exercícios
        </p>
        <ExerciseLibraryPanel exercises={exercises} />
      </section>

      <SafetyFooter />
    </>
  );
}
