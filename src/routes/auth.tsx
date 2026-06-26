import { kalineWordmark } from "@/lib/brand-assets";
import { kalineApple } from "@/lib/brand-assets";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/chat" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada. Verifique seu email se confirmação for exigida.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message || "Erro Apple");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-[color:var(--border)] bg-card/60 p-6 backdrop-blur sm:p-8">
        <div className="mb-6 text-center">
          <img
            src={kalineApple.url}
            alt="Kaline"
            className="mx-auto h-24 w-24 apple-glow sm:h-28 sm:w-28"
          />
          <img src={kalineWordmark.url} alt="KALINE" className="mx-auto mt-3 h-7 w-auto sm:h-8" />
          <p className="mt-2 text-[11px] uppercase tracking-[0.28em] text-[color:var(--ivory-dim)] sm:text-xs">
            Presença que importa
          </p>
        </div>

        <Button
          onClick={handleApple}
          variant="outline"
          className="mb-4 h-12 w-full"
          disabled={loading}
        >
          Entrar com Apple
        </Button>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-[color:var(--border)]" />
          <span className="text-xs text-[color:var(--ivory-dim)]">ou</span>
          <div className="h-px flex-1 bg-[color:var(--border)]" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <div>
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <div>
            <Label htmlFor="auth-password">Senha</Label>
            <Input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-base"
            />
          </div>
          <Button type="submit" className="h-12 w-full" disabled={loading} aria-busy={loading}>
            {loading
              ? mode === "signin"
                ? "Entrando..."
                : "Criando conta..."
              : mode === "signin"
                ? "Entrar"
                : "Criar conta"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-[color:var(--ivory-dim)] hover:text-[color:var(--gold)]"
        >
          {mode === "signin" ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
