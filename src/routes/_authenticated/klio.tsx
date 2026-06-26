import { kalineApple } from "@/lib/brand-assets";
import { klioApple } from "@/lib/brand-assets";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureThread } from "@/lib/ensure-thread";
import { Send, Scale, BookOpen, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/klio")({
  component: KlioHome,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

const cards = [
  {
    id: "oab",
    title: "OAB / Jurídico",
    desc: "Lei seca, Constituição, códigos, jurisprudência curada, peças e revisão por tema.",
    cta: "Abrir modo OAB",
    icon: Scale,
    initial:
      "Vamos estudar para a OAB pelo caminho seguro: lei seca primeiro, fonte normativa depois, e só então revisão ou questão. Qual tema?",
    surface: "oab" as const,
  },
  {
    id: "leitor",
    title: "Leitor de Textos",
    desc: "PDF, Word, foto, literatura, artigo acadêmico ou trecho colado.",
    cta: "Enviar texto",
    icon: BookOpen,
    initial:
      "Envie o texto (PDF/Word/foto) ou cole um trecho. Eu separo tese, estrutura e conceitos difíceis — posso transformar em fichamento.",
    surface: "leitor" as const,
  },
  {
    id: "plano",
    title: "Plano & Fichamento",
    desc: "Cronograma, fichamento crítico, revisão, prova e síntese.",
    cta: "Organizar estudo",
    icon: ListTodo,
    initial: "Diga o tema, prazo e material disponível. Eu organizo leitura, fichamento e revisão.",
    surface: "plano" as const,
  },
];

function KlioHome() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as { full_name?: string; name?: string } | undefined;
      setName(meta?.full_name || meta?.name || data.user?.email?.split("@")[0] || "");
    });
  }, []);

  async function startChat(initialPrompt: string, _surface: string) {
    if (starting) return;
    setStarting(true);
    try {
      // Conteúdo acadêmico (OAB, leitura, fichamento) foi absorvido pela Kaline —
      // a faceta "klio" agora é a superfície de cuidado (Kháris).
      const id = await ensureThread("kaline");
      if (!id) return;
      await navigate({
        to: "/chat/$threadId",
        params: { threadId: id },
        search: { seed: initialPrompt },
      });
    } finally {
      setStarting(false);
    }
  }

  const chips = [
    {
      label: "OAB",
      seed: "Quero estudar para a OAB. Vamos pelo caminho seguro: lei seca, fonte e depois questão.",
      surface: "oab",
    },
    {
      label: "Interpretar texto",
      seed: "Vou te enviar um texto. Identifique tese, estrutura, conceitos difíceis.",
      surface: "leitor",
    },
    {
      label: "Fichamento",
      seed: "Quero transformar um material em fichamento crítico em tópicos.",
      surface: "plano",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <section className="text-center mb-6 sm:mb-10">
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
          <img
            src={kalineApple.url}
            alt="Kaline"
            className="w-16 h-16 sm:w-20 sm:h-20 apple-glow"
          />
          <div className="text-[color:var(--gold)]/60 text-2xl font-thin">·</div>
          <img
            src={klioApple.url}
            alt="Klio"
            className="w-16 h-16 sm:w-20 sm:h-20 gold-glow apple-glow"
          />
        </div>
        <p className="text-[10px] sm:text-xs tracking-[0.32em] uppercase text-[color:var(--ivory-dim)] mt-3 sm:mt-4">
          Kaline · Klio
        </p>
        <h1 className="serif text-4xl sm:text-5xl text-[color:var(--gold)] mt-2 tracking-wide">
          KLIO
        </h1>
        <p className="text-sm sm:text-base text-[color:var(--ivory-dim)] mt-2 sm:mt-3 italic">
          Sou Kaline em modo de estudo.{name && ` Olá, ${name}.`}
        </p>
      </section>

      <div className="rounded-2xl border border-[color:var(--border)] bg-card/40 p-4 mb-4">
        <p className="text-[10px] sm:text-xs tracking-[0.28em] uppercase text-[color:var(--gold)] mb-2">
          KITT Acadêmico
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) startChat(input.trim(), "geral");
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Envie tema, texto, dúvida…"
            className="flex-1 rounded-xl bg-background/60 border border-[color:var(--border)] px-4 h-12 outline-none focus:border-[color:var(--gold)] text-base"
          />
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto h-12"
            disabled={starting || !input.trim()}
            aria-busy={starting}
          >
            <Send className="w-4 h-4 mr-1" /> {starting ? "Abrindo..." : "Enviar"}
          </Button>
        </form>
        <div className="flex gap-2 mt-3 -mx-4 px-4 overflow-x-auto sm:flex-wrap sm:mx-0 sm:px-0 sm:overflow-visible">
          {chips.map((c) => (
            <button
              key={c.label}
              onClick={() => startChat(c.seed, c.surface)}
              disabled={starting}
              className="shrink-0 text-xs px-3 py-2 rounded-full border border-[color:var(--border)] hover:border-[color:var(--gold)] text-[color:var(--ivory-dim)] hover:text-[color:var(--gold)] transition whitespace-nowrap disabled:opacity-50 disabled:cursor-wait"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => startChat(c.initial, c.surface)}
            className="text-left rounded-2xl border border-[color:var(--border)] bg-card/60 p-5 hover:border-[color:var(--gold)] transition"
          >
            <c.icon className="w-6 h-6 text-[color:var(--gold)]" />
            <h3 className="serif text-xl text-[color:var(--ivory)] mt-3">{c.title}</h3>
            <p className="text-sm text-[color:var(--ivory-dim)] mt-2 leading-relaxed">{c.desc}</p>
            <span className="inline-block mt-4 text-xs tracking-[0.2em] uppercase text-[color:var(--gold)]">
              {c.cta} →
            </span>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-[color:var(--border)] bg-card/30 p-5 sm:p-6 mb-8">
        <p className="text-[10px] sm:text-xs tracking-[0.28em] uppercase text-[color:var(--gold)] mb-3">
          Metodologia
        </p>
        <ol className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3 text-sm text-[color:var(--ivory-dim)]">
          <li>
            <span className="serif text-[color:var(--gold)] text-lg">1.</span> Ler com atenção
          </li>
          <li>
            <span className="serif text-[color:var(--gold)] text-lg">2.</span> Interpretar a tese
          </li>
          <li>
            <span className="serif text-[color:var(--gold)] text-lg">3.</span> Organizar em
            fichamento
          </li>
          <li>
            <span className="serif text-[color:var(--gold)] text-lg">4.</span> Revisar e sedimentar
          </li>
        </ol>
        <p className="text-xs text-[color:var(--ivory-dim)] mt-4 italic">
          Capturar é fácil. Guardar permanentemente exige revisão.
        </p>
      </section>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-xs text-[color:var(--ivory-dim)] pb-4">
        <Link to="/camara" className="hover:text-[color:var(--gold)]">
          Câmara de Eco
        </Link>
        <span>·</span>
        <Link to="/livros" className="hover:text-[color:var(--gold)]">
          Livros
        </Link>
      </div>
    </div>
  );
}
