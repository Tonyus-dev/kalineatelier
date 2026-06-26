import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Check, Dumbbell, Play, X } from "lucide-react";
import type { PRRecord } from "@/lib/treinos-sync";
import type { Exercise, Workout } from "../types";

function QuickBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-11 rounded-xl border border-white/10 hover:border-[#C98A65] text-sm text-[#F3EBDD]/85 hover:text-[#D9A441] transition"
    >
      {children}
    </button>
  );
}

export function TodayWorkoutCard({
  workout,
  exercises,
  prs,
  onCreate,
  onDiscard,
  onStart,
  onFinish,
  onOpenBlock,
}: {
  workout: Workout | null;
  exercises: Exercise[];
  prs: Record<string, PRRecord>;
  onCreate: (t: "treinoA" | "treinoB" | "treinoC" | "livre") => void;
  onDiscard: () => void;
  onStart: () => void;
  onFinish: () => void;
  onOpenBlock: (id: string) => void;
}) {
  if (!workout) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#111016] p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-[#C98A65]" />
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/50">
            Treino de hoje
          </p>
        </div>
        <p className="text-sm text-[#F3EBDD]/70 italic mb-4">Nenhum treino planejado para hoje.</p>
        <div className="grid grid-cols-2 gap-2">
          <QuickBtn onClick={() => onCreate("treinoA")}>Treino A</QuickBtn>
          <QuickBtn onClick={() => onCreate("treinoB")}>Treino B</QuickBtn>
          <QuickBtn onClick={() => onCreate("treinoC")}>Treino C</QuickBtn>
          <QuickBtn onClick={() => onCreate("livre")}>Treino livre</QuickBtn>
        </div>
      </div>
    );
  }
  const totalSets = workout.blocks.reduce((acc, b) => acc + b.planned.length, 0);
  const doneSets = workout.blocks.reduce(
    (acc, b) => acc + b.logged.filter((l) => l.status === "completed").length,
    0,
  );
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111016] p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-4">
        <Dumbbell className="w-5 h-5 text-[#C98A65] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/50">
            Treino de hoje
          </p>
          <p className="serif text-lg sm:text-xl text-[#F3EBDD] break-words">{workout.name}</p>
          <p className="text-[11px] sm:text-xs text-[#F3EBDD]/55 mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0.5">
            <span>{workout.goal}</span>
            <span aria-hidden>·</span>
            <span>~{workout.estimated_min}min</span>
            <span aria-hidden>·</span>
            <span className="tabular-nums">
              {doneSets}/{totalSets} séries
            </span>
            <span aria-hidden>·</span>
            <span>{workout.status}</span>
          </p>
        </div>
        <button
          onClick={onDiscard}
          className="shrink-0 text-[#F3EBDD]/40 hover:text-[#BE123C] p-1 -mr-1"
          aria-label="Descartar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ul className="divide-y divide-white/5 mb-4">
        {workout.blocks.length === 0 && (
          <li className="text-xs text-[#F3EBDD]/55 italic py-2">
            Sem blocos. Adicione exercícios pela biblioteca ou registre como notas.
          </li>
        )}
        {workout.blocks.map((b, idx) => {
          const ex = exercises.find((e) => e.id === b.exercise_id);
          const completed = b.logged.filter((l) => l.status === "completed").length;
          const pr = ex ? prs[ex.name] : undefined;
          return (
            <li key={b.id} className="py-2 flex items-center gap-3">
              <span className="text-[10px] text-[#F3EBDD]/40 w-5 tabular-nums">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#F3EBDD] truncate">{ex?.name ?? "Exercício"}</p>
                <p className="text-[11px] text-[#F3EBDD]/45">
                  {completed}/{b.planned.length} séries · {ex?.muscle_group}
                  {pr && (
                    <>
                      {" · "}
                      <span className="text-[#D9A441]">
                        PR {pr.weight}kg × {pr.reps}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => onOpenBlock(b.id)}
                className="text-[11px] uppercase tracking-[0.22em] text-[#C98A65] hover:text-[#D9A441] px-2 py-1"
              >
                Foco
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex gap-2">
        {workout.status !== "in_progress" && (
          <Button
            onClick={onStart}
            className="flex-1 bg-[#C98A65] text-[#08080E] hover:bg-[#D9A441]"
          >
            <Play className="w-4 h-4 mr-1" /> Iniciar Modo Foco
          </Button>
        )}
        {workout.status === "in_progress" && (
          <Button
            onClick={onFinish}
            className="flex-1 bg-[#16A34A] text-[#08080E] hover:bg-[#22c55e]"
          >
            <Check className="w-4 h-4 mr-1" /> Encerrar treino
          </Button>
        )}
      </div>
    </div>
  );
}
