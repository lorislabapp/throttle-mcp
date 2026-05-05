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
  // Pass `bytes` and `truncated` into the rule input so size-driven
  // rules see the on-disk total even when safeReadFile capped content
  // at 64 KB. claude_md_size prefers input.bytes over Buffer.byteLength.
  const findings = runRules(RULES, {
    rawText: read.content,
    bytes: read.bytes,
    truncated: read.truncated,
    path
  });
  return {
    findings,
    scanned: {
      size_bytes: read.bytes,
      line_count: read.content.split("\n").length,
      truncated: read.truncated,
      rules_evaluated: RULES.length
    }
  };
}
