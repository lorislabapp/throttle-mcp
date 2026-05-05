import { test } from "node:test";
import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rule from "../../../src/audit/rules/read_write_wildcard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadFixture(name) {
  const fp = path.join(__dirname, "../../fixtures", name);
  const raw = await fs.readFile(fp, "utf8");
  return { parsedJSON: JSON.parse(raw), rawText: raw, path: fp };
}

test("read_write_wildcard fires for Read(*) AND Write(*) at once", async () => {
  const input = await loadFixture("settings-rw-wildcard.json");
  const out = rule.run(input);
  assert.ok(Array.isArray(out));
  assert.equal(out.length, 2);
  assert.deepEqual(out.map(f => f.rule_id).sort(), ["read_write_wildcard", "read_write_wildcard"]);
  // Quote = literal token (per T6 review convention)
  assert.deepEqual(out.map(f => f.quote).sort(), ["Read(*)", "Write(*)"]);
});

test("read_write_wildcard returns null on a clean settings.json", async () => {
  const input = await loadFixture("settings-clean.json");
  assert.equal(rule.run(input), null);
});
