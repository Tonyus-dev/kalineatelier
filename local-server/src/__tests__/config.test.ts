import { test } from "node:test";
import assert from "node:assert/strict";
import { MODEL_CONFIG, TRANSCRIPTION_CONFIG } from "../config.js";

// Guarda contra o drift code-vs-docs: os defaults do Ollama devem bater com o
// .env.example e a doc (qwen3.5:0.8b geral/coder/visão, qwen2.5:0.5b resumo).
test("defaults do Ollama batem com a documentação", () => {
  assert.equal(MODEL_CONFIG.ollama.models.general, "qwen3.5:0.8b");
  assert.equal(MODEL_CONFIG.ollama.models.coder, "qwen3.5:0.8b");
  assert.equal(MODEL_CONFIG.ollama.models.vision, "qwen3.5:0.8b");
  assert.equal(MODEL_CONFIG.ollama.models.summary, "qwen2.5:0.5b");
});

test("provider padrão é mock e transcrição é whisper_cpp", () => {
  assert.equal(MODEL_CONFIG.provider, "mock");
  assert.equal(TRANSCRIPTION_CONFIG.provider, "whisper_cpp");
});
