#!/usr/bin/env node
/**
 * Smoke test do local-server da Kaline Offline.
 *
 * Pressupõe que o local-server já está rodando em 127.0.0.1:64113 (npm run dev / start).
 * Não exige rede externa, Ollama ou OpenRouter — usa apenas o provider mock.
 */

const BASE_URL = process.env.KALINE_SMOKE_BASE_URL ?? "http://127.0.0.1:64113";

async function request(path, init) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "content-type": "application/json", accept: "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function main() {
  const checks = [];
  const record = (label, ok, detail) => checks.push({ label, ok, detail });

  try {
    const health = await request("/health");
    record(
      "GET /health",
      health.status === 200 && health.body?.ok === true,
      JSON.stringify(health.body),
    );
  } catch (err) {
    record("GET /health", false, String(err));
  }

  try {
    const model = await request("/model/status");
    record(
      "GET /model/status",
      model.status === 200 && model.body?.ok === true,
      JSON.stringify(model.body),
    );
  } catch (err) {
    record("GET /model/status", false, String(err));
  }

  try {
    const bridge = await request("/bridge/status");
    record(
      "GET /bridge/status",
      bridge.status === 200 && bridge.body?.mode === "disabled",
      JSON.stringify(bridge.body),
    );
  } catch (err) {
    record("GET /bridge/status", false, String(err));
  }

  try {
    const chat = await request("/chat", {
      method: "POST",
      body: JSON.stringify({ message: "smoke test" }),
    });
    record(
      "POST /chat (mock)",
      chat.status === 200 && Boolean(chat.body?.assistantMessage),
      JSON.stringify(chat.body?.assistantMessage ?? chat.body),
    );
  } catch (err) {
    record("POST /chat (mock)", false, String(err));
  }

  console.log(`\nSmoke test do local-server (${BASE_URL})\n`);
  for (const c of checks) {
    console.log(`${c.ok ? "[OK]  " : "[FAIL]"} ${c.label}`);
    if (!c.ok) console.log(`        -> ${c.detail}`);
  }

  const failures = checks.filter((c) => !c.ok).length;
  console.log(
    `\n${failures === 0 ? "Smoke test passou." : `${failures} verificação(ões) falharam.`}\n`,
  );
  process.exit(failures > 0 ? 1 : 0);
}

main();
