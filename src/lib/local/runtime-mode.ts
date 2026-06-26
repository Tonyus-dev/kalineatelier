/**
 * Runtime mode da Kaline.
 *
 * "online"  → matriz herdada do Totalidade (Supabase + OpenRouter). Comportamento atual.
 * "offline" → Kaline Offline local-first (API local em 127.0.0.1:64113). Apenas preparado
 *             nesta fase: nenhuma rota real é trocada ainda.
 *
 * O default é SEMPRE "online", para não quebrar o app atual. O modo offline só é assumido
 * quando explicitamente configurado via env.
 */

export type RuntimeMode = "online" | "offline";

export const DEFAULT_RUNTIME_MODE: RuntimeMode = "online";

/**
 * Lê o runtime mode de `VITE_KALINE_RUNTIME_MODE`. Qualquer valor diferente de "offline"
 * (incluindo ausência) resolve para "online" — default seguro.
 */
export function getRuntimeMode(): RuntimeMode {
  const raw = import.meta.env.VITE_KALINE_RUNTIME_MODE;
  return raw === "offline" ? "offline" : DEFAULT_RUNTIME_MODE;
}

export function isOfflineMode(): boolean {
  return getRuntimeMode() === "offline";
}
