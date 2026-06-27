/**
 * Cifragem/decifragem do "Olhar de Kairós" — espelho do AES-256-GCM usado pela
 * Totalidade (ver src/lib/kairos-crypto.server.ts na raiz). Decifra o envelope que
 * vem da nuvem e cifra o snapshot local que o app online pode puxar. Não define
 * nenhum mecanismo de sync, fila ou retry — isso é decisão deliberada de escopo.
 */

import { webcrypto } from "node:crypto";

export type KairosEnvelope = { v: 1; iv: string; data: string };

async function deriveKey(sharedSecret: string) {
  const enc = new TextEncoder().encode(sharedSecret);
  const digest = await webcrypto.subtle.digest("SHA-256", enc);
  return webcrypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptKairosSnapshot(
  sharedSecret: string,
  payload: unknown,
): Promise<KairosEnvelope> {
  const key = await deriveKey(sharedSecret);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    v: 1,
    iv: Buffer.from(iv).toString("base64"),
    data: Buffer.from(ciphertext).toString("base64"),
  };
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
