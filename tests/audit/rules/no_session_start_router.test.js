import { test } from "node:test";
import { strict as assert } from "node:assert";
import rule from "../../../src/audit/rules/no_session_start_router.js";

test("no_session_start_router has the expected metadata", () => {
  assert.equal(rule.id, "no_session_start_router");
  assert.equal(rule.severity, "medium");
  assert.equal(rule.category, "cost");
});

test("no_session_start_router fires when hooksPresent is empty", () => {
  const f = rule.run({ dir: "/x/.claude/hooks", hooksPresent: [] });
  assert.ok(f);
  assert.equal(f.severity, "medium");
  assert.equal(f.category, "cost");
  assert.equal(f.mac_app_can_fix, true);
});

test("no_session_start_router fires when hooksPresent omits the router", () => {
  const f = rule.run({ dir: "/x", hooksPresent: ["pre-compact.sh"] });
  assert.ok(f);
  assert.equal(f.rule_id, "no_session_start_router");
});

test("no_session_start_router does not fire when the router is present", () => {
  assert.equal(rule.run({ dir: "/x", hooksPresent: ["session-start-router.sh"] }), null);
});

test("no_session_start_router treats input.hooksPresent === undefined as empty", () => {
  const f = rule.run({ dir: "/x" });
  assert.ok(f);
});
