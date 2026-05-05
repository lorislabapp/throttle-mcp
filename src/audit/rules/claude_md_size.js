const THRESHOLD_BYTES = 16 * 1024;

/// Flag oversized CLAUDE.md. Every Claude Code session pays the file
/// in input tokens — a 32 KB CLAUDE.md is ~8k tokens of permanent
/// session-prelude. The threshold matches Throttle's 16 KB per-file
/// cap from the v2.5 system prompt: above that, the file dominates
/// the context budget and audits are worth doing.
export default {
  id: "claude_md_size",
  severity: "medium",
  category: "cost",
  run(input) {
    const text = input?.rawText;
    if (typeof text !== "string") return null;
    // Prefer the on-disk byte count from the audit tool — when
    // safeReadFile truncates content at 64 KB, Buffer.byteLength of the
    // truncated rawText would understate the real file size and hide
    // the worst offenders. Fall back to Buffer.byteLength when the tool
    // doesn't pass `bytes` (rule unit tests, ad-hoc callers).
    const bytes = typeof input?.bytes === "number"
      ? input.bytes
      : Buffer.byteLength(text, "utf8");
    if (bytes <= THRESHOLD_BYTES) return null;
    return {
      rule_id: "claude_md_size",
      severity: "medium",
      category: "cost",
      title: "CLAUDE.md is large",
      quote: `${bytes.toLocaleString()} bytes (threshold: ${THRESHOLD_BYTES.toLocaleString()})`,
      message:
        "Every session re-reads CLAUDE.md, so each 1 KB on disk costs ~250 input tokens per session. A file this large dominates the prelude — review for stale conventions, long historical decisions, and content that belongs in subdirectory CLAUDE.mds instead of the root.",
      fix_hint:
        "Move per-area conventions into subdirectory CLAUDE.mds (Claude Code reads them on demand only when you cd into that area). Trim historical context. Inline external .md references that the file points at — or delete the references if the docs are no longer relevant.",
      mac_app_can_fix: false
    };
  }
};
