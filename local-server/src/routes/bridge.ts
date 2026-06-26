/**
 * Rota GET /bridge/status — estado da ponte com a nuvem (tunnel-ready).
 *
 * Não implementa pull, push ou túnel real. Ver docs/offline/TUNNEL_READY.md.
 * A Kaline Local não recebe comandos abertos da internet: a ponte futura usará
 * inbox/envelopes/revisão, nunca escrita automática no Jardim.
 */

import type { FastifyInstance } from "fastify";
import { BRIDGE_CONFIG } from "../config.js";

export async function registerBridgeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/bridge/status", async () => {
    return {
      ok: true,
      mode: BRIDGE_CONFIG.tunnelMode,
      deviceIdConfigured: BRIDGE_CONFIG.deviceId !== "",
      cloudBridgeConfigured: BRIDGE_CONFIG.cloudBridgeUrl !== "",
      bridgePublicKeyConfigured: BRIDGE_CONFIG.bridgePublicKey !== "",
      lastCloudCheckAt: BRIDGE_CONFIG.lastCloudCheckAt,
      message: "Ponte com nuvem ainda não implementada. Modo tunnel-ready está desativado.",
    };
  });
}
