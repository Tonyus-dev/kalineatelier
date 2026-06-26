import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { authedFetch } from "@/lib/authed-fetch";
import { putBlob, getBlob, deleteBlob } from "@/lib/camara-blob-store";
import {
  analisarCamara,
  semearHipoteseCamara,
  criarRetornoKairos,
  type CamaraAnalise,
} from "@/lib/camara.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LazyMarkdown } from "@/components/LazyMarkdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Square,
  RotateCw,
  Trash2,
  Type,
  FileAudio,
  ChevronLeft,
  Sparkles,
  Sprout,
  CalendarClock,
  Copy,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { kalineApple } from "@/lib/brand-assets";
import { useWakeLock } from "@/lib/use-wake-lock";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/camara")({
  component: CamaraPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

const SEGMENT_SECONDS = 180; // 3 minutos por bloco

type Sessao = {
  id: string;
  titulo: string;
  modo: "audio" | "texto";
  status: "gravando" | "finalizado";
  texto_rapido: string | null;
  analise: CamaraAnalise | null;
  analise_at: string | null;
  created_at: string;
};

type Segmento = {
  id: string;
  sessao_id: string;
  ordem: number;
  inicio_seg: number;
  fim_seg: number;
  audio_path: string | null;
  transcricao: string | null;
  status: "queued" | "processing" | "transcribed" | "failed";
  erro: string | null;
};

function fmt(seg: number) {
  const m = Math.floor(seg / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seg % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function CamaraPage() {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [aberta, setAberta] = useState<Sessao | null>(null);
  const [novoMode, setNovoMode] = useState<"audio" | "texto" | null>(null);
  const [titulo, setTitulo] = useState("");
  const [textoRapido, setTextoRapido] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("camara_sessoes")
      .select("*")
      .order("created_at", { ascending: false });
    setSessoes((data ?? []) as Sessao[]);
  }
  useEffect(() => {
    void load();
  }, []);

  async function criarAudio() {
    if (!titulo.trim()) {
      toast.error("Dê um título à câmara primeiro");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("não logado");
      const { data, error } = await supabase
        .from("camara_sessoes")
        .insert({ user_id: u.user.id, titulo: titulo.trim(), modo: "audio" })
        .select()
        .single();
      if (error) throw error;
      setAberta(data as Sessao);
      setTitulo("");
      setNovoMode(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function salvarTexto() {
    if (!titulo.trim()) {
      toast.error("Título obrigatório");
      return;
    }
    if (!textoRapido.trim()) {
      toast.error("Cole ou escreva o conteúdo");
      return;
    }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("não logado");
      const { error } = await supabase.from("camara_sessoes").insert({
        user_id: u.user.id,
        titulo: titulo.trim(),
        modo: "texto",
        status: "finalizado",
        texto_rapido: textoRapido.trim(),
      });
      if (error) throw error;
      setTitulo("");
      setTextoRapido("");
      setNovoMode(null);
      toast.success("Câmara rápida salva");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function remover(s: Sessao) {
    if (!confirm(`Remover "${s.titulo}"? Áudios e transcrições serão apagados.`)) return;
    // best-effort: lista os audio_paths dos segmentos e remove
    const { data: segs } = await supabase
      .from("camara_segmentos")
      .select("audio_path")
      .eq("sessao_id", s.id);
    const paths = (segs ?? []).map((x) => x.audio_path).filter((x): x is string => !!x);
    if (paths.length) await supabase.storage.from("camara-audio").remove(paths);
    await supabase.from("camara_sessoes").delete().eq("id", s.id);
    await load();
  }

  if (aberta) {
    return (
      <SessaoDetalhe
        sessao={aberta}
        onBack={() => {
          setAberta(null);
          void load();
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="serif text-2xl sm:text-3xl text-[color:var(--gold)] mb-1">Câmara de Eco</h1>
      <p className="text-[color:var(--ivory-dim)] text-sm mb-1">
        Escuta, segmenta e devolve sentido sem tomar posse da conversa.
      </p>
      <p className="text-[color:var(--ivory-dim)] text-xs mb-6 italic">
        Densidade processada, não chat bruto. Nada vira memória automaticamente.
      </p>

      {!novoMode ? (
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => setNovoMode("audio")}
            className="rounded-2xl border border-[color:var(--border)] bg-card p-5 text-left hover:border-[color:var(--gold)] transition"
          >
            <FileAudio className="w-6 h-6 text-[color:var(--gold)] mb-2" />
            <div className="serif text-lg text-[color:var(--ivory)]">Gravar reunião</div>
            <div className="text-xs text-[color:var(--ivory-dim)] mt-1">
              Captura em blocos de 3 min. Transcrição automática pelo mesmo caminho do chat.
            </div>
          </button>
          <button
            onClick={() => setNovoMode("texto")}
            className="rounded-2xl border border-[color:var(--border)] bg-card p-5 text-left hover:border-[color:var(--gold)] transition"
          >
            <Type className="w-6 h-6 text-[color:var(--gold)] mb-2" />
            <div className="serif text-lg text-[color:var(--ivory)]">Câmara rápida (texto)</div>
            <div className="text-xs text-[color:var(--ivory-dim)] mt-1">
              Cole notas ou escreva o que aconteceu — sem áudio.
            </div>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border)] bg-card p-4 sm:p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="serif text-lg text-[color:var(--ivory)]">
              {novoMode === "audio" ? "Nova gravação" : "Câmara rápida"}
            </h2>
            <button
              onClick={() => setNovoMode(null)}
              className="text-xs text-[color:var(--ivory-dim)] hover:text-[color:var(--gold)]"
            >
              cancelar
            </button>
          </div>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título (ex: Audiência 24/06, reunião com cliente X)"
            className="mb-3 h-11"
          />
          {novoMode === "texto" && (
            <Textarea
              value={textoRapido}
              onChange={(e) => setTextoRapido(e.target.value)}
              placeholder="Cole ou escreva o que aconteceu na reunião…"
              className="mb-3 min-h-[160px]"
            />
          )}
          <Button
            onClick={novoMode === "audio" ? criarAudio : salvarTexto}
            disabled={busy}
            className="h-11 w-full sm:w-auto"
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {novoMode === "audio" ? "Abrir câmara" : "Salvar"}
          </Button>
        </div>
      )}

      <h2 className="serif text-lg text-[color:var(--ivory)] mb-3">Câmaras anteriores</h2>
      <ul className="space-y-3">
        {sessoes.length === 0 && (
          <li className="text-sm text-[color:var(--ivory-dim)]">Nenhuma câmara ainda.</li>
        )}
        {sessoes.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-[color:var(--border)] bg-card/60 p-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
          >
            <button onClick={() => setAberta(s)} className="text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="serif text-base sm:text-lg text-[color:var(--ivory)] break-words">
                  {s.titulo}
                </span>
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-[color:var(--border)] text-[color:var(--ivory-dim)]">
                  {s.modo}
                </span>
                {s.status === "gravando" && (
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[color:var(--gold)]/15 text-[color:var(--gold)]">
                    em curso
                  </span>
                )}
              </div>
              <div className="text-xs text-[color:var(--ivory-dim)] mt-1">
                {new Date(s.created_at).toLocaleString("pt-BR")}
              </div>
            </button>
            <button
              onClick={() => remover(s)}
              className="text-[color:var(--ivory-dim)] hover:text-destructive p-1"
              aria-label="Remover"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SessaoDetalhe({ sessao: sessaoInicial, onBack }: { sessao: Sessao; onBack: () => void }) {
  const [sessao, setSessao] = useState<Sessao>(sessaoInicial);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0); // segundos do bloco atual
  const [totalBlocos, setTotalBlocos] = useState(0);
  const [finalizing, setFinalizing] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const segTimerRef = useRef<number | null>(null);
  const tickerRef = useRef<number | null>(null);
  const ordemRef = useRef(0);
  const continueRef = useRef(true); // se devemos iniciar próximo bloco após onstop
  const userIdRef = useRef<string | null>(null);
  const analisarFn = useServerFn(analisarCamara);

  // Mantém a tela ligada enquanto gravando OU enquanto há bloco transcrevendo.
  const transcrevendo = segmentos.some((s) => s.status === "processing" || s.status === "queued");
  useWakeLock(recording || transcrevendo || finalizing);

  async function load() {
    const { data } = await supabase
      .from("camara_segmentos")
      .select("*")
      .eq("sessao_id", sessao.id)
      .order("ordem", { ascending: true });
    const segs = (data ?? []) as Segmento[];
    setSegmentos(segs);
    ordemRef.current = segs.reduce((m, s) => Math.max(m, s.ordem), 0);
    setTotalBlocos(segs.length);
  }
  useEffect(() => {
    void load();
  }, [sessao.id]);

  // Re-enfileira segmentos que ficaram queued ou failed com blob local disponível
  useEffect(() => {
    if (sessao.modo !== "audio") return;
    (async () => {
      for (const s of segmentos) {
        if (s.status === "transcribed" || s.status === "processing") continue;
        const blob = await getBlob(s.id);
        if (blob) void enviarBloco(s, blob);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentos.length === 0 ? 0 : 1]);

  async function ensureUser() {
    if (userIdRef.current) return userIdRef.current;
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("não logado");
    userIdRef.current = data.user.id;
    return data.user.id;
  }

  async function enviarBloco(seg: Segmento, blob: Blob) {
    try {
      setSegmentos((prev) =>
        prev.map((x) => (x.id === seg.id ? { ...x, status: "processing" } : x)),
      );
      const userId = await ensureUser();

      // upload de arquivo para arquivo (best-effort, paralelo)
      const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      const path = `${userId}/${sessao.id}/${seg.id}.${ext}`;
      void supabase.storage
        .from("camara-audio")
        .upload(path, blob, { contentType: blob.type, upsert: true })
        .then((r) => {
          if (!r.error)
            void supabase.from("camara_segmentos").update({ audio_path: path }).eq("id", seg.id);
        });

      const form = new FormData();
      form.append("file", blob, `segmento.${ext}`);
      form.append("segmento_id", seg.id);
      const res = await authedFetch("/api/camara-transcribe-segment", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "falha");
        setSegmentos((prev) =>
          prev.map((x) => (x.id === seg.id ? { ...x, status: "failed", erro: msg } : x)),
        );
        toast.error(`Bloco ${seg.ordem}: ${msg.slice(0, 120)}`);
        return;
      }
      const { text } = (await res.json()) as { text: string };
      setSegmentos((prev) =>
        prev.map((x) => (x.id === seg.id ? { ...x, status: "transcribed", transcricao: text } : x)),
      );
      await deleteBlob(seg.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      setSegmentos((prev) =>
        prev.map((x) => (x.id === seg.id ? { ...x, status: "failed", erro: msg } : x)),
      );
    }
  }

  async function criarSegmentoEEnviar(blob: Blob, ordem: number) {
    const inicio = (ordem - 1) * SEGMENT_SECONDS;
    const fim =
      inicio +
      Math.round(
        blob.size > 0 ? Math.min(SEGMENT_SECONDS, elapsed || SEGMENT_SECONDS) : SEGMENT_SECONDS,
      );
    const userId = await ensureUser();
    const { data, error } = await supabase
      .from("camara_segmentos")
      .insert({
        user_id: userId,
        sessao_id: sessao.id,
        ordem,
        inicio_seg: inicio,
        fim_seg: fim,
        status: "queued",
      })
      .select()
      .single();
    if (error || !data) {
      toast.error("Falha ao criar segmento");
      return;
    }
    const seg = data as Segmento;
    await putBlob(seg.id, blob);
    setSegmentos((prev) => [...prev, seg]);
    void enviarBloco(seg, blob);
  }

  function startRecorder() {
    if (!streamRef.current) return;
    const mimeType =
      ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
    const rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType });
      const ordem = ordemRef.current + 1;
      ordemRef.current = ordem;
      setTotalBlocos((n) => n + 1);
      if (blob.size > 1024) void criarSegmentoEEnviar(blob, ordem);
      if (continueRef.current) {
        setElapsed(0);
        startRecorder();
      } else {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    rec.start();
    recRef.current = rec;
    // dispara stop ao completar 3 min
    segTimerRef.current = window.setTimeout(() => {
      if (recRef.current && recRef.current.state === "recording") recRef.current.stop();
    }, SEGMENT_SECONDS * 1000);
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      continueRef.current = true;
      setRecording(true);
      setElapsed(0);
      tickerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
      startRecorder();
    } catch {
      toast.error("Microfone indisponível");
    }
  }

  async function stop() {
    continueRef.current = false;
    setRecording(false);
    setFinalizing(true);
    if (segTimerRef.current) {
      window.clearTimeout(segTimerRef.current);
      segTimerRef.current = null;
    }
    if (tickerRef.current) {
      window.clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    if (recRef.current && recRef.current.state === "recording") recRef.current.stop();
    // finaliza sessão
    await supabase.from("camara_sessoes").update({ status: "finalizado" }).eq("id", sessao.id);
    setFinalizing(false);
    toast.success("Câmara finalizada. Transcrições continuam em segundo plano.");
  }

  useEffect(
    () => () => {
      if (segTimerRef.current) window.clearTimeout(segTimerRef.current);
      if (tickerRef.current) window.clearInterval(tickerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function retryBloco(s: Segmento) {
    const blob = await getBlob(s.id);
    if (!blob) {
      toast.error("Áudio local indisponível para retry");
      return;
    }
    void enviarBloco(s, blob);
  }

  async function runAnalise() {
    setAnalisando(true);
    try {
      const analise = await analisarFn({ data: { sessao_id: sessao.id } });
      setSessao((s) => ({ ...s, analise, analise_at: new Date().toISOString() }));
      toast.success("Análise pronta. Nenhuma memória foi criada automaticamente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na análise");
    } finally {
      setAnalisando(false);
    }
  }

  const podeAnalisar =
    (sessao.modo === "texto" && !!sessao.texto_rapido) ||
    (sessao.modo === "audio" && segmentos.some((s) => s.transcricao));

  const transcricaoCompleta = segmentos
    .filter((s) => s.transcricao)
    .map(
      (s) =>
        `[Bloco ${String(s.ordem).padStart(2, "0")} | ${fmt(s.inicio_seg)}–${fmt(s.fim_seg)}]\n${s.transcricao}`,
    )
    .join("\n\n");

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-[color:var(--ivory-dim)] hover:text-[color:var(--gold)] mb-3"
      >
        <ChevronLeft className="w-4 h-4" /> voltar
      </button>
      <h1 className="serif text-2xl sm:text-3xl text-[color:var(--gold)] break-words">
        {sessao.titulo}
      </h1>
      <p className="text-xs text-[color:var(--ivory-dim)] mb-6">
        {new Date(sessao.created_at).toLocaleString("pt-BR")} · modo {sessao.modo}
      </p>

      {sessao.modo === "texto" && sessao.texto_rapido && (
        <div className="rounded-xl border border-[color:var(--border)] bg-card/60 p-4 whitespace-pre-wrap text-sm text-[color:var(--ivory)] break-words">
          {sessao.texto_rapido}
        </div>
      )}

      {sessao.modo === "audio" && (
        <>
          <div className="rounded-2xl border border-[color:var(--border)] bg-card p-5 mb-6 flex flex-col items-center">
            <button
              onClick={recording ? stop : start}
              disabled={finalizing || sessao.status === "finalizado"}
              aria-label={recording ? "Parar gravação" : "Iniciar gravação"}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center transition ${
                recording ? "ring-4 ring-[color:var(--gold)] animate-pulse" : "hover:scale-105"
              } disabled:opacity-50`}
            >
              {recording ? (
                <Square className="w-12 h-12 text-[color:var(--gold)]" />
              ) : (
                <img
                  src={kalineApple.url}
                  alt="Maçã Kaline"
                  className="w-28 h-28 object-contain apple-glow"
                />
              )}
            </button>
            <div className="mt-4 text-center">
              {sessao.status === "finalizado" ? (
                <div className="text-sm text-[color:var(--ivory-dim)]">Câmara finalizada</div>
              ) : recording ? (
                <>
                  <div className="serif text-xl text-[color:var(--ivory)]">
                    Bloco {totalBlocos + 1} · {fmt(elapsed)} / {fmt(SEGMENT_SECONDS)}
                  </div>
                  <div className="text-xs text-[color:var(--ivory-dim)] mt-1">
                    Cada bloco fecha sozinho aos 03:00 e entra na fila de transcrição.
                  </div>
                </>
              ) : (
                <div className="text-sm text-[color:var(--ivory-dim)]">
                  Toque na maçã para começar a gravar
                </div>
              )}
            </div>
          </div>

          <h2 className="serif text-lg text-[color:var(--ivory)] mb-3">Blocos</h2>
          {segmentos.length === 0 && (
            <p className="text-sm text-[color:var(--ivory-dim)] italic">
              Nenhum bloco ainda. A câmara começa a registrar assim que você inicia.
            </p>
          )}
          <ul className="space-y-3 mb-6">
            {segmentos.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-[color:var(--border)] bg-card/60 p-3 sm:p-4"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-sm text-[color:var(--ivory)] font-medium">
                    Bloco {String(s.ordem).padStart(2, "0")} · {fmt(s.inicio_seg)}–{fmt(s.fim_seg)}
                  </div>
                  <StatusPill s={s.status} />
                </div>
                {s.transcricao && (
                  <p className="mt-2 text-sm text-[color:var(--ivory-dim)] whitespace-pre-wrap break-words">
                    {s.transcricao}
                  </p>
                )}
                {s.status === "failed" && (
                  <div className="mt-2 flex items-center gap-3">
                    {s.erro && (
                      <span className="text-xs text-destructive break-words">{s.erro}</span>
                    )}
                    <Button size="sm" variant="outline" onClick={() => retryBloco(s)}>
                      <RotateCw className="w-3 h-3 mr-1" /> tentar de novo
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {transcricaoCompleta && (
            <details className="rounded-xl border border-[color:var(--border)] bg-card/60 p-4">
              <summary className="cursor-pointer text-sm text-[color:var(--gold)]">
                Transcrição agregada
              </summary>
              <pre className="mt-3 text-xs text-[color:var(--ivory-dim)] whitespace-pre-wrap break-words font-mono">
                {transcricaoCompleta}
              </pre>
            </details>
          )}
        </>
      )}

      {/* Análise (Fase 2) + Ações revisáveis (Fase 3) — comum aos dois modos */}
      <AnaliseSection
        sessao={sessao}
        podeAnalisar={podeAnalisar}
        analisando={analisando}
        onAnalisar={runAnalise}
      />

      <p className="text-xs text-[color:var(--ivory-dim)] italic mt-6">
        Transcrição ≠ memória · análise ≠ verdade confirmada · nada vai para o Jardim sem você
        decidir.
      </p>
    </div>
  );
}

function StatusPill({ s }: { s: Segmento["status"] }) {
  const map: Record<Segmento["status"], { label: string; cls: string }> = {
    queued: { label: "fila", cls: "bg-muted text-[color:var(--ivory-dim)]" },
    processing: {
      label: "transcrevendo…",
      cls: "bg-[color:var(--gold)]/15 text-[color:var(--gold)]",
    },
    transcribed: { label: "ok", cls: "bg-emerald-500/15 text-emerald-400" },
    failed: { label: "falhou", cls: "bg-destructive/20 text-destructive" },
  };
  const { label, cls } = map[s];
  return (
    <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

// Link import is kept for potential future use
void Link;

// ──────────────────────────────────────────────────────────────────
// Análise (Fase 2) e ações revisáveis (Fase 3)
// ──────────────────────────────────────────────────────────────────

type Origem = "decisao" | "proximo_gesto" | "sinal" | "candidato_revisao" | "tema";

function AnaliseSection({
  sessao,
  podeAnalisar,
  analisando,
  onAnalisar,
}: {
  sessao: Sessao;
  podeAnalisar: boolean;
  analisando: boolean;
  onAnalisar: () => void;
}) {
  const [acao, setAcao] = useState<
    { tipo: "semear"; texto: string; origem: Origem } | { tipo: "kairos"; texto: string } | null
  >(null);

  const a = sessao.analise;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="serif text-lg text-[color:var(--ivory)]">Análise</h2>
        {podeAnalisar && (
          <Button size="sm" variant="outline" onClick={onAnalisar} disabled={analisando}>
            {analisando ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 mr-1" />
            )}
            {a ? "Reanalisar" : "Analisar"}
          </Button>
        )}
      </div>

      {!a && !podeAnalisar && (
        <p className="text-sm text-[color:var(--ivory-dim)] italic">
          A análise estará disponível quando houver pelo menos um bloco transcrito.
        </p>
      )}
      {!a && podeAnalisar && !analisando && (
        <p className="text-sm text-[color:var(--ivory-dim)] italic">
          Toque em "Analisar" para destilar resumo, temas, decisões, sinais e próximos gestos.
        </p>
      )}

      {a && (
        <div className="rounded-2xl border border-[color:var(--border)] bg-card/60 p-4 sm:p-5 space-y-5">
          {sessao.analise_at && (
            <div className="text-[10px] uppercase tracking-wide text-[color:var(--ivory-dim)]">
              analisada {new Date(sessao.analise_at).toLocaleString("pt-BR")}
            </div>
          )}

          <Bloco titulo="Resumo operacional">
            <p className="text-sm text-[color:var(--ivory)] whitespace-pre-wrap break-words">
              {a.resumo_operacional}
            </p>
          </Bloco>

          {a.interlocutores.length > 0 && (
            <Bloco titulo="Interlocutores prováveis">
              <ul className="space-y-1 text-sm">
                {a.interlocutores.map((i, idx) => (
                  <li key={idx} className="text-[color:var(--ivory)]">
                    <span className="break-words">{i.nome}</span>{" "}
                    <span className="text-[10px] uppercase tracking-wide text-[color:var(--ivory-dim)]">
                      · {i.confianca}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-[color:var(--ivory-dim)] italic">
                Interlocutor provável ≠ vínculo confirmado.
              </p>
            </Bloco>
          )}

          <ListaAcionavel
            titulo="Temas"
            itens={a.temas}
            origem="tema"
            onSemear={(t) => setAcao({ tipo: "semear", texto: t, origem: "tema" })}
            onKairos={(t) => setAcao({ tipo: "kairos", texto: t })}
          />
          <ListaAcionavel
            titulo="Decisões detectadas"
            itens={a.decisoes}
            origem="decisao"
            nota="Decisão detectada ≠ compromisso sedimentado."
            onSemear={(t) => setAcao({ tipo: "semear", texto: t, origem: "decisao" })}
            onKairos={(t) => setAcao({ tipo: "kairos", texto: t })}
          />
          <ListaAcionavel
            titulo="Sinais relevantes"
            itens={a.sinais}
            origem="sinal"
            onSemear={(t) => setAcao({ tipo: "semear", texto: t, origem: "sinal" })}
            onKairos={(t) => setAcao({ tipo: "kairos", texto: t })}
          />
          <ListaAcionavel
            titulo="Próximos gestos"
            itens={a.proximos_gestos}
            origem="proximo_gesto"
            onSemear={(t) => setAcao({ tipo: "semear", texto: t, origem: "proximo_gesto" })}
            onKairos={(t) => setAcao({ tipo: "kairos", texto: t })}
          />
          <ListaAcionavel
            titulo="Candidatos para Revisão"
            itens={a.candidatos_revisao}
            origem="candidato_revisao"
            nota="Trechos densos que merecem virar hipótese — nunca memória direta."
            onSemear={(t) => setAcao({ tipo: "semear", texto: t, origem: "candidato_revisao" })}
            onKairos={(t) => setAcao({ tipo: "kairos", texto: t })}
          />

          {a.ata_markdown && <AtaEstruturada ata={a.ata_markdown} titulo={sessao.titulo} />}
          {a.infografico_svg && <Infografico svg={a.infografico_svg} titulo={sessao.titulo} />}
        </div>
      )}

      {acao?.tipo === "semear" && (
        <SemearDialog
          sessao={sessao}
          textoInicial={acao.texto}
          origem={acao.origem}
          onClose={() => setAcao(null)}
        />
      )}
      {acao?.tipo === "kairos" && (
        <KairosDialog sessao={sessao} textoInicial={acao.texto} onClose={() => setAcao(null)} />
      )}
    </section>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--gold)] mb-2">
        {titulo}
      </h3>
      {children}
    </div>
  );
}

function slug(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "camara"
  );
}

function baixar(conteudo: BlobPart, mime: string, nome: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function AtaEstruturada({ ata, titulo }: { ata: string; titulo: string }) {
  return (
    <Bloco titulo="Ata estruturada">
      <div className="flex flex-wrap gap-2 mb-3">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(ata).catch(() => {});
            toast.success("Ata copiada.");
          }}
        >
          <Copy className="w-3 h-3 mr-1" /> Copiar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => baixar(ata, "text/markdown;charset=utf-8", `ata-${slug(titulo)}.md`)}
        >
          <Download className="w-3 h-3 mr-1" /> Baixar .md
        </Button>
      </div>
      <div className="prose prose-sm prose-invert max-w-none text-sm text-[color:var(--ivory)] break-words [&_table]:block [&_table]:overflow-x-auto">
        <LazyMarkdown>{ata}</LazyMarkdown>
      </div>
    </Bloco>
  );
}

function Infografico({ svg, titulo }: { svg: string; titulo: string }) {
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  async function baixarPng() {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("falha ao carregar SVG"));
        img.src = dataUrl;
      });
      const w = img.naturalWidth || 1200;
      const h = img.naturalHeight || 1600;
      // Exporta em alta resolução (>=2x): SVG é vetorial, então rasterizar num
      // canvas ampliado evita o PNG pixelado/borrado de 1x.
      const scale = Math.max(2, window.devicePixelRatio || 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas indisponível");
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) baixar(blob, "image/png", `infografico-${slug(titulo)}.png`);
        else toast.error("Não foi possível gerar o PNG.");
      }, "image/png");
    } catch {
      toast.error("Não foi possível gerar o PNG.");
    }
  }

  return (
    <Bloco titulo="Infográfico">
      <div className="flex flex-wrap gap-2 mb-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            baixar(svg, "image/svg+xml;charset=utf-8", `infografico-${slug(titulo)}.svg`)
          }
        >
          <Download className="w-3 h-3 mr-1" /> Baixar .svg
        </Button>
        <Button size="sm" variant="outline" onClick={baixarPng}>
          <ImageIcon className="w-3 h-3 mr-1" /> Baixar .png
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(svg).catch(() => {});
            toast.success("SVG copiado.");
          }}
        >
          <Copy className="w-3 h-3 mr-1" /> Copiar SVG
        </Button>
      </div>
      {/* Renderizado via <img> (não dangerouslySetInnerHTML): imagens não
          executam scripts embutidos no SVG — defesa contra XSS. */}
      <img
        src={dataUrl}
        alt={`Infográfico da reunião: ${titulo}`}
        className="w-full max-w-md mx-auto rounded-lg border border-[color:var(--border)]"
      />
    </Bloco>
  );
}

function ListaAcionavel({
  titulo,
  itens,
  nota,
  onSemear,
  onKairos,
}: {
  titulo: string;
  itens: string[];
  origem: Origem;
  nota?: string;
  onSemear: (texto: string) => void;
  onKairos: (texto: string) => void;
}) {
  if (itens.length === 0) return null;
  return (
    <Bloco titulo={titulo}>
      <ul className="space-y-2">
        {itens.map((t, idx) => (
          <li
            key={idx}
            className="rounded-lg border border-[color:var(--border)] bg-background/40 p-3"
          >
            <p className="text-sm text-[color:var(--ivory)] whitespace-pre-wrap break-words">{t}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onSemear(t)}>
                <Sprout className="w-3 h-3 mr-1" /> semear hipótese
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onKairos(t)}>
                <CalendarClock className="w-3 h-3 mr-1" /> retorno Kairós
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {nota && <p className="mt-2 text-[11px] text-[color:var(--ivory-dim)] italic">{nota}</p>}
    </Bloco>
  );
}

function SemearDialog({
  sessao,
  textoInicial,
  origem,
  onClose,
}: {
  sessao: Sessao;
  textoInicial: string;
  origem: Origem;
  onClose: () => void;
}) {
  const semear = useServerFn(semearHipoteseCamara);
  const [title, setTitle] = useState(textoInicial.slice(0, 100));
  const [body, setBody] = useState(textoInicial);
  const [busy, setBusy] = useState(false);

  async function confirmar() {
    setBusy(true);
    try {
      await semear({
        data: { sessao_id: sessao.id, title: title.trim(), body: body.trim(), origem },
      });
      toast.success("Hipótese semeada na Revisão de hoje.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="serif">Semear hipótese de memória curta</DialogTitle>
          <DialogDescription className="text-xs">
            Vai entrar na Revisão de hoje como{" "}
            <span className="text-[color:var(--gold)]">hipótese</span> — não como verdade.
            Importância baixa, tags <code>hipotese · curto_prazo</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-[color:var(--ivory-dim)]">
              Título
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-[color:var(--ivory-dim)]">
              Corpo
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[120px]"
              maxLength={8000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            cancelar
          </Button>
          <Button onClick={confirmar} disabled={busy || !title.trim() || !body.trim()}>
            {busy && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            <Sprout className="w-3 h-3 mr-1" /> semear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KairosDialog({
  sessao,
  textoInicial,
  onClose,
}: {
  sessao: Sessao;
  textoInicial: string;
  onClose: () => void;
}) {
  const criar = useServerFn(criarRetornoKairos);
  const [titulo, setTitulo] = useState(textoInicial.slice(0, 100));
  const [descricao, setDescricao] = useState(textoInicial);
  const defaultLocal = new Date(Date.now() + 24 * 3600 * 1000);
  defaultLocal.setSeconds(0, 0);
  const [quando, setQuando] = useState(toLocalInput(defaultLocal));
  const [tipo, setTipo] = useState<"compromisso" | "prazo" | "reuniao">("compromisso");
  const [busy, setBusy] = useState(false);

  async function confirmar() {
    setBusy(true);
    try {
      const inicio = new Date(quando).toISOString();
      await criar({
        data: {
          sessao_id: sessao.id,
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          inicio,
          tipo,
        },
      });
      toast.success("Retorno Kairós criado na agenda.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  function ajustar(deltaMs: number) {
    const d = new Date(Date.now() + deltaMs);
    d.setSeconds(0, 0);
    setQuando(toLocalInput(d));
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="serif">Criar retorno Kairós</DialogTitle>
          <DialogDescription className="text-xs">
            Algo para "trazer para hoje" ou "adormecer para depois" — vai para a Agenda.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-[color:var(--ivory-dim)]">
              Título
            </label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={160} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-[color:var(--ivory-dim)]">
              Descrição
            </label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="min-h-[80px]"
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[color:var(--ivory-dim)]">
                Quando
              </label>
              <Input
                type="datetime-local"
                value={quando}
                onChange={(e) => setQuando(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[color:var(--ivory-dim)]">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as typeof tipo)}
                className="h-10 w-full rounded-md border border-[color:var(--border)] bg-background px-2 text-sm"
              >
                <option value="compromisso">compromisso</option>
                <option value="prazo">prazo</option>
                <option value="reuniao">reunião</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => ajustar(2 * 3600 * 1000)}
            >
              + 2h
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => ajustar(24 * 3600 * 1000)}
            >
              amanhã
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => ajustar(7 * 24 * 3600 * 1000)}
            >
              + 7d
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => ajustar(30 * 24 * 3600 * 1000)}
            >
              + 30d
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            cancelar
          </Button>
          <Button onClick={confirmar} disabled={busy || !titulo.trim() || !quando}>
            {busy && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            <CalendarClock className="w-3 h-3 mr-1" /> agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
