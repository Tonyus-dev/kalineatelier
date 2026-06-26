import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Minus, Pause, Play, Plus, RotateCcw, SkipForward, X } from "lucide-react";
import type { PRRecord } from "@/lib/treinos-sync";
import type { Exercise, LoggedSet, SetStatus, Workout } from "../types";

function NumField({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/45 mb-1 truncate">
        {label}
      </p>
      <div className="flex items-center gap-0.5 bg-[#0B0A10] border border-white/10 rounded-md h-11 px-0.5">
        <button
          onClick={() => onChange(Math.max(min ?? -Infinity, value - step))}
          className="shrink-0 px-2 h-full text-[#F3EBDD]/60 hover:text-[#D9A441]"
          aria-label="diminuir"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full min-w-0 bg-transparent text-center tabular-nums text-base outline-none px-0"
        />
        <button
          onClick={() => onChange(Math.min(max ?? Infinity, value + step))}
          className="shrink-0 px-2 h-full text-[#F3EBDD]/60 hover:text-[#D9A441]"
          aria-label="aumentar"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function FocusMode({
  workout,
  blockId,
  exercises,
  prs,
  onAdvance,
  onClose,
  onLog,
  onUndoLast,
  onAddSet,
  onReplaceExercise,
}: {
  workout: Workout;
  blockId: string;
  exercises: Exercise[];
  prs: Record<string, PRRecord>;
  onAdvance: (nextId: string | null) => void;
  onClose: () => void;
  onLog: (blockId: string, log: LoggedSet) => void;
  onUndoLast: (blockId: string) => void;
  onAddSet: (blockId: string) => void;
  onReplaceExercise: (blockId: string, exerciseId: string) => void;
}) {
  const block = workout.blocks.find((b) => b.id === blockId);
  const exercise = block && exercises.find((e) => e.id === block.exercise_id);
  const nextSetIdx = block ? block.logged.length : 0;
  const plannedSet = block?.planned[nextSetIdx];
  const lastLogged = block?.logged[block.logged.length - 1];

  const [weight, setWeight] = useState(() => lastLogged?.weight ?? plannedSet?.target_weight ?? 0);
  const [reps, setReps] = useState(() => plannedSet?.target_reps ?? 10);
  const [rir, setRir] = useState(() => plannedSet?.target_rir ?? 2);
  const [rest, setRest] = useState(() => plannedSet?.rest_seconds ?? exercise?.default_rest ?? 90);

  useEffect(() => {
    setWeight(lastLogged?.weight ?? plannedSet?.target_weight ?? 0);
    setReps(plannedSet?.target_reps ?? 10);
    setRir(plannedSet?.target_rir ?? 2);
    setRest(plannedSet?.rest_seconds ?? exercise?.default_rest ?? 90);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId]);

  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerLeft === null) return;
    timerRef.current = setInterval(() => {
      setTimerLeft((t) => {
        if (t === null) return null;
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate?.(200);
            } catch {
              /* noop */
            }
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerLeft]);

  if (!block || !exercise) return null;

  function logSet(status: SetStatus) {
    if (!block || !exercise) return;
    onLog(block.id, {
      set_number: nextSetIdx + 1,
      weight,
      reps,
      rir,
      rest_seconds: rest,
      status,
      logged_at: new Date().toISOString(),
    });
    if (status === "completed") setTimerLeft(rest);
  }

  function goNext() {
    const idx = workout.blocks.findIndex((b) => b.id === blockId);
    const next = workout.blocks[idx + 1];
    onAdvance(next ? next.id : null);
  }
  function goPrev() {
    const idx = workout.blocks.findIndex((b) => b.id === blockId);
    const prev = workout.blocks[idx - 1];
    if (prev) onAdvance(prev.id);
  }

  const idx = workout.blocks.findIndex((b) => b.id === blockId);
  const done = block.logged.filter((l) => l.status === "completed").length;
  const pr = prs[exercise.name];
  const currentE1rm = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;
  const beatsPR = pr && currentE1rm > pr.e1rm;
  const isFirstPR = !pr && weight > 0 && reps > 0;

  return (
    <div className="rounded-2xl border border-[#C98A65]/30 bg-gradient-to-b from-[#16131A] to-[#0F0D14] p-3 sm:p-5 shadow-[0_0_40px_rgba(201,138,101,0.08)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] uppercase tracking-[0.28em] text-[#C98A65]">Modo Foco</span>
        <span className="text-[10px] text-[#F3EBDD]/40 tabular-nums">
          {idx + 1}/{workout.blocks.length}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            className="text-[#F3EBDD]/50 disabled:opacity-30 px-2 h-9"
            aria-label="Anterior"
          >
            ←
          </button>
          <button
            onClick={goNext}
            className="text-[#F3EBDD]/50 hover:text-[#D9A441] px-2 h-9"
            aria-label="Próximo"
          >
            →
          </button>
          <button
            onClick={onClose}
            className="text-[#F3EBDD]/40 hover:text-[#BE123C] px-2 h-9"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="min-w-0">
          <p className="serif text-xl sm:text-2xl text-[#F3EBDD] break-words">{exercise.name}</p>
          <p className="text-[11px] text-[#F3EBDD]/50">
            {exercise.muscle_group} · {exercise.equipment} · {done}/{block.planned.length} séries
          </p>
        </div>
        <select
          value={block.exercise_id}
          onChange={(e) => onReplaceExercise(block.id, e.target.value)}
          className="w-full sm:w-auto bg-[#111016] border border-white/10 rounded-lg text-xs text-[#F3EBDD]/80 h-9 px-2"
          aria-label="Substituir exercício"
        >
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        {pr ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9A441]/30 bg-[#D9A441]/5 px-2.5 py-1 text-[#D9A441] uppercase tracking-[0.18em]">
            <span className="text-[9px]">PR</span>
            <span className="tabular-nums normal-case tracking-normal">
              {pr.weight}kg × {pr.reps} · e1RM {Math.round(pr.e1rm)}kg
            </span>
          </span>
        ) : (
          <span className="text-[#F3EBDD]/40 italic">Sem PR registrado para este exercício.</span>
        )}
        {beatsPR && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#16A34A]/15 border border-[#16A34A]/40 px-2.5 py-1 text-[#16A34A] uppercase tracking-[0.18em] text-[10px] animate-pulse">
            🔥 Novo PR a caminho
          </span>
        )}
        {isFirstPR && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#C98A65]/15 border border-[#C98A65]/40 px-2.5 py-1 text-[#C98A65] uppercase tracking-[0.18em] text-[10px]">
            Primeiro registro
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <NumField label="Carga (kg)" value={weight} step={2.5} onChange={setWeight} />
        <NumField label="Reps" value={reps} step={1} onChange={setReps} />
        <NumField label="RIR" value={rir} step={1} min={0} max={5} onChange={setRir} />
      </div>

      <div className="mt-3 rounded-lg border border-white/5 bg-[#0B0A10]/60 p-2">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/45 shrink-0">
            Descanso
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={rest}
            onChange={(e) => setRest(Number(e.target.value))}
            className="w-16 bg-[#0B0A10] border border-white/10 rounded-md px-2 h-8 text-sm tabular-nums"
          />
          <span className="text-[10px] text-[#F3EBDD]/45">s</span>
          {timerLeft !== null && (
            <span
              className={
                "ml-auto tabular-nums text-base font-medium " +
                (timerLeft === 0 ? "text-[#16A34A]" : "text-[#D9A441]")
              }
            >
              {Math.floor(timerLeft / 60)
                .toString()
                .padStart(1, "0")}
              :{(timerLeft % 60).toString().padStart(2, "0")}
            </span>
          )}
        </div>
        <div className="flex gap-1 mt-2 sm:mt-0 sm:inline-flex">
          <button
            onClick={() => setTimerLeft((t) => (t === null ? rest : Math.max(0, t - 15)))}
            className="flex-1 sm:flex-none px-2 h-9 rounded-md border border-white/10 text-xs text-[#F3EBDD]/70"
          >
            -15s
          </button>
          <button
            onClick={() => setTimerLeft((t) => (t === null ? rest : t + 15))}
            className="flex-1 sm:flex-none px-2 h-9 rounded-md border border-white/10 text-xs text-[#F3EBDD]/70"
          >
            +15s
          </button>
          {timerLeft === null ? (
            <button
              onClick={() => setTimerLeft(rest)}
              className="flex-1 sm:flex-none px-3 h-9 rounded-md border border-[#C98A65]/40 text-xs text-[#C98A65] inline-flex items-center justify-center gap-1"
              aria-label="Iniciar timer"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setTimerLeft(null)}
              className="flex-1 sm:flex-none px-3 h-9 rounded-md border border-white/10 text-xs text-[#F3EBDD]/60 inline-flex items-center justify-center gap-1"
              aria-label="Pausar timer"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 mt-4">
        <Button
          onClick={() => logSet("completed")}
          className="bg-[#16A34A] text-[#08080E] hover:bg-[#22c55e] h-11"
        >
          <Check className="w-4 h-4 mr-1" /> Registrar série
        </Button>
        <button
          onClick={() => logSet("failed")}
          className="px-3 h-11 rounded-md border border-[#BE123C]/40 text-[#BE123C] text-xs"
        >
          Falha
        </button>
        <button
          onClick={() => logSet("skipped")}
          className="px-3 h-11 rounded-md border border-white/10 text-[#F3EBDD]/70"
          aria-label="Pular série"
        >
          <SkipForward className="w-4 h-4" />
        </button>
        <button
          onClick={() => onUndoLast(block.id)}
          className="px-3 h-11 rounded-md border border-white/10 text-[#F3EBDD]/70"
          aria-label="Desfazer última série"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={() => onAddSet(block.id)}
        className="mt-3 text-[11px] uppercase tracking-[0.22em] text-[#C98A65] hover:text-[#D9A441]"
      >
        + adicionar série
      </button>

      {block.logged.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs">
          {block.logged.map((l) => (
            <li
              key={l.set_number + l.logged_at}
              className="flex items-center gap-3 tabular-nums text-[#F3EBDD]/75"
            >
              <span className="w-5 text-right text-[#F3EBDD]/40">{l.set_number}</span>
              <span>{l.weight}kg</span>
              <span>×{l.reps}</span>
              <span className="text-[#F3EBDD]/40">RIR {l.rir ?? "-"}</span>
              <span
                className={
                  l.status === "completed"
                    ? "text-[#16A34A]"
                    : l.status === "failed"
                      ? "text-[#BE123C]"
                      : "text-[#F3EBDD]/40"
                }
              >
                {l.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
