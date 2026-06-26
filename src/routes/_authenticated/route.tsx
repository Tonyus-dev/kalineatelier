import { kalineWordmark } from "@/lib/brand-assets";
import { kalineApple } from "@/lib/brand-assets";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { PRESENCA_META, usePresencaRegime } from "@/lib/use-presenca-regime";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // getSession() lê do storage local (sem round-trip de rede), evitando uma
    // chamada à Supabase a cada navegação. A autorização sensível continua
    // validada no servidor a cada chamada de API (requireUser).
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: AuthedLayout,
});

function HeaderBar() {
  const { toggleSidebar } = useSidebar();
  const { state } = usePresencaRegime();
  const meta = PRESENCA_META[state ?? "green"];

  return (
    <header className="h-14 flex items-center border-b border-[color:var(--border)] backdrop-blur bg-background/60 sticky top-0 z-30">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Abrir menu"
        title={`Menu · ${meta.label}`}
        className="flex-1 flex items-center justify-center gap-3 h-full px-3 min-w-0 hover:bg-[color:var(--ivory)]/[0.03] transition-colors"
      >
        <img src={kalineApple.url} alt="" className="w-8 h-8 apple-glow shrink-0" />
        <img src={kalineWordmark.url} alt="KALINE" className="h-4 w-auto" />
        <span
          className={`ml-2 w-2.5 h-2.5 rounded-full ${meta.dot} ring-2 ${meta.ring}`}
          aria-hidden
        />
      </button>
    </header>
  );
}

function AuthedLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <HeaderBar />
          <main className="flex-1 min-w-0 pb-safe">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
