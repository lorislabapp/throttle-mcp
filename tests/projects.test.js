import { test } from "node:test";
import { strict as assert } from "node:assert";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { listClaudeProjects } from "../src/projects.js";

async function withTempProjectsDir(fn) {
  const root = path.join(os.tmpdir(), `throttle-mcp-projects-${Date.now()}`);
  const projectsDir = path.join(root, "projects");
  await fs.mkdir(projectsDir, { recursive: true });
  try {
    await fn(projectsDir);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("listClaudeProjects returns an empty array when projects dir is missing", async () => {
  const out = await listClaudeProjects("/no/such/path/projects");
  assert.deepEqual(out, []);
});

test("listClaudeProjects returns one entry per subdirectory with session count and last_active", async () => {
  await withTempProjectsDir(async (dir) => {
    const a = path.join(dir, "-Users-kev-foo");
    const b = path.join(dir, "-Users-kev-bar");
    await fs.mkdir(a);
    await fs.mkdir(b);
    await fs.writeFile(path.join(a, "session1.jsonl"), "{}\n");
    await fs.writeFile(path.join(a, "session2.jsonl"), "{}\n");
    await fs.writeFile(path.join(b, "session1.jsonl"), "{}\n");

    const out = await listClaudeProjects(dir);
    assert.equal(out.length, 2);

    const aEntry = out.find((p) => p.name === "-Users-kev-foo");
    assert.equal(aEntry.session_count, 2);
    assert.equal(aEntry.path, a);
    assert.ok(typeof aEntry.last_active === "string");
  });
});

test("listClaudeProjects ignores files at the projects root", async () => {
  await withTempProjectsDir(async (dir) => {
    await fs.writeFile(path.join(dir, "stray.txt"), "ignore me");
    const out = await listClaudeProjects(dir);
    assert.deepEqual(out, []);
  });
});

test("listClaudeProjects sorts by last_active descending (most recent first)", async () => {
  await withTempProjectsDir(async (dir) => {
    const older = path.join(dir, "older");
    const newer = path.join(dir, "newer");
    await fs.mkdir(older);
    await fs.mkdir(newer);
    await fs.writeFile(path.join(older, "s.jsonl"), "{}");
    await new Promise((r) => setTimeout(r, 20));
    await fs.writeFile(path.join(newer, "s.jsonl"), "{}");

    const out = await listClaudeProjects(dir);
    assert.equal(out[0].name, "newer");
    assert.equal(out[1].name, "older");
  });
});
