/**
 * Configuração do acesso à API local da Kaline Offline.
 *
 * A URL vem de `VITE_KALINE_LOCAL_API`; na ausência, usa o default canônico
 * `http://127.0.0.1:4517` (loopback apenas — o servidor local nunca escuta em 0.0.0.0).
 */

export const DEFAULT_LOCAL_API_URL = "http://127.0.0.1:4517";

/** URL base da API local, sem barra final. */
export function getLocalApiUrl(): string {
  const raw = import.meta.env.VITE_KALINE_LOCAL_API?.trim();
  const url = raw && raw.length > 0 ? raw : DEFAULT_LOCAL_API_URL;
  return url.replace(/\/+$/, "");
}

/** Monta uma URL absoluta para um caminho da API local (ex.: `/health`). */
export function localApiUrl(path: string): string {
  const base = getLocalApiUrl();
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
