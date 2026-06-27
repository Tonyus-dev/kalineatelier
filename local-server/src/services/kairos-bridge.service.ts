/**
 * Olhar de Kairós — puxa, sob demanda, o snapshot cifrado exposto pela Totalidade
 * (GET /api/bridge/olhar-de-kairos) e deposita o resultado na inbox local, como
 * eventos `untrusted` e `pending`. Nunca escreve em Registro Vivo, Jardim,
 * Sedimentos ou Decisões — isso continua exigindo revisão humana explícita via
 * GET/POST /inbox e PATCH /inbox/:id.
 *
 * Escopo deliberado: um único GET por chamada, sem fila, sem cursor, sem retry
 * automático. Não é um mecanismo de sync genérico — só sabe puxar este snapshot.
 */

import type Database from "better-sqlite3";
import { BRIDGE_CONFIG, BRIDGE_STATE } from "../config.js";
import { createInboxEvent } from "./inbox.service.js";
import { decryptKairosSnapshot, type KairosEnvelope } from "./kairos-crypto.js";
import { nowIso } from "../utils/dates.js";

type KairosPullResult = { ok: true; eventsCreated: number } | { ok: false; error: string };

export async function pullOlharDeKairos(db: Database.Database): Promise<KairosPullResult> {
  if (BRIDGE_CONFIG.tunnelMode !== "pull_only") {
    return {
      ok: false,
      error: `KALINE_TUNNEL_MODE atual ('${BRIDGE_CONFIG.tunnelMode}') não é 'pull_only'.`,
    };
  }
  if (!BRIDGE_CONFIG.cloudBridgeUrl) {
    return { ok: false, error: "KALINE_CLOUD_BRIDGE_URL não está configurada." };
  }
  if (!BRIDGE_CONFIG.bridgeUserToken) {
    return { ok: false, error: "KALINE_BRIDGE_USER_TOKEN não está configurado." };
  }
  if (!BRIDGE_CONFIG.bridgeSharedKey) {
    return { ok: false, error: "KALINE_BRIDGE_SHARED_KEY não está configurada." };
  }

  const url = `${BRIDGE_CONFIG.cloudBridgeUrl.replace(/\/$/, "")}/api/bridge/olhar-de-kairos`;

  try {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${BRIDGE_CONFIG.bridgeUserToken}` },
    });
    if (!res.ok) {
      const error = `Olhar de Kairós respondeu ${res.status} em ${url}.`;
      BRIDGE_STATE.lastCloudCheckAt = nowIso();
      BRIDGE_STATE.lastError = error;
      return { ok: false, error };
    }

    const envelope = (await res.json()) as KairosEnvelope;
    const snapshot = (await decryptKairosSnapshot(
      BRIDGE_CONFIG.bridgeSharedKey,
      envelope,
    )) as Record<string, unknown>;

    const sections: Array<{ type: string; title: string; payload: unknown }> = [
      { type: "kairos_contexto", title: "Olhar de Kairós — contexto", payload: snapshot.contexto },
      {
        type: "kairos_identidade",
        title: "Olhar de Kairós — identidade",
        payload: snapshot.identidade,
      },
      {
        type: "kairos_sedimentacao",
        title: "Olhar de Kairós — sedimentação",
        payload: snapshot.sedimentacao,
      },
      {
        type: "kairos_reunioes",
        title: "Olhar de Kairós — reuniões transcritas",
        payload: snapshot.reunioes,
      },
      {
        type: "kairos_mensagens",
        title: "Olhar de Kairós — últimas mensagens",
        payload: snapshot.mensagens,
      },
    ];

    let eventsCreated = 0;
    for (const section of sections) {
      if (section.payload == null) continue;
      createInboxEvent(db, {
        source: "olhar_de_kairos",
        type: section.type,
        title: section.title,
        payload: section.payload,
        trustLevel: "untrusted",
      });
      eventsCreated += 1;
    }

    BRIDGE_STATE.lastCloudCheckAt = nowIso();
    BRIDGE_STATE.lastError = null;
    return { ok: true, eventsCreated };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    BRIDGE_STATE.lastCloudCheckAt = nowIso();
    BRIDGE_STATE.lastError = error;
    return { ok: false, error };
  }
}
