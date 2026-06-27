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
      "GET /bridge/status (bloco kairos)",
      bridge.status === 200 &&
        bridge.body?.mode === "disabled" &&
        bridge.body?.kairos &&
        bridge.body.kairos.enabled === false &&
        "lastPullAt" in bridge.body.kairos &&
        "lastPullStatus" in bridge.body.kairos,
      JSON.stringify(bridge.body),
    );
  } catch (err) {
    record("GET /bridge/status (bloco kairos)", false, String(err));
  }

  try {
    // Sem pull_only configurado, o pull online -> offline deve recusar honestamente.
    const pull = await request("/bridge/olhar-de-kairos/pull-online", {
      method: "POST",
      body: JSON.stringify({}),
    });
    record(
      "POST /bridge/olhar-de-kairos/pull-online (recusa honesta)",
      pull.status === 400 && pull.body?.ok === false && typeof pull.body?.error === "string",
      JSON.stringify(pull.body),
    );
  } catch (err) {
    record("POST /bridge/olhar-de-kairos/pull-online (recusa honesta)", false, String(err));
  }

  try {
    // Sem KALINE_BRIDGE_SHARED_KEY, o snapshot local deve recusar (não vaza nada).
    const snap = await request("/bridge/olhar-de-kairos/local-snapshot");
    const okEnvelope =
      snap.status === 200 && snap.body?.v === 1 && typeof snap.body?.data === "string";
    const okRefused = snap.status === 503 && snap.body?.ok === false;
    record(
      "GET /bridge/olhar-de-kairos/local-snapshot (cifrado ou recusa honesta)",
      okEnvelope || okRefused,
      JSON.stringify(snap.body),
    );
  } catch (err) {
    record(
      "GET /bridge/olhar-de-kairos/local-snapshot (cifrado ou recusa honesta)",
      false,
      String(err),
    );
  }

  try {
    const transcribe = await request("/transcribe/status");
    record(
      "GET /transcribe/status",
      transcribe.status === 200 &&
        transcribe.body?.ok === true &&
        typeof transcribe.body?.available === "boolean",
      JSON.stringify(transcribe.body),
    );
  } catch (err) {
    record("GET /transcribe/status", false, String(err));
  }

  try {
    const tts = await request("/tts/status");
    record(
      "GET /tts/status",
      tts.status === 200 && tts.body?.ok === true && typeof tts.body?.status === "string",
      JSON.stringify(tts.body),
    );
  } catch (err) {
    record("GET /tts/status", false, String(err));
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

  try {
    // Reunião: deve entrar como untrusted/pending e nunca como verdade local.
    const created = await request("/meetings", {
      method: "POST",
      body: JSON.stringify({ transcript: "smoke test de reunião", durationMs: 1000 }),
    });
    const ev = created.body?.event;
    const okCreate =
      created.status === 200 &&
      ev?.type === "meeting_transcript" &&
      ev?.trust_level === "untrusted" &&
      ev?.status === "pending";
    record("POST /meetings (untrusted/pending)", okCreate, JSON.stringify(ev ?? created.body));

    const list = await request("/meetings");
    record(
      "GET /meetings",
      list.status === 200 && Array.isArray(list.body?.meetings),
      JSON.stringify({ count: list.body?.meetings?.length }),
    );
  } catch (err) {
    record("POST /meetings (untrusted/pending)", false, String(err));
  }

  try {
    // Sem modelo Kokoro presente, /tts/speak deve falhar honestamente (sem fingir voz).
    const speak = await request("/tts/speak", {
      method: "POST",
      body: JSON.stringify({ text: "olá" }),
    });
    const okAudio = speak.status === 200; // áudio real (quando o modelo existe)
    const okRefused = speak.status === 503 && speak.body?.ok === false;
    record(
      "POST /tts/speak (áudio real ou recusa honesta)",
      okAudio || okRefused,
      JSON.stringify(speak.body ?? { status: speak.status }),
    );
  } catch (err) {
    record("POST /tts/speak (áudio real ou recusa honesta)", false, String(err));
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
