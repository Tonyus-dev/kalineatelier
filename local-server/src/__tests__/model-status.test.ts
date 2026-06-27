import { test } from "node:test";
import assert from "node:assert/strict";
import { getModelStatus, getRealModelStatus } from "../services/model-provider/status.js";

// Provider padrão é mock: o status deve reportar mock honestamente, sem fingir IA real.
test("getModelStatus reporta mock por padrão", () => {
  const status = getModelStatus();
  assert.equal(status.provider, "mock");
  assert.equal(status.configured, true);
  assert.match(status.message, /mock/i);
});

test("getRealModelStatus reporta mock disponível por padrão", async () => {
  const status = await getRealModelStatus();
  assert.equal(status.provider, "mock");
  assert.equal(status.available, true);
});
