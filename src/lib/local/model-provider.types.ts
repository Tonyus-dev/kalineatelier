/**
 * Contrato mínimo de um provedor de modelo da Kaline Offline.
 *
 * É deliberadamente pequeno: nesta fase só existe um provider mock. Modelos locais reais
 * (PR 4) e qualquer ponte para modelos externos implementarão esta mesma interface.
 */

export type ModelProviderRole = "system" | "user" | "assistant";

export type ModelProviderMessage = {
  role: ModelProviderRole;
  content: string;
};

export type ModelProviderResponse = {
  text: string;
  provider: string;
  model: string;
  /** Marca explicitamente respostas estruturais sem inferência real (ex.: o mock). */
  mock?: boolean;
};

export interface ModelProvider {
  generate(messages: ModelProviderMessage[]): Promise<ModelProviderResponse>;
}
