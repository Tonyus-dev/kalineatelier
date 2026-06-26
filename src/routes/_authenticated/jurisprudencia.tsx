import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LazyMarkdown } from "@/components/LazyMarkdown";
import { supabase } from "@/integrations/supabase/client";
import { pesquisarJuridico } from "@/lib/juridico.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, Save, Loader2, Trash2 } from "lucide-react";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/jurisprudencia")({
  component: () => <AcervoPage modo="jurisprudencia" />,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

type Saved = {
  id: string;
  ementa: string | null;
  tribunal: string | null;
  numero: string | null;
  fonte_url: string | null;
  conteudo: string | null;
  created_at: string;
};

export function AcervoPage({ modo }: { modo: "jurisprudencia" | "legislacao" }) {
  const [query, setQuery] = useState("");
  const [resultado, setResultado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Saved[]>([]);
  const pesquisar = useServerFn(pesquisarJuridico);

  async function load() {
    if (modo === "jurisprudencia") {
      const { data } = await supabase
        .from("jurisprudencia")
        .select("id, ementa, tribunal, numero, fonte_url, conteudo, created_at")
        .order("created_at", { ascending: false });
      setItems((data ?? []) as unknown as Saved[]);
    } else {
      const { data } = await supabase
        .from("legislacao")
        .select("id, titulo, texto, created_at")
        .order("created_at", { ascending: false });
      setItems((data ?? []) as unknown as Saved[]);
    }
  }
  useEffect(() => {
    load();
  }, [modo]);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResultado(null);
    setAviso(null);
    try {
      const r = await pesquisar({ data: { query, modo } });
      setResultado(r.resultado);
      setAviso(r.aviso);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na busca");
    } finally {
      setLoading(false);
    }
  }

  async function salvar() {
    if (!resultado) return;
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const error =
      modo === "jurisprudencia"
        ? (
            await supabase
              .from("jurisprudencia")
              .insert({ user_id: userRes.user.id, ementa: query, conteudo: resultado })
          ).error
        : (
            await supabase
              .from("legislacao")
              .insert({ user_id: userRes.user.id, titulo: query, texto: resultado })
          ).error;
    if (error) toast.error(error.message);
    else {
      toast.success("Salvo no acervo");
      load();
    }
  }

  async function remover(id: string) {
    if (modo === "jurisprudencia") {
      await supabase.from("jurisprudencia").delete().eq("id", id);
    } else {
      await supabase.from("legislacao").delete().eq("id", id);
    }
    load();
  }

  const titulo = modo === "jurisprudencia" ? "Jurisprudência" : "Legislação";
  const placeholder =
    modo === "jurisprudencia"
      ? "Ex: prescrição intercorrente trabalhista STJ"
      : "Ex: art. 5º CF inciso LXXVIII duração razoável";

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="serif text-2xl sm:text-3xl text-[color:var(--gold)] mb-1">{titulo}</h1>
      <p className="text-[color:var(--ivory-dim)] text-sm mb-5 sm:mb-6">
        Busca em tempo real. Salve no acervo o que for útil.
      </p>

      <form onSubmit={buscar} className="flex flex-col sm:flex-row gap-2 mb-6">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          required
          minLength={3}
          className="h-12 text-base"
        />
        <Button type="submit" disabled={loading} className="h-12 w-full sm:w-auto">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4 mr-1 sm:mr-0" />
              <span className="sm:hidden">Buscar</span>
            </>
          )}
        </Button>
      </form>

      {aviso && (
        <div className="rounded-xl border border-[color:var(--border)] bg-card/40 p-4 mb-6 text-sm text-[color:var(--ivory-dim)]">
          {aviso}
        </div>
      )}
      {resultado && (
        <div className="rounded-xl border border-[color:var(--border)] bg-card p-4 sm:p-5 mb-8">
          <div className="prose prose-sm prose-invert max-w-none break-words">
            <LazyMarkdown>{resultado}</LazyMarkdown>
          </div>
          <Button size="sm" onClick={salvar} className="mt-3 w-full sm:w-auto">
            <Save className="w-3 h-3 mr-1" /> Salvar no acervo
          </Button>
        </div>
      )}

      <h2 className="serif text-lg sm:text-xl text-[color:var(--gold)] mb-3">Acervo</h2>
      {items.length === 0 && (
        <p className="text-sm text-[color:var(--ivory-dim)]">Nenhum item salvo ainda.</p>
      )}
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.id} className="rounded-xl border border-[color:var(--border)] bg-card/60 p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="text-sm text-[color:var(--gold)] mb-1 break-words">
                  {modo === "jurisprudencia"
                    ? it.ementa
                    : (it as unknown as { titulo?: string }).titulo}
                </p>
                <div className="prose prose-sm prose-invert max-w-none break-words">
                  <LazyMarkdown>
                    {modo === "jurisprudencia"
                      ? (it.conteudo ?? "")
                      : ((it as unknown as { texto?: string }).texto ?? "")}
                  </LazyMarkdown>
                </div>
              </div>
              <button
                onClick={() => remover(it.id)}
                className="shrink-0 text-[color:var(--ivory-dim)] hover:text-destructive p-1"
                aria-label="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
