import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Structured logging: uma linha JSON por request. Cloudflare Workers
// fazem parse automático e indexam por campo. Mantém o payload pequeno; não loga
// corpos nem headers de auth.
function logRequest(entry: {
  request_id: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  cf_ray?: string | null;
  country?: string | null;
  error?: string;
}) {
  const level = entry.status >= 500 ? "error" : entry.status >= 400 ? "warn" : "info";
  // Endpoints de health são ruidosos — rebaixa pra debug pra não poluir o feed.
  if (entry.path === "/api/public/health" && entry.status < 400) return;
  const line = JSON.stringify({
    level,
    type: "http_request",
    time: new Date().toISOString(),
    ...entry,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function newRequestId(request: Request): string {
  const existing = request.headers.get("x-request-id");
  if (existing && existing.length <= 64) return existing;
  return crypto.randomUUID();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const start = Date.now();
    const url = new URL(request.url);
    const request_id = newRequestId(request);
    const cf_ray = request.headers.get("cf-ray");
    // @ts-expect-error — request.cf existe em workerd, não no tipo padrão.
    const country = (request.cf?.country as string | undefined) ?? null;

    let response: Response;
    let errorMessage: string | undefined;
    try {
      const handler = await getServerEntry();
      response = await handler.fetch(request, env, ctx);
      response = await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          level: "error",
          type: "unhandled_exception",
          time: new Date().toISOString(),
          request_id,
          path: url.pathname,
          method: request.method,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        }),
      );
      response = new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const duration_ms = Date.now() - start;

    // Propaga request_id e Server-Timing pra clientes/proxies correlacionarem.
    const headers = new Headers(response.headers);
    headers.set("x-request-id", request_id);
    headers.set("server-timing", `total;dur=${duration_ms}`);
    const stamped = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

    logRequest({
      request_id,
      method: request.method,
      path: url.pathname,
      status: stamped.status,
      duration_ms,
      cf_ray,
      country,
      error: errorMessage,
    });

    return stamped;
  },
};
