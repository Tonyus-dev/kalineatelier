import { HeartPulse } from "lucide-react";
import type { BodySignals } from "../types";
import { todayIso } from "../utils";

export function BodySignalsCard({
  signals,
  onChange,
}: {
  signals: BodySignals | null;
  onChange: (s: BodySignals) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111016] p-4">
      <div className="flex items-center gap-2 mb-2">
        <HeartPulse className="w-4 h-4 text-[#C98A65]" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/50">Sinais do corpo</p>
      </div>
      <textarea
        value={signals?.notes ?? ""}
        onChange={(e) =>
          onChange({
            ...(signals ?? {
              date: todayIso(),
              energy: "media",
              sleep: "ok",
              pain: "nenhuma",
              available: 40,
            }),
            notes: e.target.value,
          })
        }
        placeholder="Como o corpo está hoje? (dor, sono, tensão, humor)"
        rows={3}
        className="w-full bg-[#0B0A10] border border-white/10 rounded-md p-2 text-xs outline-none focus:border-[#C98A65] resize-none"
      />
      <p className="text-[10px] text-[#F3EBDD]/45 mt-2 italic">
        Se houver dor forte, tontura, falta de ar ou sintoma preocupante, interrompa e procure
        orientação profissional.
      </p>
    </div>
  );
}
