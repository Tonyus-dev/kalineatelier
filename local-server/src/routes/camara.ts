/**
 * Câmara de Eco — sessões de escuta (áudio segmentado ou texto livre) com
 * análise opcional via modelo local (Ollama) e ações revisáveis (semear no
 * Jardim, criar retorno na Agenda).
 *
 * Simplificação deliberada em relação à versão online (que rodava 3 passes
 * de IA — análise estruturada, ata em Markdown, infográfico SVG — via
 * OpenRouter): aqui rodamos um único passe estruturado via Ollama (ou mock
 * sem provider configurado), sem ata nem infográfico. O frontend já trata
 * esses campos como opcionais.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DATA_DIR, MODEL_CONFIG } from "../config.js";
import { getDb } from "../db/connection.js";
import {
  createSessao,
  createSegmento,
  deleteSessao,
  getSegmento,
  getSessao,
  listSegmentos,
  listSessoes,
  setAnalise,
  setSegmentoStatus,
} from "../services/camara.service.js";
import { createMemoria } from "../services/memory.service.js";
import { createEvento, TIPOS_EVENTO } from "../services/agenda.service.js";
import { ollamaChat, OllamaError } from "../services/model-provider/ollama.js";
import { getTranscriptionStatus, transcribeFile, WhisperError } from "../services/transcription/whisper-cpp.js";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB por segmento (até ~3 min de áudio)

const createSessaoSchema = z.object({
  titulo: z.string().min(1),
  origem: z.enum(["audio", "texto"]),
  texto: z.string().optional(),
});

const AnaliseSchema = z.object({
  resumo_operacional: z.string(),
  interlocutores: z.array(z.object({ nome: z.string(), confianca: z.string() })).default([]),
  temas: z.array(z.string()).default([]),
  decisoes: z.array(z.string()).default([]),
  sinais: z.array(z.string()).default([]),
  proximos_gestos: z.array(z.string()).default([]),
  candidatos_revisao: z.array(z.string()).default([]),
});

const ANALISE_SYSTEM = `Você é a Kaline em modo Câmara de Eco — escuta, segmenta e devolve sentido sem tomar posse da conversa.

REGRAS INVIOLÁVEIS:
- Não invente interlocutores. Se não houver evidência clara, descreva funcionalmente.
- Não afirme identidade sem lastro: prefira "provável", "possível", "hipotético".
- Não transforme hipótese em fato nem transcrição em memória final.
- Decisão detectada ≠ compromisso sedimentado. Próximo gesto ≠ tarefa atribuída.
- Use português brasileiro, tom seco e respeitoso, sem floreios.

Devolva APENAS um JSON com as chaves: resumo_operacional (string), interlocutores
(array de {nome, confianca}), temas (array de string), decisoes (array de string),
sinais (array de string), proximos_gestos (array de string), candidatos_revisao
(array de string). Sem texto fora do JSON.`;

function extractJson(text: string): unknown | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function registerCamaraRoutes(app: FastifyInstance): Promise<void> {
  app.get("/camara/sessoes", async () => {
    return { sessoes: listSessoes(getDb()) };
  });

  app.post("/camara/sessoes", async (req, reply) => {
    const parsed = createSessaoSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    const sessao = createSessao(getDb(), parsed.data);
    return { sessao };
  });

  app.get<{ Params: { id: string } }>("/camara/sessoes/:id", async (req, reply) => {
    const db = getDb();
    const sessao = getSessao(db, req.params.id);
    if (!sessao) return reply.code(404).send({ ok: false, error: "Câmara não encontrada" });
    return { sessao, segmentos: listSegmentos(db, sessao.id) };
  });

  app.delete<{ Params: { id: string } }>("/camara/sessoes/:id", async (req, reply) => {
    const ok = deleteSessao(getDb(), req.params.id);
    if (!ok) return reply.code(404).send({ ok: false, error: "Câmara não encontrada" });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/camara/sessoes/:id/segmentos", async (req, reply) => {
    const db = getDb();
    const sessao = getSessao(db, req.params.id);
    if (!sessao) return reply.code(404).send({ ok: false, error: "Câmara não encontrada" });
    const existentes = listSegmentos(db, sessao.id);
    const segmento = createSegmento(db, { sessaoId: sessao.id, ordem: existentes.length });
    return { segmento };
  });

  app.post<{ Params: { id: string } }>(
    "/camara/segmentos/:id/transcrever",
    async (req, reply) => {
      const db = getDb();
      const segmento = getSegmento(db, req.params.id);
      if (!segmento) return reply.code(404).send({ ok: false, error: "Segmento não encontrado" });

      const data = await req.file({ limits: { fileSize: MAX_UPLOAD_BYTES } }).catch(() => null);
      if (!data) {
        return reply.code(400).send({ ok: false, error: "Envie o áudio no campo 'file'." });
      }

      setSegmentoStatus(db, segmento.id, { status: "processing" });

      const tmpDir = path.join(DATA_DIR, "tmp");
      await fs.mkdir(tmpDir, { recursive: true });
      const ext = path.extname(data.filename || "") || ".webm";
      const tmpPath = path.join(tmpDir, `camara-${randomUUID()}${ext}`);

      try {
        await fs.writeFile(tmpPath, await data.toBuffer());
        const result = await transcribeFile(tmpPath);
        setSegmentoStatus(db, segmento.id, { status: "transcribed", transcricao: result.text });
        return { text: result.text };
      } catch (err) {
        const msg =
          err instanceof WhisperError ? err.message : "Falha ao transcrever o segmento.";
        setSegmentoStatus(db, segmento.id, { status: "failed", erro: msg.slice(0, 500) });
        return reply.code(502).send({ ok: false, error: msg });
      } finally {
        await fs.unlink(tmpPath).catch(() => {});
      }
    },
  );

  app.post<{ Params: { id: string } }>("/camara/sessoes/:id/analisar", async (req, reply) => {
    const db = getDb();
    const sessao = getSessao(db, req.params.id);
    if (!sessao) return reply.code(404).send({ ok: false, error: "Câmara não encontrada" });

    let conteudo = "";
    if (sessao.origem === "texto") {
      conteudo = sessao.texto ?? "";
    } else {
      conteudo = listSegmentos(db, sessao.id)
        .filter((s) => s.transcricao)
        .map((s) => `[Bloco ${String(s.ordem).padStart(2, "0")}]\n${s.transcricao}`)
        .join("\n\n");
    }

    if (!conteudo.trim() || conteudo.trim().length < 30) {
      return reply
        .code(400)
        .send({ ok: false, error: "Conteúdo insuficiente para análise (mínimo ~30 caracteres)." });
    }

    const conteudoLimitado = conteudo.slice(0, 60000);
    const prompt = `Câmara: "${sessao.titulo}"\n\nConteúdo registrado:\n\n${conteudoLimitado}`;

    let estruturado: z.infer<typeof AnaliseSchema>;
    if (MODEL_CONFIG.provider === "ollama") {
      try {
        const { text } = await ollamaChat({
          model: MODEL_CONFIG.ollama.models.reasoning,
          messages: [
            { role: "system", content: ANALISE_SYSTEM },
            { role: "user", content: prompt },
          ],
        });
        const json = extractJson(text);
        const parsed = json ? AnaliseSchema.safeParse(json) : null;
        estruturado = parsed?.success
          ? parsed.data
          : {
              resumo_operacional: text.trim().slice(0, 2000),
              interlocutores: [],
              temas: [],
              decisoes: [],
              sinais: [],
              proximos_gestos: [],
              candidatos_revisao: [],
            };
      } catch (err) {
        const msg = err instanceof OllamaError ? err.message : "Falha ao consultar o Ollama.";
        return reply.code(502).send({ ok: false, error: msg });
      }
    } else {
      estruturado = {
        resumo_operacional:
          "[análise mock — nenhum modelo real foi consultado]\n\n" + conteudoLimitado.slice(0, 500),
        interlocutores: [],
        temas: [],
        decisoes: [],
        sinais: [],
        proximos_gestos: [],
        candidatos_revisao: [],
      };
    }

    setAnalise(db, sessao.id, JSON.stringify(estruturado));
    return estruturado;
  });

  const semearSchema = z.object({
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(8000),
    origem: z.enum(["decisao", "proximo_gesto", "sinal", "candidato_revisao", "tema", "manual"]),
  });

  app.post<{ Params: { id: string } }>("/camara/sessoes/:id/semear", async (req, reply) => {
    const db = getDb();
    const sessao = getSessao(db, req.params.id);
    if (!sessao) return reply.code(404).send({ ok: false, error: "Câmara não encontrada" });
    const parsed = semearSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });

    const memoria = createMemoria(db, {
      title: parsed.data.title,
      content: parsed.data.body,
      source: "camara-de-eco",
      sourceRef: sessao.id,
      category: "hipotese",
      tags: ["hipotese", "curto_prazo", `camara:${parsed.data.origem}`],
      importance: 1,
    });
    return { id: memoria.id };
  });

  const kairosSchema = z.object({
    titulo: z.string().trim().min(1).max(160),
    descricao: z.string().trim().max(2000).optional(),
    inicio: z.string().min(1),
    fim: z.string().nullable().optional(),
    tipo: z.enum(TIPOS_EVENTO).default("compromisso"),
  });

  app.post<{ Params: { id: string } }>("/camara/sessoes/:id/kairos", async (req, reply) => {
    const db = getDb();
    const sessao = getSessao(db, req.params.id);
    if (!sessao) return reply.code(404).send({ ok: false, error: "Câmara não encontrada" });
    const parsed = kairosSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });

    const descricaoFinal = [parsed.data.descricao ?? "", `\n— retorno da Câmara: "${sessao.titulo}"`]
      .join("")
      .trim();

    const evento = createEvento(db, {
      titulo: parsed.data.titulo,
      descricao: descricaoFinal,
      tipo: parsed.data.tipo,
      inicio: parsed.data.inicio,
      fim: parsed.data.fim ?? null,
    });
    return { id: evento.id };
  });

  app.get("/camara/transcricao/status", async () => {
    return getTranscriptionStatus();
  });
}
