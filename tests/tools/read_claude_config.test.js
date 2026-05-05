import { test } from "node:test";
import { strict as assert } from "node:assert";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { readClaudeConfig } from "../../src/tools/read_claude_config.js";

test("readClaudeConfig returns success shape with content + bytes + truncated:false", async () => {
  const tmp = path.join(os.homedir(), `.tmcp-tool-read-${Date.now()}.json`);
  await fs.writeFile(tmp, '{"x":1}');
  try {
    const out = await readClaudeConfig({ path: tmp });
    assert.equal(out.path, tmp);
    assert.equal(out.content, '{"x":1}');
    assert.equal(out.bytes, 7);
    assert.equal(out.truncated, false);
    assert.equal(out.error, undefined);
  } finally {
    await fs.unlink(tmp);
  }
});

test("readClaudeConfig surfaces a structured error for outside-home paths", async () => {
  const out = await readClaudeConfig({ path: "/etc/hosts" });
  assert.equal(out.error, "outside_home");
  assert.equal(out.content, undefined);
});

test("readClaudeConfig accepts ~/ paths (expansion happens in the sandbox)", async () => {
  const home = os.homedir();
  const tmpName = `.tmcp-tool-tilde-${Date.now()}.txt`;
  const tmpAbs = path.join(home, tmpName);
  await fs.writeFile(tmpAbs, "hi");
  try {
    const out = await readClaudeConfig({ path: `~/${tmpName}` });
    assert.equal(out.content, "hi");
  } finally {
    await fs.unlink(tmpAbs);
  }
});
