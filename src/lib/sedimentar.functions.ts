// Trilha de sedimentação — Kaline Offline.
//
// O motor local-server é determinístico e de nível único: a cada 5 mensagens
// não-sedimentadas de uma thread, cria 1 hipótese "em_revisao" (sem IA, sem
// cascata multi-nível). Por isso este módulo só opera no nível "short_term";
// `promoverNivel` é mantido por compatibilidade com a UI da Trilha, mas sempre
// retorna "nivel terminal" — não há síntese 5→1 entre sedimentos no offline.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  runLocalSedimentation,
  confirmLocalSediment,
  discardLocalSediment,
} from "@/lib/local/local-api-client";

const NIVEIS = [
  "iconic",
  "echoic",
  "short_term",
  "working",
  "prospective",
  "episodic",
  "semantic",
  "procedural",
] as const;

type SedimentoRow = {
  id: string;
  source_type: string;
  source_id: string;
  level: number;
  content: string;
  status: "em_revisao" | "confirmado" | "descartado" | "promovido";
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  discarded_at: string | null;
  metadata_json: string | null;
};

export const sedimentarThread = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ threadId: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { created } = await runLocalSedimentation(data.threadId);
    return {
      sedimentados: (created as SedimentoRow[]).length,
      janelas: (created as SedimentoRow[]).length,
      camadasCriadas: 0,
      restantes: 0,
    };
  });

export const confirmarSedimento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        sedimentoId: z.string().min(1),
        titulo: z.string().min(1).max(200).optional(),
        conteudo: z.string().min(1).max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { memoriaId } = await confirmLocalSediment(data.sedimentoId);
    return { ok: true, memoriaId };
  });

export const descartarSedimento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ sedimentoId: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    await discardLocalSediment(data.sedimentoId);
    return { ok: true };
  });

export const promoverNivel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        threadId: z.string().min(1),
        nivel: z.enum(NIVEIS),
      })
      .parse(input),
  )
  .handler(async () => {
    return { promovido: 0, motivo: "nivel terminal" as const };
  });
