// EXEMPLO DE REFERÊNCIA — NÃO é código vivo deste repositório (offline).
//
// Cole/adapte isto no repo do app ONLINE (Totalidade) para a ação "Buscar do Offline".
// A chamada à Kaline Offline é em 127.0.0.1 e PRECISA ser client-side: o Worker da
// Cloudflare NÃO acessa o 127.0.0.1 da máquina do usuário. O snapshot recebido deve
// entrar como PENDENTE/REVISÁVEL no lado online — nunca aplicado automaticamente.
//
// Pré-requisitos no app online:
//   - VITE_KALINE_OFFLINE_LOCAL_URL (default http://127.0.0.1:64113)
//   - A mesma KALINE_BRIDGE_SHARED_KEY do local-server, para decifrar o envelope.
// Pré-requisito no local-server (offline):
//   - A origem do app online listada em KALINE_CORS_ALLOWED_ORIGINS (o @fastify/cors
//     já responde o preflight OPTIONS automaticamente).

import { useState } from "react";

type KairosEnvelope = { v: 1; iv: string; data: string };

const OFFLINE_URL =
  (import.meta as { env?: Record<string, string> }).env?.VITE_KALINE_OFFLINE_LOCAL_URL ??
  "http://127.0.0.1:64113";

async function deriveKey(sharedSecret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sharedSecret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
}

async function decryptSnapshot(sharedSecret: string, env: KairosEnvelope): Promise<unknown> {
  const key = await deriveKey(sharedSecret);
  const iv = Uint8Array.from(atob(env.iv), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(env.data), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plain));
}

export function BuscarDoOffline({ sharedKey }: { sharedKey: string }) {
  const [snapshot, setSnapshot] = useState<unknown>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function buscar() {
    setErro(null);
    setSnapshot(null);
    setCarregando(true);
    try {
      const res = await fetch(`${OFFLINE_URL}/bridge/olhar-de-kairos/local-snapshot`, {
        method: "GET",
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        setErro(`A Kaline Offline respondeu ${res.status}.`);
        return;
      }
      const envelope = (await res.json()) as KairosEnvelope;
      const data = await decryptSnapshot(sharedKey, envelope);
      // No app online: salve como evento/snapshot PENDENTE (revisável), não definitivo.
      setSnapshot(data);
    } catch {
      // CORS bloqueado, API local desligada, ou outra máquina: falha amigável.
      setErro(
        "Não foi possível falar com a Kaline Offline. Ela precisa estar rodando neste computador " +
          "(127.0.0.1:64113) e com esta origem liberada em KALINE_CORS_ALLOWED_ORIGINS.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <button onClick={buscar} disabled={carregando}>
        {carregando ? "Buscando…" : "Buscar do Offline"}
      </button>
      {erro && <p style={{ color: "crimson" }}>{erro}</p>}
      {snapshot != null && <pre>{JSON.stringify(snapshot, null, 2)}</pre>}
    </div>
  );
}
