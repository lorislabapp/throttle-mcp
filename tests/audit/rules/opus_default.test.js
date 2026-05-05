import { test } from "node:test";
import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rule from "../../../src/audit/rules/opus_default.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function loadFixture(name) {
  const fp = path.join(__dirname, "../../fixtures", name);
  const raw = await fs.readFile(fp, "utf8");
  return { parsedJSON: JSON.parse(raw), rawText: raw, path: fp };
}

test("opus_default has the expected metadata", () => {
  assert.equal(rule.id, "opus_default");
  assert.equal(rule.severity, "medium");
  assert.equal(rule.category, "cost");
});

test("opus_default fires when model is set to claude-opus-*", async () => {
  const input = await loadFixture("settings-opus-default.json");
  const f = rule.run(input);
  assert.ok(f);
  assert.equal(f.severity, "medium");
  assert.equal(f.category, "cost");
  assert.equal(f.mac_app_can_fix, true);
  // Quote = literal model field token (T6+ convention)
  assert.equal(f.quote, '"model": "claude-opus-4-7"');
});

test("opus_default does not fire when model is unset", async () => {
  const input = await loadFixture("settings-clean.json");
  assert.equal(rule.run(input), null);
});

test("opus_default does not fire when model is sonnet/haiku", () => {
  const input = { parsedJSON: { model: "claude-sonnet-4-6" }, rawText: "", path: "" };
  assert.equal(rule.run(input), null);
  const input2 = { parsedJSON: { model: "claude-haiku-4-5" }, rawText: "", path: "" };
  assert.equal(rule.run(input2), null);
});
