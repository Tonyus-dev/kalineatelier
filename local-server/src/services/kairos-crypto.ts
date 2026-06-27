/**
 * Decifragem do "Olhar de Kairós" — espelho do AES-256-GCM usado pela Totalidade
 * (ver src/lib/kairos-crypto.server.ts na raiz). Só decifra um envelope; não define
 * nenhum mecanismo de sync, fila ou retry — isso é decisão deliberada de escopo.
 */

import { webcrypto } from "node:crypto";

export type KairosEnvelope = { v: 1; iv: string; data: string };

async function deriveKey(sharedSecret: string) {
  const enc = new TextEncoder().encode(sharedSecret);
  const digest = await webcrypto.subtle.digest("SHA-256", enc);
  return webcrypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
}

export async function decryptKairosSnapshot(
  sharedSecret: string,
  envelope: KairosEnvelope,
): Promise<unknown> {
  if (envelope.v !== 1) throw new Error(`Versão de envelope desconhecida: ${envelope.v}`);
  const key = await deriveKey(sharedSecret);
  const iv = Buffer.from(envelope.iv, "base64");
  const data = Buffer.from(envelope.data, "base64");
  const plaintext = await webcrypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(Buffer.from(plaintext).toString("utf8"));
}
