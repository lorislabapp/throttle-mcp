import { test } from "node:test";
import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bashWildcard from "../../../src/audit/rules/bash_wildcard.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "../../fixtures");

async function loadJSON(name) {
  const raw = await fs.readFile(path.join(fixtures, name), "utf8");
  return { parsedJSON: JSON.parse(raw), rawText: raw, path: path.join(fixtures, name) };
}

test("bash_wildcard rule has the expected metadata", () => {
  assert.equal(bashWildcard.id, "bash_wildcard");
  assert.equal(bashWildcard.severity, "high");
  assert.equal(bashWildcard.category, "security");
});

test("bash_wildcard fires when permissions.allow contains Bash(*)", async () => {
  const input = await loadJSON("settings-bash-wildcard.json");
  const f = bashWildcard.run(input);
  assert.ok(f, "expected a finding");
  assert.equal(f.rule_id, "bash_wildcard");
  assert.equal(f.severity, "high");
  assert.equal(f.mac_app_can_fix, true);
  assert.match(f.quote, /Bash\(\*\)/);
});

test("bash_wildcard does not fire on a clean settings.json", async () => {
  const input = await loadJSON("settings-clean.json");
  assert.equal(bashWildcard.run(input), null);
});

test("bash_wildcard does not fire when permissions.allow is missing", () => {
  const input = { parsedJSON: {}, rawText: "{}", path: "/tmp/x.json" };
  assert.equal(bashWildcard.run(input), null);
});
