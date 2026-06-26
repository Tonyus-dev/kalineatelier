/**
 * Ponto de entrada do servidor local da Kaline Offline.
 *
 * - Sobe Fastify em 127.0.0.1:4517 (loopback apenas).
 * - Trata EADDRINUSE com mensagem clara em português.
 * - Encerra de forma limpa em SIGINT/SIGTERM.
 */

import Fastify from "fastify";
import { HOST, PORT } from "./config.js";
import { registerHealthRoute } from "./routes/health.js";

const app = Fastify({ logger: true });

await registerHealthRoute(app);

async function shutdown(signal: string): Promise<void> {
  app.log.info(`Recebido ${signal}. Encerrando a Kaline Local...`);
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error(err, "Falha ao encerrar.");
    process.exit(1);
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}

try {
  await app.listen({ host: HOST, port: PORT });
} catch (err) {
  if (err && typeof err === "object" && (err as NodeJS.ErrnoException).code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(
      `\nPorta ${PORT} já está em uso. Feche outro processo da Kaline Local ou altere a porta local.\n`,
    );
    process.exit(1);
  }
  app.log.error(err, "Falha ao iniciar o servidor local.");
  process.exit(1);
}
