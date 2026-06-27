/**
 * Logger compartilhado do local-server.
 *
 * Usa pino (mesma engine do logger do Fastify) para que os logs dos serviços fiquem no
 * mesmo formato estruturado das requisições HTTP, em vez de `console.log` solto.
 *
 * Logs são técnicos-only: provider, model, durationMs, success/error — nunca o conteúdo
 * bruto enviado ou recebido (ver docs/offline/MODELS_LOCAL.md, seção Privacidade).
 */

import { pino } from "pino";

export const logger = pino({
  name: "kaline-local",
  level: process.env.KALINE_LOG_LEVEL ?? "info",
});
