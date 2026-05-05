import { test } from "node:test";
import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rule from "../../../src/audit/rules/claude_md_external_ref.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadMd(name) {
  const fp = path.join(__dirname, "../../fixtures", name);
  const raw = await fs.readFile(fp, "utf8");
  return { rawText: raw, path: fp };
}

test("claude_md_external_ref has the expected metadata", () => {
  assert.equal(rule.id, "claude_md_external_ref");
  assert.equal(rule.severity, "low");
  assert.equal(rule.category, "cost");
});

test("claude_md_external_ref fires once per matched directive, capturing the referenced filename", async () => {
  const input = await loadMd("claude-md-external-ref.md");
  const out = rule.run(input);
  assert.ok(Array.isArray(out));
  assert.equal(out.length, 2);
  // Quote = literal filename token (T6+ convention)
  const refs = out.map(f => f.quote).sort();
  assert.deepEqual(refs, ["AUDIT.md", "docs/TESTING.md"]);
  assert.ok(out.every(f => f.severity === "low" && f.category === "cost" && f.mac_app_can_fix === false));
});

test("claude_md_external_ref ignores plain mentions (no Read directive)", () => {
  const input = { rawText: "See AUDIT.md if you want.\n", path: "" };
  assert.equal(rule.run(input), null);
});

test("claude_md_external_ref returns null on a clean CLAUDE.md", async () => {
  const input = await loadMd("claude-md-clean.md");
  assert.equal(rule.run(input), null);
});
