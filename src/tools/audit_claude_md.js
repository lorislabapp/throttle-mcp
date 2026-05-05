import { safeReadFile } from "../sandbox.js";
import { runRules } from "../audit/runner.js";
import claudeMdSize from "../audit/rules/claude_md_size.js";
import claudeMdExternalRef from "../audit/rules/claude_md_external_ref.js";

const RULES = [claudeMdSize, claudeMdExternalRef];

/// Tool: audit_claude_md
/// Input: { path: string }
/// Output: { findings, scanned: { size_bytes, line_count, rules_evaluated } } | { error }
export async function auditClaudeMdTool({ path }) {
  const read = await safeReadFile(path);
  if (read.error) return { error: read.error };
  const findings = runRules(RULES, {
    rawText: read.content,
    path
  });
  return {
    findings,
    scanned: {
      size_bytes: read.bytes,
      line_count: read.content.split("\n").length,
      rules_evaluated: RULES.length
    }
  };
}
