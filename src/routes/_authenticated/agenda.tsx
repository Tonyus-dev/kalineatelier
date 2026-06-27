import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { createLocalEvento, deleteLocalEvento, listLocalEventos } from "@/lib/local/local-api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/agenda")({
  component: AgendaPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

type TipoEvento = "compromisso" | "aula" | "reuniao" | "evento" | "prazo" | "outro";

type Evento = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: TipoEvento;
  inicio: string;
  fim: string | null;
  local: string | null;
};

const TIPOS: { value: TipoEvento; label: string; dot: string; chip: string }[] = [
  {
    value: "compromisso",
    label: "Compromisso",
    dot: "bg-sky-400",
    chip: "border-sky-400/40 text-sky-200",
  },
  {
    value: "aula",
    label: "Aula",
    dot: "bg-emerald-400",
    chip: "border-emerald-400/40 text-emerald-200",
  },
  {
    value: "reuniao",
    label: "Reunião",
    dot: "bg-violet-400",
    chip: "border-violet-400/40 text-violet-200",
  },
  {
    value: "evento",
    label: "Evento",
    dot: "bg-amber-400",
    chip: "border-amber-400/40 text-amber-200",
  },
  { value: "prazo", label: "Prazo", dot: "bg-rose-400", chip: "border-rose-400/40 text-rose-200" },
  { value: "outro", label: "Outro", dot: "bg-zinc-400", chip: "border-zinc-400/40 text-zinc-200" },
];
const tipoMeta = (t: TipoEvento) => TIPOS.find((x) => x.value === t)!;

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmtDateInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function AgendaPage() {
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // form
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoEvento>("compromisso");
  const [data, setData] = useState(fmtDateInput(new Date()));
  const [hora, setHora] = useState("09:00");
  const [horaFim, setHoraFim] = useState("");
  const [local, setLocal] = useState("");
  const [descricao, setDescricao] = useState("");

  async function load() {
    const ini = startOfMonth(cursor);
    const fim = addMonths(ini, 1);
    try {
      const { eventos: rows } = await listLocalEventos({
        from: ini.toISOString(),
        to: fim.toISOString(),
      });
      setEventos(rows as Evento[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao carregar agenda");
    }
  }
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [cursor]);

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const startOffset = first.getDay(); // 0=Dom
    const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= total; d++)
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [cursor]);

  const eventosPorDia = useMemo(() => {
    const map = new Map<string, Evento[]>();
    for (const e of eventos) {
      const d = new Date(e.inicio);
      const k = fmtDateInput(d);
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    return map;
  }, [eventos]);

  const eventosDoDia = eventosPorDia.get(fmtDateInput(selected)) ?? [];

  function openNovo(d?: Date) {
    const base = d ?? selected;
    setData(fmtDateInput(base));
    setHora("09:00");
    setHoraFim("");
    setTitulo("");
    setTipo("compromisso");
    setLocal("");
    setDescricao("");
    setOpen(true);
  }

  async function salvar() {
    if (!titulo.trim()) {
      toast.error("Dê um título");
      return;
    }
    setBusy(true);
    try {
      const inicio = new Date(`${data}T${hora}:00`);
      const fim = horaFim ? new Date(`${data}T${horaFim}:00`) : null;
      await createLocalEvento({
        titulo,
        tipo,
        inicio: inicio.toISOString(),
        fim: fim ? fim.toISOString() : null,
        local: local || null,
        descricao: descricao || null,
      });
      setOpen(false);
      setSelected(inicio);
      if (
        inicio.getMonth() !== cursor.getMonth() ||
        inicio.getFullYear() !== cursor.getFullYear()
      ) {
        setCursor(startOfMonth(inicio));
      } else {
        load();
      }
      toast.success("Evento criado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function remover(id: string) {
    try {
      await deleteLocalEvento(id);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover evento");
    }
  }

  const mesLabel = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="flex items-end justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="serif text-2xl sm:text-3xl text-[color:var(--gold)]">Agenda</h1>
          <p className="text-[color:var(--ivory-dim)] text-sm">
            Compromissos, aulas, reuniões, eventos e prazos.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openNovo()} className="h-11">
              <Plus className="w-4 h-4 mr-1" /> Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="serif text-[color:var(--gold)]">Novo evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Título"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="h-11"
              />
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoEvento)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${t.dot}`} />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="h-11 col-span-3 sm:col-span-1"
                />
                <Input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  className="h-11"
                />
                <Input
                  type="time"
                  value={horaFim}
                  onChange={(e) => setHoraFim(e.target.value)}
                  placeholder="fim"
                  className="h-11"
                />
              </div>
              <Input
                placeholder="Local (opcional)"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                className="h-11"
              />
              <Textarea
                placeholder="Descrição (opcional)"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={busy} className="w-full sm:w-auto">
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-2xl border border-[color:var(--border)] bg-card p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor(addMonths(cursor, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="serif text-[color:var(--ivory)] text-base sm:text-lg capitalize">
            {mesLabel}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCursor(addMonths(cursor, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] sm:text-xs text-[color:var(--ivory-dim)] uppercase tracking-wider mb-1">
          {diasSemana.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (!d) return <div key={i} className="aspect-square" />;
            const k = fmtDateInput(d);
            const evs = eventosPorDia.get(k) ?? [];
            const isSel = sameDay(d, selected);
            const isToday = sameDay(d, new Date());
            return (
              <button
                key={i}
                onClick={() => setSelected(d)}
                className={[
                  "aspect-square rounded-lg p-1 sm:p-1.5 flex flex-col items-stretch text-left transition border",
                  isSel
                    ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10"
                    : "border-transparent hover:border-[color:var(--border)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "text-[11px] sm:text-xs leading-none",
                    isToday
                      ? "text-[color:var(--gold)] font-semibold"
                      : "text-[color:var(--ivory)]",
                  ].join(" ")}
                >
                  {d.getDate()}
                </span>
                <div className="mt-auto flex flex-wrap gap-0.5 justify-start">
                  {evs.slice(0, 4).map((e) => (
                    <span
                      key={e.id}
                      className={`w-1.5 h-1.5 rounded-full ${tipoMeta(e.tipo).dot}`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="serif text-lg text-[color:var(--ivory)]">
            {selected.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </h2>
          <Button size="sm" variant="outline" onClick={() => openNovo(selected)}>
            <Plus className="w-3 h-3 mr-1" /> Adicionar
          </Button>
        </div>

        {eventosDoDia.length === 0 ? (
          <p className="text-sm italic text-[color:var(--ivory-dim)]">
            Dia em branco. Espaço pra respirar.
          </p>
        ) : (
          <ul className="space-y-2">
            {eventosDoDia.map((e) => {
              const meta = tipoMeta(e.tipo);
              const ini = new Date(e.inicio);
              const fim = e.fim ? new Date(e.fim) : null;
              const hora = ini.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
              const horaFim = fim
                ? fim.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                : null;
              return (
                <li
                  key={e.id}
                  className="rounded-xl border border-[color:var(--border)] bg-card/60 p-3 sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${meta.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[color:var(--ivory)] font-medium break-words">
                          {e.titulo}
                        </h3>
                        <span
                          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.chip}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-[color:var(--ivory-dim)] mt-0.5">
                        {hora}
                        {horaFim ? ` – ${horaFim}` : ""}
                        {e.local ? ` · ${e.local}` : ""}
                      </p>
                      {e.descricao && (
                        <p className="text-sm text-[color:var(--ivory-dim)] mt-1.5 whitespace-pre-wrap break-words">
                          {e.descricao}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => remover(e.id)}
                      className="text-[color:var(--ivory-dim)] hover:text-destructive p-1"
                      aria-label="Remover"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
