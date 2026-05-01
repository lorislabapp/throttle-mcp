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
