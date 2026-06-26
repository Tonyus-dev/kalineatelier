import { supabase } from "@/integrations/supabase/client";

// Shapes mirror the UI types in routes/_authenticated/treinos.tsx
export type SyncSemaphore = "neutral" | "green" | "yellow" | "red" | "blue";

export type SyncLoggedSet = {
  set_number: number;
  weight: number;
  reps: number;
  rir?: number;
  rest_seconds: number;
  status: "pending" | "completed" | "skipped" | "failed";
  logged_at: string;
};

export type SyncBlock = {
  id: string;
  exercise_id: string;
  planned: { set_number: number }[];
  logged: SyncLoggedSet[];
};

export type SyncWorkout = {
  id: string;
  date: string;
  name: string;
  goal: string;
  estimated_min: number;
  status: string;
  blocks: SyncBlock[];
};

export type SyncSignals = {
  date: string;
  energy: "baixa" | "media" | "alta";
  sleep: "ruim" | "ok" | "bom";
  pain: "nenhuma" | "leve" | "relevante";
  available: 20 | 40 | 60;
  notes?: string;
};

// Map UI exercise id (slug) → cache for muscle_group used when rendering
const EXERCISE_NAME_FALLBACK: Record<string, { name: string; muscle: string }> = {};

export function registerExerciseMeta(map: { id: string; name: string; muscle_group: string }[]) {
  for (const e of map) EXERCISE_NAME_FALLBACK[e.id] = { name: e.name, muscle: e.muscle_group };
}

// ─────────────────────────────────────────────────────────────
// Persist completed workout
// ─────────────────────────────────────────────────────────────
export async function persistFinishedWorkout(
  workout: SyncWorkout,
  semaphore: SyncSemaphore,
): Promise<{ ok: boolean; error?: string }> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) return { ok: false, error: "no-user" };
  const user_id = userRes.user.id;

  const startedAt =
    workout.blocks.flatMap((b) => b.logged.map((l) => l.logged_at)).sort()[0] ??
    new Date().toISOString();
  const endedAt = new Date().toISOString();
  const duracao = Math.max(
    0,
    Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000),
  );

  const { data: sessao, error: sessaoErr } = await supabase
    .from("treino_sessoes")
    .insert({
      user_id,
      iniciada_em: startedAt,
      encerrada_em: endedAt,
      duracao_segundos: duracao,
      semaforo: semaphore,
      status: "concluida",
      notas: workout.name,
    })
    .select("id")
    .single();
  if (sessaoErr || !sessao) return { ok: false, error: sessaoErr?.message ?? "no-session" };

  // exercises
  for (let i = 0; i < workout.blocks.length; i++) {
    const b = workout.blocks[i];
    const meta = EXERCISE_NAME_FALLBACK[b.exercise_id] ?? {
      name: b.exercise_id,
      muscle: "",
    };
    const { data: sx, error: sxErr } = await supabase
      .from("treino_sessao_exercicios")
      .insert({
        user_id,
        sessao_id: sessao.id,
        nome: meta.name,
        grupo_muscular: meta.muscle || null,
        ordem: i,
      })
      .select("id")
      .single();
    if (sxErr || !sx) continue;

    const series = b.logged.map((l) => ({
      user_id,
      sessao_exercicio_id: sx.id,
      ordem: l.set_number,
      peso: l.weight,
      reps: l.reps,
      rir: l.rir ?? null,
      descanso_segundos: l.rest_seconds,
      concluida: l.status === "completed",
      registrada_em: l.logged_at,
    }));
    if (series.length > 0) {
      await supabase.from("treino_series").insert(series);
    }
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// History
// ─────────────────────────────────────────────────────────────
export type HistoryItem = {
  id: string;
  date: string;
  name: string;
  totalSets: number;
  totalVolume: number;
  exerciseNames: string[];
};

export async function fetchHistory(limit = 12): Promise<HistoryItem[]> {
  const { data: sessions, error } = await supabase
    .from("treino_sessoes")
    .select(
      "id, iniciada_em, notas, treino_sessao_exercicios(id, nome, treino_series(peso, reps, concluida))",
    )
    .eq("status", "concluida")
    .order("iniciada_em", { ascending: false })
    .limit(limit);
  if (error || !sessions) return [];

  return sessions.map((s: any) => {
    const exs = s.treino_sessao_exercicios ?? [];
    const allSeries = exs.flatMap((e: any) => e.treino_series ?? []);
    const totalSets = allSeries.filter((x: any) => x.concluida).length;
    const totalVolume = allSeries.reduce(
      (acc: number, x: any) => acc + (x.concluida ? Number(x.peso ?? 0) * Number(x.reps ?? 0) : 0),
      0,
    );
    return {
      id: s.id,
      date: String(s.iniciada_em).slice(0, 10),
      name: s.notas ?? "Treino",
      totalSets,
      totalVolume,
      exerciseNames: exs.map((e: any) => e.nome as string),
    };
  });
}

// ─────────────────────────────────────────────────────────────
// Personal Records (PR) por exercício
// ─────────────────────────────────────────────────────────────
export type PRRecord = {
  exercise_name: string;
  weight: number;
  reps: number;
  e1rm: number; // estimativa Epley: peso * (1 + reps/30)
  date: string; // YYYY-MM-DD
};

export async function fetchPRs(): Promise<Record<string, PRRecord>> {
  // Junta séries concluídas com o nome do exercício e a data da sessão
  const { data, error } = await supabase
    .from("treino_sessao_exercicios")
    .select(
      "nome, treino_series(peso, reps, concluida, registrada_em), treino_sessoes(iniciada_em)",
    );
  if (error || !data) return {};

  const prs: Record<string, PRRecord> = {};
  for (const ex of data as any[]) {
    const nome = String(ex.nome ?? "").trim();
    if (!nome) continue;
    const series = (ex.treino_series ?? []) as any[];
    const sessaoStart = ex.treino_sessoes?.iniciada_em ?? null;
    for (const s of series) {
      if (!s.concluida) continue;
      const weight = Number(s.peso ?? 0);
      const reps = Number(s.reps ?? 0);
      if (weight <= 0 || reps <= 0) continue;
      const e1rm = weight * (1 + reps / 30);
      const when = String(s.registrada_em ?? sessaoStart ?? "").slice(0, 10);
      const prev = prs[nome];
      // PR principal = maior e1rm (combina carga e reps de forma justa)
      if (!prev || e1rm > prev.e1rm) {
        prs[nome] = { exercise_name: nome, weight, reps, e1rm, date: when };
      }
    }
  }
  return prs;
}

// ─────────────────────────────────────────────────────────────
// Body signals
// ─────────────────────────────────────────────────────────────
export async function persistSignalSnapshot(s: SyncSignals): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return;
  const intensidade = s.energy === "alta" ? 8 : s.energy === "media" ? 5 : 2;
  await supabase.from("corpo_sinais").insert({
    user_id: userRes.user.id,
    tipo: "energia",
    intensidade,
    nota: JSON.stringify({
      energy: s.energy,
      sleep: s.sleep,
      pain: s.pain,
      available: s.available,
      notes: s.notes ?? null,
    }),
  });
}

export async function fetchLatestSignal(): Promise<SyncSignals | null> {
  const { data, error } = await supabase
    .from("corpo_sinais")
    .select("nota, registrado_em")
    .eq("tipo", "energia")
    .order("registrado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.nota) return null;
  try {
    const parsed = JSON.parse(data.nota as string);
    return {
      date: String(data.registrado_em).slice(0, 10),
      energy: parsed.energy ?? "media",
      sleep: parsed.sleep ?? "ok",
      pain: parsed.pain ?? "nenhuma",
      available: (parsed.available ?? 40) as 20 | 40 | 60,
      notes: parsed.notes ?? undefined,
    };
  } catch {
    return null;
  }
}
