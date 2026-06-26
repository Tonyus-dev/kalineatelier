import { Activity } from "lucide-react";
import { SEMAPHORE_META } from "../data";
import type { BodySignals, SemaphoreState } from "../types";
import { todayIso } from "../utils";

function Pills({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/45 mb-1">{label}</p>
      <div className="flex gap-1 flex-wrap">
        {options.map((o) => {
          const active = o === value;
          return (
            <button
              key={o}
              onClick={() => onChange(o)}
              className={
                "px-2 h-7 rounded-full border text-[11px] transition " +
                (active
                  ? "border-[#C98A65] text-[#F3EBDD] bg-[#C98A65]/15"
                  : "border-white/10 text-[#F3EBDD]/60 hover:border-[#C98A65]/60")
              }
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SemaphoreCard({
  signals,
  state,
  onChange,
}: {
  signals: BodySignals | null;
  state: SemaphoreState;
  onChange: (s: BodySignals) => void;
}) {
  const meta = SEMAPHORE_META[state];
  const next: BodySignals = signals ?? {
    date: todayIso(),
    energy: "media",
    sleep: "ok",
    pain: "nenhuma",
    available: 40,
  };
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111016] p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-3 h-3 rounded-full ${meta.color} ring-2 ${meta.ring}`} />
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/50">
            Semáforo físico
          </p>
          <p className="serif text-[#F3EBDD] text-base">{meta.label}</p>
        </div>
        <Activity className="w-4 h-4 text-[#C98A65]" />
      </div>
      <p className="text-[11px] text-[#F3EBDD]/50 mb-3 italic">
        Semáforo não é diagnóstico. É ritmo de treino.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Pills
          label="Energia"
          value={next.energy}
          options={["baixa", "media", "alta"]}
          onChange={(v) => onChange({ ...next, energy: v as BodySignals["energy"] })}
        />
        <Pills
          label="Sono"
          value={next.sleep}
          options={["ruim", "ok", "bom"]}
          onChange={(v) => onChange({ ...next, sleep: v as BodySignals["sleep"] })}
        />
        <Pills
          label="Dor"
          value={next.pain}
          options={["nenhuma", "leve", "relevante"]}
          onChange={(v) => onChange({ ...next, pain: v as BodySignals["pain"] })}
        />
        <Pills
          label="Tempo"
          value={String(next.available)}
          options={["20", "40", "60"]}
          onChange={(v) => onChange({ ...next, available: Number(v) as BodySignals["available"] })}
        />
      </div>
    </div>
  );
}
