import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import "../lib/fonts";
import { reportClientError } from "../lib/client-error-reporting";
import { Toaster } from "../components/ui/sonner";

function getPublicConfigScript() {
  const env = typeof process !== "undefined" ? process.env : {};
  const supabaseUrl = env.SUPABASE_URL;
  const supabasePublishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const payload = {
    SUPABASE_URL: supabaseUrl || "",
    SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey || "",
  };
  return `window.__TOTALIDADE_CONFIG__=${JSON.stringify(payload).replace(/</g, "\\u003c")};`;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportClientError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado por aqui. Você pode tentar novamente ou voltar ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0b0a09" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Kaline" },
      { name: "mobile-web-app-capable", content: "yes" },
      { title: "K∧LINE — presença viva" },
      {
        name: "description",
        content: "K∧LINE: cockpit pessoal com Kaline, suas facetas e Ká como guardião de origem.",
      },
      { property: "og:title", content: "K∧LINE — presença viva" },
      { property: "og:description", content: "Cockpit pessoal com Kaline e suas facetas." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/ka-apple.png" },
      { rel: "icon", href: "/ka-apple.png", type: "image/png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: getPublicConfigScript() }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Registra o service worker (PWA instalável). Só em produção, para não interferir no dev.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (!import.meta.env.PROD) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // View Transitions API — crossfade nativo entre rotas.
  // Intercepta cada navegação e re-renderiza dentro de startViewTransition.
  useEffect(() => {
    const doc = typeof document !== "undefined" ? document : null;
    const supportsVT =
      doc &&
      typeof (doc as Document & { startViewTransition?: unknown }).startViewTransition ===
        "function";
    if (!supportsVT) return;

    const unsub = router.subscribe("onBeforeNavigate", () => {
      // Coalescent: cada navegação dispara uma transição.
      const d = document as Document & {
        startViewTransition: (cb: () => void) => { finished: Promise<void> };
      };
      let resolveReady: (() => void) | null = null;
      const ready = new Promise<void>((r) => {
        resolveReady = r;
      });
      d.startViewTransition(() => ready);
      // Liberar no próximo frame após o React commit do novo match.
      requestAnimationFrame(() => requestAnimationFrame(() => resolveReady?.()));
    });

    return () => {
      unsub();
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors closeButton position="top-center" />
    </QueryClientProvider>
  );
}
