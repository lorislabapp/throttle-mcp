import { test } from "node:test";
import { strict as assert } from "node:assert";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { auditHooksTool } from "../../src/tools/audit_hooks.js";

async function withHooksDir(files, fn) {
  // Must be inside ~/ — auditHooksTool refuses outside-home dirs by design.
  const dir = path.join(os.homedir(), `.tmcp-hooks-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(dir, { recursive: true });
  for (const f of files) await fs.writeFile(path.join(dir, f), "#!/usr/bin/env bash\n");
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test("audit_hooks fires no_session_start_router when the dir is empty", async () => {
  await withHooksDir([], async (dir) => {
    const out = await auditHooksTool({ dir });
    assert.deepEqual(out.scanned.hooks_present, []);
    assert.equal(out.scanned.rules_evaluated, 1);
    assert.ok(out.findings.some(f => f.rule_id === "no_session_start_router"));
  });
});

test("audit_hooks does NOT fire when session-start-router.sh is present", async () => {
  await withHooksDir(["session-start-router.sh"], async (dir) => {
    const out = await auditHooksTool({ dir });
    assert.deepEqual(out.scanned.hooks_present, ["session-start-router.sh"]);
    assert.equal(out.findings.length, 0);
  });
});

test("audit_hooks refuses outside-home dirs", async () => {
  const out = await auditHooksTool({ dir: "/no/such/hooks" });
  assert.equal(out.error, "outside_home");
});

test("audit_hooks accepts a directory under home and lists *.sh files only", async () => {
  await withHooksDir([], async (dir) => {
    await fs.writeFile(path.join(dir, "session-start-router.sh"), "#!/usr/bin/env bash\n");
    await fs.writeFile(path.join(dir, "README.md"), "ignored");
    const out = await auditHooksTool({ dir });
    assert.deepEqual(out.scanned.hooks_present.sort(), ["session-start-router.sh"]);
  });
});
