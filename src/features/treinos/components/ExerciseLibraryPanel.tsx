import { useState } from "react";
import { Library } from "lucide-react";
import { MUSCLE_FILTERS } from "../data";
import type { Exercise } from "../types";

export function ExerciseLibraryPanel({ exercises }: { exercises: Exercise[] }) {
  const [filter, setFilter] = useState<string>("Todos");
  const list = exercises.filter((e) => filter === "Todos" || e.muscle_group === filter);
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111016] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Library className="w-4 h-4 text-[#C98A65]" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/50">Biblioteca</p>
      </div>
      <div className="flex gap-1 mb-3 overflow-x-auto -mx-1 px-1">
        {["Todos", ...MUSCLE_FILTERS].map((m) => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={
              "shrink-0 text-[10px] uppercase tracking-[0.18em] px-2 h-6 rounded-full border whitespace-nowrap transition " +
              (filter === m
                ? "border-[#C98A65] text-[#D9A441] bg-[#C98A65]/10"
                : "border-white/10 text-[#F3EBDD]/55 hover:border-[#C98A65]/50")
            }
          >
            {m}
          </button>
        ))}
      </div>
      <ul className="space-y-1 text-xs max-h-56 overflow-y-auto pr-1">
        {list.map((e) => (
          <li key={e.id} className="flex justify-between gap-2 border-b border-white/5 pb-1">
            <span className="text-[#F3EBDD]/85 truncate">{e.name}</span>
            <span className="text-[10px] text-[#F3EBDD]/40 shrink-0">{e.equipment}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
