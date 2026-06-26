import { khoraAvatar } from "@/lib/brand-assets";
import { PRESENCE_BY_STATE } from "../data";
import type { SemaphoreState } from "../types";

export function PresenceKhora({ semaphore }: { semaphore: SemaphoreState }) {
  const { title, sub } = PRESENCE_BY_STATE[semaphore];
  return (
    <div className="rounded-2xl border border-white/5 bg-[#111016] p-4 sm:p-5 flex items-center gap-4">
      <img
        src={khoraAvatar.url}
        alt="Khora"
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-1 ring-[#C98A65]/40"
      />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#C98A65]">
          faceta khora · naturalidade
        </p>
        <p className="serif text-lg sm:text-xl text-[#F3EBDD] mt-1">{title}</p>
        <p className="text-xs sm:text-sm text-[#F3EBDD]/60 mt-1">{sub}</p>
      </div>
    </div>
  );
}
