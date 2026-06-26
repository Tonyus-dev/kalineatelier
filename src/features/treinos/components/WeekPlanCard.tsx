import { CalendarRange } from "lucide-react";
import { WEEK_DAYS } from "../data";
import type { WeekPlan } from "../types";

export function WeekPlanCard({
  week,
  onSet,
}: {
  week: WeekPlan;
  onSet: (day: number, value: WeekPlan[number]) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111016] p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarRange className="w-4 h-4 text-[#C98A65]" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/50">Semana</p>
      </div>
      <ul className="space-y-1.5">
        {WEEK_DAYS.map((d, i) => {
          const v = week[i];
          return (
            <li key={i} className="flex items-center gap-2">
              <span className="w-8 text-[11px] uppercase tracking-[0.22em] text-[#F3EBDD]/40">
                {d}
              </span>
              <input
                value={v?.name ?? ""}
                onChange={(e) => {
                  const name = e.target.value;
                  if (!name) onSet(i, null);
                  else onSet(i, { name, status: v?.status ?? "planned" });
                }}
                placeholder="—"
                className="flex-1 bg-transparent border-b border-white/5 focus:border-[#C98A65] outline-none text-sm h-7"
              />
              {v && (
                <button
                  onClick={() =>
                    onSet(i, {
                      ...v,
                      status:
                        v.status === "rest" ? "planned" : v.status === "planned" ? "done" : "rest",
                    })
                  }
                  className={
                    "text-[10px] uppercase tracking-[0.18em] px-2 h-6 rounded-full border " +
                    (v.status === "done"
                      ? "border-[#16A34A]/50 text-[#16A34A]"
                      : v.status === "rest"
                        ? "border-[#2563EB]/50 text-[#2563EB]"
                        : "border-white/15 text-[#F3EBDD]/55")
                  }
                >
                  {v.status}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
