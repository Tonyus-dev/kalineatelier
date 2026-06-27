// Hook do Semáforo de Presença.
// - Estado (verde/amarelo/azul/vermelho) persiste no backend local (linha única).
// - Nota efêmera fica só no dispositivo via localStorage (não vai pro banco).
// - Nota é enviada ao chat junto com a mensagem (campo `presencaNota` no envelope).

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLocalPresenca,
  setLocalPresenca,
  type LocalPresencaState,
} from "@/lib/local/local-api-client";

export type PresencaState = LocalPresencaState;

export const PRESENCA_META: Record<
  PresencaState,
  { label: string; short: string; dot: string; ring: string; chip: string }
> = {
  green: {
    label: "Verde · fluxo aberto",
    short: "Verde",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/40",
    chip: "border-emerald-500/60 text-emerald-200 bg-emerald-500/10",
  },
  yellow: {
    label: "Amarelo · atenção mediada",
    short: "Amarelo",
    dot: "bg-amber-400",
    ring: "ring-amber-400/40",
    chip: "border-amber-400/60 text-amber-100 bg-amber-400/10",
  },
  blue: {
    label: "Azul · presença calma",
    short: "Azul",
    dot: "bg-sky-400",
    ring: "ring-sky-400/40",
    chip: "border-sky-400/60 text-sky-100 bg-sky-400/10",
  },
  red: {
    label: "Vermelho · limite ativo",
    short: "Vermelho",
    dot: "bg-rose-500",
    ring: "ring-rose-500/40",
    chip: "border-rose-500/60 text-rose-100 bg-rose-500/10",
  },
};

const NOTA_KEY = "kaline:presenca-nota";

export function usePresencaRegime() {
  const qc = useQueryClient();

  const stateQuery = useQuery({
    queryKey: ["presenca-regime"],
    queryFn: async (): Promise<PresencaState | null> => {
      const { presenca } = await getLocalPresenca();
      return presenca?.state ?? null;
    },
    staleTime: 60_000,
  });

  const setState = useMutation({
    mutationFn: async (next: PresencaState) => {
      await setLocalPresenca(next);
      return next;
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["presenca-regime"] });
      const prev = qc.getQueryData<PresencaState | null>(["presenca-regime"]);
      qc.setQueryData(["presenca-regime"], next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(["presenca-regime"], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["presenca-regime"] });
    },
  });

  // ─── Nota efêmera (localStorage) ─────────────────────────────────────────
  const [nota, setNotaState] = useState<string>("");

  useEffect(() => {
    try {
      const v = localStorage.getItem(NOTA_KEY);
      if (v != null) setNotaState(v);
    } catch {
      // ignore
    }
  }, []);

  const setNota = useCallback(async (value: string) => {
    setNotaState(value);
    try {
      if (value.trim()) localStorage.setItem(NOTA_KEY, value);
      else localStorage.removeItem(NOTA_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    state: stateQuery.data ?? null,
    isLoading: stateQuery.isLoading,
    setState: setState.mutate,
    nota,
    setNota,
  };
}

// Leitura síncrona da nota efêmera (usada pelo composer do chat na hora de
// enviar mensagem). Retorna string vazia se não houver nota.
export async function readPresencaNota(): Promise<string> {
  try {
    return (localStorage.getItem(NOTA_KEY) ?? "").slice(0, 280);
  } catch {
    return "";
  }
}
