import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Gavel, Plus, Search } from "lucide-react";
import {
  addLegalChunks,
  listLegalChunks,
  listLegalDocuments,
  searchLegal,
  upsertLegalDocument,
  type LegalSearchResult,
} from "@/lib/legal.functions";
import { supabase } from "@/integrations/supabase/client";

import {
  CardListSkeleton,
  RouteErrorBoundary,
  RouteNotFoundBoundary,
} from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/juridico")({
  component: JuridicoPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

const STATUS_TONE: Record<string, string> = {
  vigente: "text-[#16A34A]",
  em_revisao: "text-[#D9A441]",
  revogado: "text-[#BE123C]",
  bloqueado: "text-[#BE123C]",
  alterado_recentemente: "text-[#D9A441]",
};

function JuridicoPage() {
  const qc = useQueryClient();
  const listDocs = useServerFn(listLegalDocuments);
  const search = useServerFn(searchLegal);
  const upsertDoc = useServerFn(upsertLegalDocument);
  const addChunks = useServerFn(addLegalChunks);
  const listChunks = useServerFn(listLegalChunks);

  const docs = useQuery({
    queryKey: ["legal-docs"],
    queryFn: () => listDocs({ data: {} }),
  });

  const [q, setQ] = useState("");
  const [docFilter, setDocFilter] = useState<string | undefined>(undefined);
  const [results, setResults] = useState<LegalSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  async function runSearch() {
    if (q.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await search({ data: { query: q.trim(), document_id: docFilter, limit: 30 } });
      setResults(res);
    } finally {
      setSearching(false);
    }
  }

  // ── Admin panel ──
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      setIsAdmin(!!data);
      return !!data;
    },
  });

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#08080E] text-[#F3EBDD]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 space-y-6">
        <header className="flex items-center gap-3 flex-wrap">
          <Gavel className="w-5 h-5 text-[#C98A65]" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#D9A441]">
              Jurídico · corpus curado
            </p>
            <h1 className="serif text-2xl sm:text-3xl">Buscar lei seca, súmula, tema</h1>
          </div>
        </header>

        <section className="rounded-2xl border border-white/5 bg-[#111016] p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-[#C98A65] shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="ex: art. 5º inciso II  ·  responsabilidade civil  ·  súmula 7"
              className="flex-1 min-w-0 bg-transparent border-b border-white/10 focus:border-[#C98A65] outline-none text-sm h-9"
            />
            <select
              value={docFilter ?? ""}
              onChange={(e) => setDocFilter(e.target.value || undefined)}
              className="bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2 text-xs"
            >
              <option value="">todos os documentos</option>
              {(docs.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <button
              onClick={runSearch}
              disabled={searching || q.trim().length < 2}
              className="text-sm px-3 h-9 rounded-md bg-[#C98A65] text-[#08080E] hover:bg-[#D9A441] disabled:opacity-40"
            >
              {searching ? "…" : "buscar"}
            </button>
          </div>
          <p className="text-[11px] text-[#F3EBDD]/45 italic">
            Apenas o corpus curado responde. Nada é gerado ou completado pelo modelo. Status
            diferente de
            <span className="text-[#D9A441]"> vigente</span> aparece sinalizado.
          </p>
        </section>

        {results && (
          <section className="space-y-3">
            {results.needs_disambiguation && (
              <div className="rounded-xl border border-[#D9A441]/40 bg-[#D9A441]/5 p-3 text-sm text-[#D9A441]">
                Mais de um documento candidato. Use o filtro acima para escolher antes de citar.
              </div>
            )}
            {results.chunks.length === 0 && (
              <p className="text-sm italic text-[#F3EBDD]/45">
                Nada encontrado no corpus curado. Não vou completar de memória.
              </p>
            )}
            {results.chunks.map((c) => (
              <article key={c.id} className="rounded-xl border border-white/5 bg-[#111016] p-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] mb-1">
                  <span className="text-[#D9A441]">{c.document_title}</span>
                  <span className="text-[#F3EBDD]/55">· {c.path}</span>
                  <span className={`ml-auto ${STATUS_TONE[c.status] ?? "text-[#F3EBDD]/55"}`}>
                    {c.status}
                  </span>
                </div>
                <p className="text-sm text-[#F3EBDD]/90 whitespace-pre-wrap">{c.text}</p>
                {c.source_url && (
                  <a
                    href={c.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#C98A65] hover:text-[#D9A441] mt-2 inline-block"
                  >
                    fonte oficial ↗
                  </a>
                )}
              </article>
            ))}
          </section>
        )}

        <section>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#F3EBDD]/45 mb-2">
            Documentos no corpus
          </p>
          {docs.isLoading && <CardListSkeleton rows={4} />}
          {docs.data && docs.data.length === 0 && (
            <p className="text-sm italic text-[#F3EBDD]/45">
              Corpus vazio.{" "}
              {isAdmin
                ? "Use o painel abaixo para importar."
                : "Peça ao admin para importar documentos."}
            </p>
          )}
          <ul className="grid sm:grid-cols-2 gap-2 fade-up">
            {(docs.data ?? []).map((d) => (
              <li key={d.id} className="rounded-lg border border-white/5 bg-[#111016] p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#F3EBDD]">{d.title}</span>
                  <span
                    className={`text-[10px] uppercase tracking-[0.2em] ml-auto ${STATUS_TONE[d.status] ?? ""}`}
                  >
                    {d.status}
                  </span>
                </div>
                <p className="text-[11px] text-[#F3EBDD]/45 mt-0.5">
                  {d.kind} · {d.jurisdicao}
                  {d.ano ? ` · ${d.ano}` : ""}
                  {d.numero ? ` · nº ${d.numero}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {isAdmin && (
          <AdminImportPanel
            upsertDoc={upsertDoc}
            addChunks={addChunks}
            listChunks={listChunks}
            onAfter={() => qc.invalidateQueries({ queryKey: ["legal-docs"] })}
            docs={docs.data ?? []}
          />
        )}
      </div>
    </div>
  );
}

function AdminImportPanel({
  upsertDoc,
  addChunks,
  listChunks,
  onAfter,
  docs,
}: {
  upsertDoc: (args: {
    data: Parameters<typeof upsertLegalDocument>[0]["data"];
  }) => Promise<unknown>;
  addChunks: (args: { data: Parameters<typeof addLegalChunks>[0]["data"] }) => Promise<unknown>;
  listChunks: (args: { data: { document_id: string } }) => Promise<unknown>;
  onAfter: () => void;
  docs: Array<{ id: string; title: string; slug: string; status: string }>;
}) {
  const [tab, setTab] = useState<"doc" | "chunks">("doc");
  // doc form
  const [kind, setKind] = useState("lei");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [ano, setAno] = useState<string>("");
  const [numero, setNumero] = useState("");
  const [status, setStatus] = useState("vigente");
  const [sourceUrl, setSourceUrl] = useState("");
  const [busy, setBusy] = useState(false);
  // chunks form
  const [docId, setDocId] = useState("");
  const [raw, setRaw] = useState("");
  const [replace, setReplace] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveDoc() {
    if (busy || !title || !slug) return;
    setBusy(true);
    setMsg(null);
    try {
      await upsertDoc({
        data: {
          kind: kind as never,
          title,
          slug,
          ano: ano ? Number(ano) : null,
          numero: numero || undefined,
          status: status as never,
          source_url: sourceUrl || null,
        },
      });
      setMsg("documento salvo");
      onAfter();
    } catch (e) {
      setMsg(`erro: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveChunks() {
    if (busy || !docId || !raw.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      // Formato simples: cada linha → "<level>|<path>|<text>"
      // ex: artigo|art. 1º|"Todo o poder emana do povo..."
      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const chunks = lines.map((l, i) => {
        const [level, path, ...rest] = l.split("|");
        return {
          level: (level?.trim() as never) ?? ("artigo" as never),
          path: path?.trim() ?? `linha ${i + 1}`,
          ordinal: i,
          text: rest.join("|").trim(),
        };
      });
      await addChunks({ data: { document_id: docId, chunks, replace } });
      setMsg(`${chunks.length} trechos inseridos`);
      setRaw("");
    } catch (e) {
      setMsg(`erro: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#C98A65]/30 bg-[#111016] p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Plus className="w-4 h-4 text-[#C98A65]" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#D9A441]">Admin · importar</p>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setTab("doc")}
            className={`text-[11px] px-2 h-7 rounded-md border ${tab === "doc" ? "border-[#C98A65] text-[#D9A441]" : "border-white/10 text-[#F3EBDD]/55"}`}
          >
            documento
          </button>
          <button
            onClick={() => setTab("chunks")}
            className={`text-[11px] px-2 h-7 rounded-md border ${tab === "chunks" ? "border-[#C98A65] text-[#D9A441]" : "border-white/10 text-[#F3EBDD]/55"}`}
          >
            trechos
          </button>
        </div>
      </div>

      {tab === "doc" && (
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2"
          >
            {[
              "constituicao",
              "codigo",
              "lei",
              "decreto",
              "sumula",
              "tema",
              "enunciado",
              "outro",
            ].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2"
          >
            {["vigente", "revogado", "em_revisao", "bloqueado"].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2 sm:col-span-2"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="slug (ex: cf-88)"
            className="bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2"
          />
          <input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="nº (opcional)"
            className="bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2"
          />
          <input
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            placeholder="ano"
            type="number"
            className="bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2"
          />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="URL oficial (planalto.gov.br...)"
            className="bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2"
          />
          <button
            onClick={saveDoc}
            disabled={busy || !title || !slug}
            className="sm:col-span-2 px-3 h-9 rounded-md bg-[#C98A65] text-[#08080E] hover:bg-[#D9A441] disabled:opacity-40"
          >
            {busy ? "salvando…" : "salvar documento"}
          </button>
        </div>
      )}

      {tab === "chunks" && (
        <div className="space-y-2 text-sm">
          <select
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            className="w-full bg-[#0B0A10] border border-white/10 rounded-md h-9 px-2"
          >
            <option value="">selecione o documento</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            placeholder="Uma linha por trecho. Formato: nivel|path|texto&#10;ex: artigo|art. 5º|Todos são iguais perante a lei..."
            className="w-full bg-[#0B0A10] border border-white/10 rounded-md p-2 text-sm outline-none focus:border-[#C98A65] resize-y font-mono"
          />
          <label className="flex items-center gap-2 text-xs text-[#F3EBDD]/70">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />
            substituir todos os trechos existentes deste documento
          </label>
          <button
            onClick={saveChunks}
            disabled={busy || !docId || !raw.trim()}
            className="px-3 h-9 rounded-md bg-[#C98A65] text-[#08080E] hover:bg-[#D9A441] disabled:opacity-40"
          >
            {busy ? "importando…" : "importar trechos"}
          </button>
        </div>
      )}

      {msg && <p className="text-xs text-[#F3EBDD]/60">{msg}</p>}
    </section>
  );
}
