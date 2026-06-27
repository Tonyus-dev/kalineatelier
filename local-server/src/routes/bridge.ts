/**
 * Rotas da ponte com a nuvem (Olhar de Kairós).
 *
 * GET /bridge/status nunca conecta a nada — só relata configuração, honestamente.
 * POST /bridge/pull só funciona com KALINE_TUNNEL_MODE=pull_only e só deposita
 * envelopes `untrusted` em inbox_events — nunca escreve em Registro Vivo, Jardim,
 * Sedimentos ou Decisões. Ver docs/offline/TUNNEL_READY.md.
 */

import type { FastifyInstance } from "fastify";
import { BRIDGE_CONFIG, BRIDGE_STATE } from "../config.js";
import { getDb } from "../db/connection.js";
import { pullOlharDeKairos } from "../services/kairos-bridge.service.js";

export async function registerBridgeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/bridge/status", async () => {
    return {
      ok: true,
      mode: BRIDGE_CONFIG.tunnelMode,
      deviceIdConfigured: BRIDGE_CONFIG.deviceId !== "",
      cloudBridgeConfigured: BRIDGE_CONFIG.cloudBridgeUrl !== "",
      bridgePublicKeyConfigured: BRIDGE_CONFIG.bridgePublicKey !== "",
      bridgeSharedKeyConfigured: BRIDGE_CONFIG.bridgeSharedKey !== "",
      lastCloudCheckAt: BRIDGE_STATE.lastCloudCheckAt,
      lastError: BRIDGE_STATE.lastError,
      message:
        BRIDGE_CONFIG.tunnelMode === "disabled"
          ? "Ponte com nuvem desativada. Modo tunnel-ready está desativado por padrão."
          : "Olhar de Kairós configurado. Use POST /bridge/pull para puxar o snapshot sob demanda.",
    };
  });

  app.post("/bridge/pull", async (_req, reply) => {
    const result = await pullOlharDeKairos(getDb());
    if (!result.ok) return reply.code(400).send({ ok: false, error: result.error });
    return { ok: true, eventsCreated: result.eventsCreated };
  });
}
