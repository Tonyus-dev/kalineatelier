import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isOfflineMode } from "@/lib/local/runtime-mode";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // Modo offline: sem Supabase — vai direto para o chat.
    if (isOfflineMode()) throw redirect({ to: "/chat" });

    // Modo online: requires auth.
    if (typeof window === "undefined") throw redirect({ to: "/auth" });
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/chat" : "/auth" });
  },
  component: () => null,
});
