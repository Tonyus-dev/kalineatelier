/**
 * Provider de modelo MOCK.
 *
 * Não conecta OpenRouter. Não conecta modelo local real. Não gasta token. Existe apenas
 * para validar o contrato `ModelProvider` e deixar a estrutura pronta para o PR 4.
 *
 * A resposta é determinística e marcada com `mock: true`, deixando claro que nada foi
 * inferido de fato — coerente com a regra de não-execução-fantasma.
 */

import type {
  ModelProvider,
  ModelProviderMessage,
  ModelProviderResponse,
} from "./model-provider.types";

export const MOCK_PROVIDER_NAME = "kaline-local-mock";
export const MOCK_PROVIDER_MODEL = "mock-structural-0";

export const mockModelProvider: ModelProvider = {
  async generate(messages: ModelProviderMessage[]): Promise<ModelProviderResponse> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const echo = lastUser?.content?.trim() ?? "";

    const text =
      "[resposta mock estrutural — nenhum modelo real foi consultado]" +
      (echo ? `\n\nVocê disse: ${echo}` : "");

    return {
      text,
      provider: MOCK_PROVIDER_NAME,
      model: MOCK_PROVIDER_MODEL,
      mock: true,
    };
  },
};
