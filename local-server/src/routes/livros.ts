/**
 * Livros & Resumos — texto já extraído no cliente (PDF/DOCX/TXT via
 * pdfjs/mammoth), fichamento gerado via modelo local (Ollama, ou mock sem
 * provider configurado).
 *
 * Simplificação deliberada em relação à versão online: não há upload nem
 * armazenamento do arquivo original (sem Storage equivalente), nem geração
 * de infográfico (dependia de um modelo de imagem via OpenRouter, fora do
 * escopo do `local-server`). O frontend perde a ação "Gerar infográfico".
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MODEL_CONFIG } from "../config.js";
import { getDb } from "../db/connection.js";
import {
  createLivro,
  deleteLivro,
  getLivro,
  listLivros,
  setResumo,
} from "../services/livros.service.js";
import { ollamaChat, OllamaError } from "../services/model-provider/ollama.js";

const createLivroSchema = z.object({
  titulo: z.string().min(1),
  autor: z.string().optional(),
  texto_extraido: z.string().min(1),
});

export async function registerLivrosRoutes(app: FastifyInstance): Promise<void> {
  app.get("/livros", async () => {
    return { livros: listLivros(getDb()) };
  });

  app.post("/livros", async (req, reply) => {
    const parsed = createLivroSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ ok: false, error: parsed.error.message });
    const livro = createLivro(getDb(), {
      titulo: parsed.data.titulo,
      autor: parsed.data.autor,
      textoExtraido: parsed.data.texto_extraido.slice(0, 120000),
    });
    return { livro };
  });

  app.delete<{ Params: { id: string } }>("/livros/:id", async (req, reply) => {
    const ok = deleteLivro(getDb(), req.params.id);
    if (!ok) return reply.code(404).send({ ok: false, error: "Livro não encontrado" });
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>("/livros/:id/resumo", async (req, reply) => {
    const db = getDb();
    const livro = getLivro(db, req.params.id);
    if (!livro) return reply.code(404).send({ ok: false, error: "Livro não encontrado" });

    const system =
      "Faça um fichamento acadêmico do texto em markdown: tese central, estrutura, conceitos-chave, citações relevantes, perguntas para revisão.";

    let resumo: string;
    if (MODEL_CONFIG.provider === "ollama") {
      try {
        const { text } = await ollamaChat({
          model: MODEL_CONFIG.ollama.models.reasoning,
          messages: [
            { role: "system", content: system },
            { role: "user", content: livro.texto_extraido.slice(0, 60000) },
          ],
        });
        resumo = text.trim();
      } catch (err) {
        const msg = err instanceof OllamaError ? err.message : "Falha ao consultar o Ollama.";
        return reply.code(502).send({ ok: false, error: msg });
      }
    } else {
      resumo =
        "[fichamento mock — nenhum modelo real foi consultado]\n\n" +
        livro.texto_extraido.slice(0, 500);
    }

    setResumo(db, livro.id, resumo);
    return { resumo };
  });
}
