import { test } from "node:test";
import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rule from "../../../src/audit/rules/curl_unscoped.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadFixture(name) {
  const fp = path.join(__dirname, "../../fixtures", name);
  const raw = await fs.readFile(fp, "utf8");
  return { parsedJSON: JSON.parse(raw), rawText: raw, path: fp };
}

test("curl_unscoped fires for Bash(curl:*) AND Bash(wget:*)", async () => {
  const input = await loadFixture("settings-curl.json");
  const out = rule.run(input);
  assert.ok(Array.isArray(out));
  assert.equal(out.length, 2);
  assert.deepEqual(
    out.map(f => f.quote).sort(),
    ["Bash(curl:*)", "Bash(wget:*)"]
  );
  assert.ok(out.every(f => f.rule_id === "curl_unscoped" && f.severity === "high" && f.category === "security"));
});

test("curl_unscoped does not fire on a clean settings.json", async () => {
  const input = await loadFixture("settings-clean.json");
  assert.equal(rule.run(input), null);
});
