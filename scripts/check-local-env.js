#!/usr/bin/env node
/**
 * Checagem rápida do ambiente local antes de rodar a Kaline Offline.
 * Não instala nada, não baixa nada — apenas reporta o que falta.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readEnvFile(envPath) {
  if (!existsSync(envPath)) return {};
  const vars = {};
  for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    vars[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return vars;
}

function checkCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function main() {
  const results = [];
  const ok = (label) => results.push({ label, ok: true });
  const fail = (label, hint) => results.push({ label, ok: false, hint });

  checkCommand("node")
    ? ok("Node.js encontrado")
    : fail("Node.js não encontrado", "Instale Node 20+: https://nodejs.org");
  checkCommand("npm")
    ? ok("npm encontrado")
    : fail("npm não encontrado", "Instalado junto com Node.js.");
  checkCommand("bun")
    ? ok("bun encontrado")
    : fail("bun não encontrado", "Instale: https://bun.sh");

  (await checkPortFree(64113))
    ? ok("Porta 64113 livre (local-server)")
    : fail(
        "Porta 64113 ocupada",
        "Feche o processo que está usando a porta 64113 ou outro local-server já rodando.",
      );

  (await checkPortFree(5173))
    ? ok("Porta 5173 livre (frontend, padrão Vite)")
    : fail(
        "Porta 5173 ocupada",
        "O Vite escolherá outra porta automaticamente; veja a URL no terminal.",
      );

  existsSync(path.join(ROOT, "local-server"))
    ? ok("Pasta local-server encontrada")
    : fail(
        "Pasta local-server não encontrada",
        "Confirme que o repositório foi baixado corretamente.",
      );

  existsSync(path.join(ROOT, "local-server", ".env"))
    ? ok("local-server/.env encontrado")
    : fail(
        "local-server/.env não encontrado",
        "Copie local-server/.env.example para local-server/.env.",
      );

  existsSync(path.join(ROOT, "local-server", "data"))
    ? ok("Diretório de dados locais (local-server/data) encontrado")
    : fail(
        "local-server/data ainda não existe",
        "Será criado automaticamente na primeira execução do local-server.",
      );

  // Checagem informativa de motores locais (Ollama/Whisper). Nunca falha o ambiente
  // por padrão: só verifica binários/modelos quando local-server/.env existe e indica
  // explicitamente o uso de ollama / whisper_cpp. Sem .env (ex.: CI), só informa.
  const env = readEnvFile(path.join(ROOT, "local-server", ".env"));
  const modelProvider = env.KALINE_MODEL_PROVIDER;
  results.push({
    label: `Provider de modelo configurado: ${modelProvider ?? "(sem .env, padrão mock)"}`,
    ok: true,
  });

  if (modelProvider === "ollama") {
    const ollamaVars = ["OLLAMA_BASE_URL", "OLLAMA_MODEL_GENERAL", "OLLAMA_MODEL_VISION"];
    for (const key of ollamaVars) {
      env[key]
        ? ok(`${key} configurado (${env[key]})`)
        : fail(`${key} não configurado`, "Defina em local-server/.env para usar o Ollama.");
    }
  }

  const transcribeProvider = env.KALINE_TRANSCRIBE_PROVIDER;
  results.push({
    label: `Provider de transcrição configurado: ${transcribeProvider ?? "(sem .env, nenhum exigido)"}`,
    ok: true,
  });

  if (transcribeProvider === "whisper_cpp") {
    if (env.WHISPER_CPP_BIN) {
      existsSync(env.WHISPER_CPP_BIN)
        ? ok(`WHISPER_CPP_BIN encontrado (${env.WHISPER_CPP_BIN})`)
        : fail(
            "WHISPER_CPP_BIN configurado, mas o arquivo não existe",
            "Confirme o caminho do whisper-cli.",
          );
    } else {
      fail(
        "WHISPER_CPP_BIN não configurado",
        "Defina em local-server/.env para usar o Whisper local.",
      );
    }
    if (env.WHISPER_CPP_MODEL) {
      existsSync(env.WHISPER_CPP_MODEL)
        ? ok(`WHISPER_CPP_MODEL encontrado (${env.WHISPER_CPP_MODEL})`)
        : fail(
            "WHISPER_CPP_MODEL configurado, mas o arquivo não existe",
            "Confirme o caminho do ggml-small.bin.",
          );
    } else {
      fail(
        "WHISPER_CPP_MODEL não configurado",
        "Defina em local-server/.env para usar o Whisper local.",
      );
    }
  }

  console.log("\nChecagem do ambiente local da Kaline Offline\n");
  for (const r of results) {
    console.log(`${r.ok ? "[OK]  " : "[FALTA]"} ${r.label}`);
    if (!r.ok && r.hint) console.log(`        -> ${r.hint}`);
  }

  const failures = results.filter((r) => !r.ok).length;
  console.log(
    `\n${failures === 0 ? "Tudo certo." : `${failures} item(ns) precisam de atenção.`}\n`,
  );
  process.exit(failures > 0 ? 1 : 0);
}

main();
