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

  // Resolve symlinks then re-check the sandbox — mirrors safeReadFile's
  // pattern. Without this, a symlink under ~/ pointing to /etc would
  // happily enumerate filenames there. We tolerate ENOENT (missing dir)
  // and let the rule fire; other realpath failures bubble out.
  let realDir = expanded;
  try {
    realDir = await fs.realpath(expanded);
  } catch (err) {
    if (!err || err.code !== "ENOENT") {
      return { error: "stat_failed", detail: String(err) };
    }
    // Missing dir: skip realpath, treat as empty below.
  }
  if (!isInsideHome(realDir)) return { error: "outside_home" };

  let entries = [];
  try {
    entries = await fs.readdir(realDir, { withFileTypes: true });
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
    .map(e => e.name)
    .sort();

  const findings = runRules(RULES, { dir: realDir, hooksPresent });
  return {
    findings,
    scanned: {
      hooks_present: hooksPresent,
      rules_evaluated: RULES.length
    }
  };
}
