/**
 * Rotas da ponte com a nuvem (Olhar de Kairós).
 *
 * GET /bridge/status nunca conecta a nada — só relata configuração, honestamente.
 * POST /bridge/olhar-de-kairos/pull-online só funciona com KALINE_TUNNEL_MODE=pull_only
 * e só deposita envelopes `untrusted` em inbox_events — nunca escreve em Registro Vivo,
 * Jardim, Sedimentos ou Decisões.
 * GET /bridge/olhar-de-kairos/local-snapshot serve um retrato local cifrado para o app
 * online puxar (client-side). Ver docs/offline/TUNNEL_READY.md.
 */

import type { FastifyInstance } from "fastify";
import { BRIDGE_CONFIG, BRIDGE_STATE } from "../config.js";
import { getDb } from "../db/connection.js";
import { pullOlharDeKairos } from "../services/kairos-bridge.service.js";
import { buildLocalKairosSnapshot } from "../services/kairos-snapshot.js";
import { encryptKairosSnapshot } from "../services/kairos-crypto.js";

export async function registerBridgeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/bridge/status", async () => {
    const enabled = BRIDGE_CONFIG.tunnelMode !== "disabled";
    return {
      ok: true,
      mode: BRIDGE_CONFIG.tunnelMode,
      deviceIdConfigured: BRIDGE_CONFIG.deviceId !== "",
      cloudBridgeConfigured: BRIDGE_CONFIG.cloudBridgeUrl !== "",
      bridgePublicKeyConfigured: BRIDGE_CONFIG.bridgePublicKey !== "",
      bridgeSharedKeyConfigured: BRIDGE_CONFIG.bridgeSharedKey !== "",
      lastCloudCheckAt: BRIDGE_STATE.lastCloudCheckAt,
      lastError: BRIDGE_STATE.lastError,
      kairos: {
        enabled,
        mode: BRIDGE_CONFIG.tunnelMode,
        cloudBridgeConfigured: BRIDGE_CONFIG.cloudBridgeUrl !== "",
        sharedKeyConfigured: BRIDGE_CONFIG.bridgeSharedKey !== "",
        userTokenConfigured: BRIDGE_CONFIG.bridgeUserToken !== "",
        lastPullAt: BRIDGE_STATE.lastPullAt,
        lastPullStatus: BRIDGE_STATE.lastPullStatus,
        lastError: BRIDGE_STATE.lastError,
      },
      message:
        BRIDGE_CONFIG.tunnelMode === "disabled"
          ? "Ponte com nuvem desativada. Modo tunnel-ready está desativado por padrão."
          : "Olhar de Kairós configurado. Use POST /bridge/olhar-de-kairos/pull-online para puxar o snapshot sob demanda.",
    };
  });

  // Puxa o Olhar de Kairós da nuvem (online -> offline). Nome canônico.
  app.post("/bridge/olhar-de-kairos/pull-online", async (_req, reply) => {
    const result = await pullOlharDeKairos(getDb());
    if (!result.ok) return reply.code(400).send({ ok: false, error: result.error });
    return {
      ok: true,
      source: "online",
      eventId: result.eventId,
      eventsCreated: result.eventsCreated,
      message: "Snapshot do Olhar de Kairós recebido e enviado para revisão.",
    };
  });

  // Alias deprecado — mantém compatibilidade com clientes anteriores.
  app.post("/bridge/pull", async (_req, reply) => {
    const result = await pullOlharDeKairos(getDb());
    if (!result.ok) return reply.code(400).send({ ok: false, error: result.error });
    return { ok: true, eventsCreated: result.eventsCreated };
  });

  // Serve o snapshot LOCAL cifrado para o app online puxar (offline -> online), client-side.
  // Exige KALINE_BRIDGE_SHARED_KEY (a mesma do app online). Nunca devolve segredos nem áudio cru.
  app.get("/bridge/olhar-de-kairos/local-snapshot", async (_req, reply) => {
    if (!BRIDGE_CONFIG.bridgeSharedKey) {
      return reply.code(503).send({
        ok: false,
        error: "KALINE_BRIDGE_SHARED_KEY não está configurada. Não é possível cifrar o snapshot.",
      });
    }
    const snapshot = buildLocalKairosSnapshot(getDb());
    const envelope = await encryptKairosSnapshot(BRIDGE_CONFIG.bridgeSharedKey, snapshot);
    reply.header("cache-control", "no-store");
    return envelope;
  });
}
