/**
 * Configuração do servidor local da Kaline Offline.
 *
 * Host e porta são fixos em loopback (127.0.0.1:4517). O servidor NÃO escuta em 0.0.0.0
 * nesta fase: é estritamente local-first e privado.
 */

export const HOST = "127.0.0.1";
export const PORT = 4517;

export const SERVICE_INFO = {
  service: "kaline-local",
  mode: "offline-foundation",
  version: "0.1.0",
} as const;
