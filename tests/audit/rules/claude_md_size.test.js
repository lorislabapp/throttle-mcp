import { test } from "node:test";
import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rule from "../../../src/audit/rules/claude_md_size.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "../../fixtures");

async function loadMd(name) {
  const fp = path.join(fixtures, name);
  const raw = await fs.readFile(fp, "utf8");
  return { rawText: raw, path: fp };
}

test("claude_md_size has the expected metadata", () => {
  assert.equal(rule.id, "claude_md_size");
  assert.equal(rule.severity, "medium");
  assert.equal(rule.category, "cost");
});

test("claude_md_size fires when CLAUDE.md is over 16 KB", async () => {
  const input = await loadMd("claude-md-large.md");
  const f = rule.run(input);
  assert.ok(f);
  assert.equal(f.severity, "medium");
  assert.equal(f.category, "cost");
  assert.equal(f.mac_app_can_fix, false);
  // Quote convention: literal field-like citation showing the byte count.
  // For size-based rules the literal quote is the measured number, framed
  // as the user would see it.
  assert.match(f.quote, /[\d,]+\s*bytes/);
});

test("claude_md_size does not fire on small CLAUDE.md", async () => {
  const input = await loadMd("claude-md-clean.md");
  assert.equal(rule.run(input), null);
});
