import { test } from "node:test";
import { strict as assert } from "node:assert";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { auditClaudeMdTool } from "../../src/tools/audit_claude_md.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, "../fixtures");

async function copyFixtureToHome(name) {
  const src = await fs.readFile(path.join(fixtures, name), "utf8");
  const dest = path.join(os.homedir(), `.tmcp-${name.replace(/\//g, "_")}-${Date.now()}`);
  await fs.writeFile(dest, src);
  return dest;
}

test("audit_claude_md fires claude_md_size on a >16 KB file and reports rules_evaluated:2", async () => {
  const tmp = await copyFixtureToHome("claude-md-large.md");
  try {
    const out = await auditClaudeMdTool({ path: tmp });
    assert.equal(out.scanned.rules_evaluated, 2);
    assert.ok(out.findings.some(f => f.rule_id === "claude_md_size"));
    assert.ok(out.scanned.size_bytes > 16 * 1024);
    assert.ok(out.scanned.line_count >= 1);
  } finally {
    await fs.unlink(tmp);
  }
});

test("audit_claude_md fires claude_md_external_ref on a directive-laden CLAUDE.md", async () => {
  const tmp = await copyFixtureToHome("claude-md-external-ref.md");
  try {
    const out = await auditClaudeMdTool({ path: tmp });
    assert.ok(out.findings.some(f => f.rule_id === "claude_md_external_ref"));
  } finally {
    await fs.unlink(tmp);
  }
});

test("audit_claude_md returns no findings on a clean CLAUDE.md", async () => {
  const tmp = await copyFixtureToHome("claude-md-clean.md");
  try {
    const out = await auditClaudeMdTool({ path: tmp });
    assert.equal(out.findings.length, 0);
  } finally {
    await fs.unlink(tmp);
  }
});

test("audit_claude_md surfaces structured errors for unreadable paths", async () => {
  const out = await auditClaudeMdTool({ path: "/etc/hosts" });
  assert.equal(out.error, "outside_home");
});
