import { History } from "lucide-react";
import type { HistoryItem } from "@/lib/treinos-sync";
import type { Exercise, Workout } from "../types";

export function HistoryPanel({
  remote,
  localHistory,
  exercises,
}: {
  remote: HistoryItem[];
  localHistory: Workout[];
  exercises: Exercise[];
}) {
  const items =
    remote.length > 0
      ? remote.map((r) => ({
          id: r.id,
          name: r.name,
          date: r.date,
          sets: r.totalSets,
          volume: r.totalVolume,
          names: r.exerciseNames,
        }))
      : localHistory.slice(0, 6).map((w) => ({
          id: w.id,
          name: w.name,
          date: w.date,
          sets: w.blocks.reduce(
            (acc, b) => acc + b.logged.filter((l) => l.status === "completed").length,
            0,
          ),
          volume: w.blocks.reduce(
            (acc, b) =>
              acc +
              b.logged.reduce((s, l) => s + (l.status === "completed" ? l.weight * l.reps : 0), 0),
            0,
          ),
          names: w.blocks
            .map((b) => exercises.find((e) => e.id === b.exercise_id)?.name ?? "")
            .filter(Boolean),
        }));

  return (
    <div className="rounded-2xl border border-white/5 bg-[#111016] p-4">
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-[#C98A65]" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/50">Histórico</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[#F3EBDD]/55 italic">
          Ainda não há histórico real. O histórico nasce quando você registra séries no Modo Foco.
        </p>
      ) : (
        <ul className="space-y-2 text-xs">
          {items.slice(0, 6).map((w) => (
            <li key={w.id} className="border-b border-white/5 pb-2">
              <p className="text-[#F3EBDD]">{w.name}</p>
              <p className="text-[10px] text-[#F3EBDD]/50">
                {w.date} · {w.sets} séries · vol {Math.round(w.volume)}kg
              </p>
              <p className="text-[10px] text-[#F3EBDD]/40 truncate">{w.names.join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-[#F3EBDD]/35 mt-3 italic">
        Sincronizado com sua conta · histórico privado por usuário.
      </p>
    </div>
  );
}
