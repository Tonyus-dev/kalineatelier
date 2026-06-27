// Livros & Resumos, Kaline Offline.
//
// Simplificação deliberada em relação à versão online: o texto extraído
// (PDF/DOCX/TXT) é processado no navegador como antes, mas o arquivo
// original não é mais enviado a nenhum storage — só o texto extraído é
// salvo no local-server (SQLite). Geração de infográfico foi removida
// (dependia de um modelo de imagem via OpenRouter, fora do escopo offline).
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LazyMarkdown } from "@/components/LazyMarkdown";
import {
  createLocalLivro,
  deleteLocalLivro,
  listLocalLivros,
  type LocalLivro,
} from "@/lib/local/local-api-client";
import { resumirConteudo } from "@/lib/resumo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/livros")({
  component: LivrosPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Use a worker via CDN to avoid bundler config issues
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n\n";
    if (text.length > 80000) break;
  }
  return text;
}

function LivrosPage() {
  const [items, setItems] = useState<LocalLivro[]>([]);
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [busy, setBusy] = useState(false);
  const resumir = useServerFn(resumirConteudo);

  async function load() {
    const { livros } = await listLocalLivros();
    setItems(livros);
  }
  useEffect(() => {
    load();
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!titulo.trim()) {
      toast.error("Informe um título primeiro");
      return;
    }
    setBusy(true);
    try {
      let text = "";
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        text = await extractPdfText(f);
      } else if (f.name.toLowerCase().endsWith(".docx")) {
        const buf = await f.arrayBuffer();
        const { default: mammoth } = await import("mammoth");
        const r = await mammoth.extractRawText({ arrayBuffer: buf });
        text = r.value;
      } else if (f.type.startsWith("text/")) {
        text = await f.text();
      } else {
        throw new Error("Formato não suportado (use PDF, DOCX ou TXT)");
      }

      await createLocalLivro({
        titulo,
        autor: autor || undefined,
        texto_extraido: text.slice(0, 120000),
      });
      setTitulo("");
      setAutor("");
      toast.success("Texto extraído");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function fazerResumo(it: LocalLivro) {
    setBusy(true);
    try {
      await resumir({ data: { livro_id: it.id } });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function remover(it: LocalLivro) {
    await deleteLocalLivro(it.id);
    load();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="serif text-2xl sm:text-3xl text-[color:var(--gold)] mb-1">Livros & Resumos</h1>
      <p className="text-[color:var(--ivory-dim)] text-sm mb-5 sm:mb-6">
        Envie PDF, DOCX ou TXT. Gere fichamento do conteúdo.
      </p>

      <div className="rounded-2xl border border-[color:var(--border)] bg-card p-4 sm:p-5 mb-8 space-y-3">
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título do livro"
          className="h-12 text-base"
        />
        <Input
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
          placeholder="Autor (opcional)"
          className="h-12 text-base"
        />
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <Button asChild disabled={busy} className="h-12 w-full sm:w-auto">
            <label className="cursor-pointer">
              <Upload className="w-4 h-4 mr-1" /> Enviar arquivo
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,text/plain"
                hidden
                onChange={onFile}
              />
            </label>
          </Button>
          {busy && (
            <Loader2 className="w-5 h-5 animate-spin text-[color:var(--gold)] self-center" />
          )}
        </div>
      </div>

      <ul className="space-y-4">
        {items.map((it) => (
          <li
            key={it.id}
            className="rounded-xl border border-[color:var(--border)] bg-card/60 p-4 sm:p-5"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <h3 className="serif text-lg sm:text-xl text-[color:var(--ivory)] break-words">
                  {it.titulo}
                </h3>
                {it.autor && (
                  <p className="text-xs text-[color:var(--ivory-dim)] break-words">{it.autor}</p>
                )}
              </div>
              <button
                onClick={() => remover(it)}
                className="shrink-0 text-[color:var(--ivory-dim)] hover:text-destructive p-1"
                aria-label="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {it.resumo ? (
              <div className="prose prose-sm prose-invert max-w-none mt-3 break-words">
                <LazyMarkdown>{it.resumo}</LazyMarkdown>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => fazerResumo(it)}
                disabled={busy}
                className="mt-3 w-full sm:w-auto"
              >
                <Sparkles className="w-3 h-3 mr-1" /> Gerar fichamento
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
