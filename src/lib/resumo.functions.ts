// Livros & Resumos, Kaline Offline.
//
// Simplificação deliberada em relação à versão online: o fichamento é
// gerado pelo local-server (Ollama ou mock sem provider configurado),
// associado a um livro já criado. Não há mais geração de infográfico
// (dependia de um modelo de imagem via OpenRouter, fora do escopo offline).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { gerarLocalResumoLivro } from "@/lib/local/local-api-client";

const ResumirInput = z.object({ livro_id: z.string().min(1) });

export const resumirConteudo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ResumirInput.parse(d))
  .handler(async ({ data }) => {
    return gerarLocalResumoLivro(data.livro_id);
  });
