// Hook que encapsula todo o estado do treino: localStorage + Supabase sync +
// templates rápidos + ações sobre o workout do dia. A página vira só layout.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchHistory,
  fetchLatestSignal,
  fetchPRs,
  persistFinishedWorkout,
  persistSignalSnapshot,
  registerExerciseMeta,
  type HistoryItem,
  type PRRecord,
} from "@/lib/treinos-sync";
import { loadState, saveState, weekFromTemplates } from "./storage";
import type { SemaphoreState, TrainingState, TrainingTemplateKey, Workout } from "./types";
import { inferSemaphore, makeBlocksDetailed, todayIso } from "./utils";

export type QuickTemplate = TrainingTemplateKey | "livre";

export function useTreinos() {
  const [state, setState] = useState<TrainingState>(() => loadState());
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [remoteHistory, setRemoteHistory] = useState<HistoryItem[]>([]);
  const [prs, setPrs] = useState<Record<string, PRRecord>>({});

  // Persistência local.
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Bootstrap remoto.
  useEffect(() => {
    registerExerciseMeta(
      state.exercises.map((e) => ({ id: e.id, name: e.name, muscle_group: e.muscle_group })),
    );
    let cancelled = false;
    (async () => {
      const [hist, sig, prMap] = await Promise.all([
        fetchHistory(12),
        fetchLatestSignal(),
        fetchPRs(),
      ]);
      if (cancelled) return;
      setRemoteHistory(hist);
      setPrs(prMap);
      if (sig) setState((s) => (s.signals ? s : { ...s, signals: sig }));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce de body signals → Supabase.
  const lastSignalRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.signals) return;
    const serialized = JSON.stringify(state.signals);
    if (serialized === lastSignalRef.current) return;
    const t = setTimeout(() => {
      lastSignalRef.current = serialized;
      void persistSignalSnapshot(state.signals!);
    }, 1200);
    return () => clearTimeout(t);
  }, [state.signals]);

  const semaphore = useMemo<SemaphoreState>(() => inferSemaphore(state.signals), [state.signals]);

  function patchToday(updater: (w: Workout) => Workout) {
    setState((s) => (s.todayWorkout ? { ...s, todayWorkout: updater(s.todayWorkout) } : s));
  }

  function createQuickWorkout(template: QuickTemplate) {
    const date = todayIso();
    if (template !== "livre") {
      const configured = state.templates[template];
      setState((s) => ({
        ...s,
        week: weekFromTemplates(s.templates),
        todayWorkout: {
          id: crypto.randomUUID(),
          date,
          name: configured.name,
          goal: configured.goal,
          estimated_min: configured.estimated_min,
          status: "planned",
          blocks: makeBlocksDetailed(
            configured.exercises.map((exercise) => ({
              exercise_id: exercise.exercise_id,
              sets: exercise.sets,
              target_reps: exercise.target_reps,
              rest_seconds: exercise.rest_seconds,
              block_type: exercise.block_type,
            })),
          ),
        },
      }));
      return;
    }

    setState((s) => ({
      ...s,
      todayWorkout: {
        id: crypto.randomUUID(),
        date,
        name: "Treino livre",
        goal: "hipertrofia",
        estimated_min: 40,
        status: "planned",
        blocks: [],
      },
    }));
  }

  function finishWorkout() {
    const current = state.todayWorkout;
    if (!current) return;
    const finished: Workout = { ...current, status: "completed" };
    setState((s) => ({
      ...s,
      todayWorkout: null,
      history: [finished, ...s.history].slice(0, 80),
    }));
    setFocusBlockId(null);
    void (async () => {
      // persistFinishedWorkout aceita o shape do Workout deste módulo.
      const res = await persistFinishedWorkout(
        finished as unknown as Parameters<typeof persistFinishedWorkout>[0],
        semaphore,
      );
      if (res.ok) {
        const [hist, prMap] = await Promise.all([fetchHistory(12), fetchPRs()]);
        setRemoteHistory(hist);
        setPrs(prMap);
      }
    })();
  }

  function discardToday() {
    setState((s) => ({ ...s, todayWorkout: null }));
    setFocusBlockId(null);
  }

  return {
    state,
    setState,
    focusBlockId,
    setFocusBlockId,
    remoteHistory,
    prs,
    semaphore,
    patchToday,
    createQuickWorkout,
    finishWorkout,
    discardToday,
  };
}
