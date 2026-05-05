import { test } from "node:test";
import { strict as assert } from "node:assert";
import { runRules } from "../../src/audit/runner.js";

const FINDING_A = {
  rule_id: "rule_a",
  severity: "high",
  category: "security",
  title: "A finding",
  message: "msg",
  fix_hint: "fix",
  mac_app_can_fix: true
};

test("runRules returns an empty array when no rules fire", () => {
  const rules = [
    { id: "noop", run: () => null }
  ];
  assert.deepEqual(runRules(rules, {}), []);
});

test("runRules collects single Finding return values", () => {
  const rules = [
    { id: "rule_a", run: () => FINDING_A }
  ];
  assert.deepEqual(runRules(rules, {}), [FINDING_A]);
});

test("runRules flattens array Finding return values", () => {
  const rules = [
    { id: "two", run: () => [FINDING_A, { ...FINDING_A, rule_id: "second" }] }
  ];
  const out = runRules(rules, {});
  assert.equal(out.length, 2);
  assert.equal(out[0].rule_id, "rule_a");
  assert.equal(out[1].rule_id, "second");
});

test("runRules survives a rule that throws", () => {
  const rules = [
    { id: "boom", run: () => { throw new Error("kaboom"); } },
    { id: "ok", run: () => FINDING_A }
  ];
  const out = runRules(rules, {});
  assert.equal(out.length, 1);
  assert.equal(out[0].rule_id, "rule_a");
});
