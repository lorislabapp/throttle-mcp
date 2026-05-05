import fs from "node:fs/promises";
import { expandHome, isInsideHome } from "../sandbox.js";
import { runRules } from "../audit/runner.js";
import noSessionStartRouter from "../audit/rules/no_session_start_router.js";

const RULES = [noSessionStartRouter];

/// Tool: audit_hooks
/// Input: { dir: string }  (typically ~/.claude/hooks)
/// Output: { findings, scanned: { hooks_present, rules_evaluated } } | { error }
export async function auditHooksTool({ dir: rawDir }) {
  const expanded = expandHome(rawDir);
  if (!expanded) return { error: "invalid_path" };
  if (!isInsideHome(expanded)) return { error: "outside_home" };

  let entries = [];
  try {
    entries = await fs.readdir(expanded, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === "ENOENT") {
      // Treat a missing hooks dir as "no hooks" — the rule fires.
      entries = [];
    } else {
      return { error: "stat_failed", detail: String(err) };
    }
  }
  const hooksPresent = entries
    .filter(e => e.isFile() && e.name.endsWith(".sh"))
    .map(e => e.name);

  const findings = runRules(RULES, { dir: expanded, hooksPresent });
  return {
    findings,
    scanned: {
      hooks_present: hooksPresent,
      rules_evaluated: RULES.length
    }
  };
}
