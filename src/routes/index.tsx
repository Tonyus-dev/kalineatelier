import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") throw redirect({ to: "/auth" });
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/chat" : "/auth" });
  },
  component: () => null,
});
