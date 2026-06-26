/**
 * Hash de PIN numérico via Web Crypto (SHA-256). O PIN em texto puro nunca é
 * persistido — apenas o hash é gravado em /settings no local-server.
 */

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
