import { test } from "node:test";
import { strict as assert } from "node:assert";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { auditSettingsJsonTool } from "../../src/tools/audit_settings_json.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "../fixtures");

async function copyFixtureToHome(name) {
  const src = await fs.readFile(path.join(fixtures, name), "utf8");
  const dest = path.join(os.homedir(), `.tmcp-${name}-${Date.now()}`);
  await fs.writeFile(dest, src);
  return dest;
}

test("audit_settings_json runs all 4 settings rules and reports rules_evaluated:4", async () => {
  const tmp = await copyFixtureToHome("settings-bash-wildcard.json");
  try {
    const out = await auditSettingsJsonTool({ path: tmp });
    assert.equal(out.scanned.rules_evaluated, 4);
    assert.ok(Array.isArray(out.findings));
    assert.ok(out.findings.some(f => f.rule_id === "bash_wildcard"));
  } finally {
    await fs.unlink(tmp);
  }
});

test("audit_settings_json returns no findings on a clean settings.json", async () => {
  const tmp = await copyFixtureToHome("settings-clean.json");
  try {
    const out = await auditSettingsJsonTool({ path: tmp });
    assert.equal(out.findings.length, 0);
  } finally {
    await fs.unlink(tmp);
  }
});

test("audit_settings_json surfaces a structured error for unreadable paths", async () => {
  const out = await auditSettingsJsonTool({ path: "/etc/hosts" });
  assert.equal(out.error, "outside_home");
  assert.equal(out.findings, undefined);
});

test("audit_settings_json returns parse_error for malformed JSON", async () => {
  const tmp = path.join(os.homedir(), `.tmcp-malformed-${Date.now()}.json`);
  await fs.writeFile(tmp, "{ not json");
  try {
    const out = await auditSettingsJsonTool({ path: tmp });
    assert.equal(out.error, "parse_error");
  } finally {
    await fs.unlink(tmp);
  }
});
