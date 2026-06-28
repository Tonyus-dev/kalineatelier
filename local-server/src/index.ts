/**
 * Ponto de entrada do servidor local da Kaline Offline.
 *
 * - Sobe Fastify em 127.0.0.1:64113 (loopback apenas).
 * - Trata EADDRINUSE com mensagem clara em português.
 * - Encerra de forma limpa em SIGINT/SIGTERM.
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { HOST, PORT, CORS_ALLOWED_ORIGINS, BRIDGE_CONFIG } from "./config.js";
import { getDb, closeDb } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerIdentityRoutes } from "./routes/identity.js";
import { registerThreadsRoutes } from "./routes/threads.js";
import { registerMessagesRoutes } from "./routes/messages.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerRegistroRoutes } from "./routes/registro.js";
import { registerMemoriesRoutes } from "./routes/memories.js";
import { registerSedimentsRoutes } from "./routes/sediments.js";
import { registerDecisoesRoutes } from "./routes/decisoes.js";
import { registerInboxRoutes } from "./routes/inbox.js";
import { registerReportsRoutes } from "./routes/reports.js";
import { registerModelRoutes } from "./routes/model.js";
import { registerBridgeRoutes } from "./routes/bridge.js";
import { registerTranscribeRoutes } from "./routes/transcribe.js";
import { registerTtsRoutes } from "./routes/tts.js";
import { registerMeetingsRoutes } from "./routes/meetings.js";
import { registerAgendaRoutes } from "./routes/agenda.js";
import { registerPresencaRoutes } from "./routes/presenca.js";
import { registerCamaraRoutes } from "./routes/camara.js";
import { registerLivrosRoutes } from "./routes/livros.js";
import { registerContextoExternoRoutes } from "./routes/contexto-externo.js";
import { shutdownKokoroWorker } from "./services/tts/kokoro-python.js";

runMigrations(getDb());

const printSecret = process.env.KALINE_BRIDGE_PRINT_SECRET_ON_START?.toLowerCase() === "true";

if (printSecret) {
  console.warn(
    [
      "",
      "[Atenção] KALINE_BRIDGE_PRINT_SECRET_ON_START=true: a chave será",
      "impressa no console e pode cair em logs.",
      "",
    ].join("\n"),
  );
}

if (BRIDGE_CONFIG.bridgeSharedKeyWasGenerated) {
  console.log(
    [
      "",
      "================================================================",
      "  Olhar de Kairós — chave de pareamento gerada automaticamente",
      "================================================================",
      "",
      "  Nenhuma KALINE_BRIDGE_SHARED_KEY foi configurada.",
      "",
      "  A Kaline Local gerou uma chave nova e a salvou em:",
      `    ${BRIDGE_CONFIG.bridgeSharedKeyPath}`,
      "",
      "  Por segurança, o valor da chave não é impresso automaticamente no log.",
      "",
      "  Para visualizar e copiar manualmente:",
      `    cat ${BRIDGE_CONFIG.bridgeSharedKeyPath}`,
      "",
      "  Use essa chave apenas em ambiente confiável e configure o mesmo valor",
      "  no lado online quando for parear a Totalidade com esta Kaline Local.",
      "================================================================",
      "",
    ].join("\n"),
  );

  if (printSecret) {
    console.log(`    ${BRIDGE_CONFIG.bridgeSharedKey}`);
  }
}

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: CORS_ALLOWED_ORIGINS,
});

await app.register(multipart);

await registerHealthRoute(app);
await registerModelRoutes(app);
await registerBridgeRoutes(app);
await registerTranscribeRoutes(app);
await registerTtsRoutes(app);
await registerMeetingsRoutes(app);
await registerSettingsRoutes(app);
await registerIdentityRoutes(app);
await registerThreadsRoutes(app);
await registerMessagesRoutes(app);
await registerChatRoutes(app);
await registerRegistroRoutes(app);
await registerMemoriesRoutes(app);
await registerSedimentsRoutes(app);
await registerDecisoesRoutes(app);
await registerInboxRoutes(app);
await registerReportsRoutes(app);
await registerAgendaRoutes(app);
await registerPresencaRoutes(app);
await registerCamaraRoutes(app);
await registerLivrosRoutes(app);
await registerContextoExternoRoutes(app);

async function shutdown(signal: string): Promise<void> {
  app.log.info(`Recebido ${signal}. Encerrando a Kaline Local...`);
  try {
    shutdownKokoroWorker();
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
    console.error(
      `\nPorta ${PORT} já está em uso. Feche outro processo da Kaline Local ou altere a porta local.\n`,
    );
    process.exit(1);
  }
  app.log.error(err, "Falha ao iniciar o servidor local.");
  process.exit(1);
}
