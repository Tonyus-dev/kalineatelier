// Câmara de Eco — Fase 2 (análise) e Fase 3 (ações revisáveis), Kaline Offline.
//
// Simplificação deliberada em relação à versão online: o local-server roda
// um único passe de análise estruturada via Ollama (ou mock sem provider
// configurado), sem os passes adicionais de ata em Markdown e infográfico
// SVG que a versão online gerava via OpenRouter. A UI já trata esses dois
// campos como opcionais.
//
// Ética do módulo permanece: a análise NUNCA vira memória sozinha. O
// servidor devolve uma síntese estruturada que o humano decide o que fazer.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  analisarLocalCamaraSessao,
  criarLocalCamaraKairos,
  semearLocalCamaraHipotese,
} from "@/lib/local/local-api-client";

export type CamaraAnalise = {
  resumo_operacional: string;
  interlocutores: { nome: string; confianca: string }[];
  temas: string[];
  decisoes: string[];
  sinais: string[];
  proximos_gestos: string[];
  candidatos_revisao: string[];
  ata_markdown?: string;
  infografico_svg?: string;
};

const AnalisarInput = z.object({ sessao_id: z.string().min(1) });

export const analisarCamara = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AnalisarInput.parse(d))
  .handler(async ({ data }) => {
    return analisarLocalCamaraSessao(data.sessao_id);
  });

const SemearInput = z.object({
  sessao_id: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(8000),
  origem: z.enum(["decisao", "proximo_gesto", "sinal", "candidato_revisao", "tema", "manual"]),
});

// Semeia uma HIPÓTESE no Jardim/Revisão.
export const semearHipoteseCamara = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SemearInput.parse(d))
  .handler(async ({ data }) => {
    const { id } = await semearLocalCamaraHipotese(data.sessao_id, {
      title: data.title,
      body: data.body,
      origem: data.origem,
    });
    return { id };
  });

const KairosInput = z.object({
  sessao_id: z.string().min(1),
  titulo: z.string().trim().min(1).max(160),
  descricao: z.string().trim().max(2000).optional(),
  inicio: z.string().min(1),
  fim: z.string().optional(),
  tipo: z
    .enum(["compromisso", "prazo", "reuniao", "evento", "aula", "outro"])
    .default("compromisso"),
});

// Cria um retorno Kairós — algo para "trazer para hoje" ou "adormecer para depois".
export const criarRetornoKairos = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => KairosInput.parse(d))
  .handler(async ({ data }) => {
    const { id } = await criarLocalCamaraKairos(data.sessao_id, {
      titulo: data.titulo,
      descricao: data.descricao,
      inicio: data.inicio,
      fim: data.fim,
      tipo: data.tipo,
    });
    return { id };
  });
