import { test } from "node:test";
import { strict as assert } from "node:assert";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { listClaudeProjectsTool } from "../../src/tools/list_claude_projects.js";

test("listClaudeProjectsTool wraps the core in a {projects:[...]} envelope", async () => {
  const root = path.join(os.tmpdir(), `tmcp-tool-projects-${Date.now()}`);
  const projectsDir = path.join(root, "projects");
  await fs.mkdir(projectsDir, { recursive: true });
  await fs.mkdir(path.join(projectsDir, "alpha"));
  await fs.writeFile(path.join(projectsDir, "alpha", "s.jsonl"), "{}");
  try {
    const out = await listClaudeProjectsTool({ projectsDir });
    assert.ok(Array.isArray(out.projects));
    assert.equal(out.projects.length, 1);
    assert.equal(out.projects[0].name, "alpha");
    assert.equal(out.projects[0].session_count, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("listClaudeProjectsTool defaults to ~/.claude/projects when projectsDir is omitted", async () => {
  const out = await listClaudeProjectsTool({});
  assert.ok(Array.isArray(out.projects));
});
