import { test } from "node:test";
import { strict as assert } from "node:assert";
import os from "node:os";
import path from "node:path";
import { expandHome, isInsideHome, isCredentialPath } from "../src/sandbox.js";

test("expandHome turns ~ into the user's home", () => {
  assert.equal(expandHome("~/foo"), path.join(os.homedir(), "foo"));
  assert.equal(expandHome("~/.claude/settings.json"), path.join(os.homedir(), ".claude/settings.json"));
});

test("expandHome leaves absolute paths alone", () => {
  assert.equal(expandHome("/etc/hosts"), "/etc/hosts");
});

test("expandHome refuses relative paths (returns null)", () => {
  assert.equal(expandHome("foo/bar"), null);
  assert.equal(expandHome("./relative"), null);
});

test("isInsideHome accepts paths under ~", () => {
  assert.equal(isInsideHome(path.join(os.homedir(), "x")), true);
  assert.equal(isInsideHome(os.homedir()), true);
});

test("isInsideHome rejects paths outside ~", () => {
  assert.equal(isInsideHome("/etc/hosts"), false);
  assert.equal(isInsideHome("/tmp/foo"), false);
});

test("isInsideHome rejects path-traversal attempts even after expansion", () => {
  assert.equal(isInsideHome(path.join(os.homedir(), "..", "..", "etc")), false);
});

test("isCredentialPath flags ssh / aws / git creds / netrc / npmrc / Apple keys", () => {
  const home = os.homedir();
  assert.equal(isCredentialPath(path.join(home, ".ssh", "id_ed25519")), true);
  assert.equal(isCredentialPath(path.join(home, ".ssh", "anything")), true);
  assert.equal(isCredentialPath(path.join(home, ".aws", "credentials")), true);
  assert.equal(isCredentialPath(path.join(home, ".aws", "config")), true);
  assert.equal(isCredentialPath(path.join(home, ".config", "git", "credentials")), true);
  assert.equal(isCredentialPath(path.join(home, ".netrc")), true);
  assert.equal(isCredentialPath(path.join(home, ".npmrc")), true);
  assert.equal(isCredentialPath(path.join(home, "Downloads", "AuthKey_ABC123.p8")), true);
});

test("isCredentialPath does NOT flag non-secret config under ~/.config/git", () => {
  const home = os.homedir();
  assert.equal(isCredentialPath(path.join(home, ".config", "git", "config")), false);
});

test("isCredentialPath does NOT flag normal files", () => {
  const home = os.homedir();
  assert.equal(isCredentialPath(path.join(home, ".claude", "settings.json")), false);
  assert.equal(isCredentialPath(path.join(home, "GitHub", "Throttle", "CLAUDE.md")), false);
});

import fs from "node:fs/promises";
import { safeReadFile } from "../src/sandbox.js";

test("safeReadFile reads a small UTF-8 file and returns content + truncated:false", async () => {
  const tmp = path.join(os.homedir(), `.throttle-mcp-test-${Date.now()}.txt`);
  await fs.writeFile(tmp, "hello world");
  try {
    const r = await safeReadFile(tmp);
    assert.equal(r.error, undefined);
    assert.equal(r.content, "hello world");
    assert.equal(r.truncated, false);
    assert.equal(r.bytes, 11);
  } finally {
    await fs.unlink(tmp);
  }
});

test("safeReadFile truncates files over 64 KB and flags truncated:true", async () => {
  const tmp = path.join(os.homedir(), `.throttle-mcp-test-big-${Date.now()}.txt`);
  const big = "x".repeat(70 * 1024);
  await fs.writeFile(tmp, big);
  try {
    const r = await safeReadFile(tmp);
    assert.equal(r.error, undefined);
    assert.equal(r.truncated, true);
    assert.equal(r.content.length, 64 * 1024);
    assert.equal(r.bytes, 70 * 1024);
  } finally {
    await fs.unlink(tmp);
  }
});

test("safeReadFile refuses paths outside home", async () => {
  const r = await safeReadFile("/etc/hosts");
  assert.equal(r.error, "outside_home");
});

test("safeReadFile refuses credential paths even inside home", async () => {
  const r = await safeReadFile(path.join(os.homedir(), ".ssh", "id_ed25519"));
  assert.equal(r.error, "credential_path_denied");
});

test("safeReadFile refuses non-UTF8 binaries", async () => {
  const tmp = path.join(os.homedir(), `.throttle-mcp-test-bin-${Date.now()}.bin`);
  await fs.writeFile(tmp, Buffer.from([0xC3, 0x28, 0xFF, 0xFE]));
  try {
    const r = await safeReadFile(tmp);
    assert.equal(r.error, "binary_or_invalid_utf8");
  } finally {
    await fs.unlink(tmp);
  }
});

test("safeReadFile returns error for missing files", async () => {
  const r = await safeReadFile(path.join(os.homedir(), `.does-not-exist-${Date.now()}`));
  assert.equal(r.error, "not_found");
});

test("safeReadFile rejects symlinks pointing outside home", async () => {
  const inside = path.join(os.homedir(), `.throttle-mcp-link-${Date.now()}`);
  await fs.symlink("/etc/hosts", inside);
  try {
    const r = await safeReadFile(inside);
    assert.equal(r.error, "outside_home");
  } finally {
    await fs.unlink(inside);
  }
});

test("safeReadFile rejects symlinks pointing into a credential path", async () => {
  // Create a benign target inside ~/.ssh/ so the symlink resolves to a
  // path the credential deny-list flags, without needing a real key
  // file. Tests the post-realpath isCredentialPath() — the load-bearing
  // line that defends against symlink-into-credentials attacks.
  const sshDir = path.join(os.homedir(), ".ssh");
  await fs.mkdir(sshDir, { recursive: true });
  const target = path.join(sshDir, `.throttle-mcp-fake-key-${Date.now()}`);
  const link = path.join(os.homedir(), `.throttle-mcp-credlink-${Date.now()}`);
  await fs.writeFile(target, "not a real key");
  await fs.symlink(target, link);
  try {
    const r = await safeReadFile(link);
    assert.equal(r.error, "credential_path_denied");
  } finally {
    await fs.unlink(link);
    await fs.unlink(target);
  }
});
