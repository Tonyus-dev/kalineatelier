/**
 * Runtime mode da Kaline.
 *
 * "online"  → matriz herdada do Totalidade (Supabase + OpenRouter).
 * "offline" → Kaline Offline local-first (API local em 127.0.0.1:64113).
 *
 * O default é "offline": este é o Kaline Atelier (offline-first). O modo online
 * só é assumido quando explicitamente configurado via env.
 */

export type RuntimeMode = "online" | "offline";

export const DEFAULT_RUNTIME_MODE: RuntimeMode = "offline";

/**
 * Lê o runtime mode de `VITE_KALINE_RUNTIME_MODE`. Qualquer valor diferente de "online"
 * (incluindo ausência) resolve para "offline" — default do Atelier.
 */
export function getRuntimeMode(): RuntimeMode {
  const raw = import.meta.env.VITE_KALINE_RUNTIME_MODE;
  return raw === "online" ? "online" : DEFAULT_RUNTIME_MODE;
}

export function isOfflineMode(): boolean {
  return getRuntimeMode() === "offline";
}
