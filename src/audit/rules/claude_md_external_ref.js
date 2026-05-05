/// Flag CLAUDE.md directives that ask the assistant to read another
/// markdown file every session. These force a tool round-trip per
/// session even when the referenced content is rarely needed. Either
/// inline the small ones or drop the directive when the file is
/// historical reference material.
const PATTERNS = [
  // "Read X.md" / "Read X.md for ..."
  /^[^\n]*\bRead\s+([A-Za-z0-9_./-]+\.(md|txt|json))\b/gm,
  // "consult <file>.md before"
  /\bconsult\s+([A-Za-z0-9_./-]+\.(md|txt|json))\s+before\b/gi
];

export default {
  id: "claude_md_external_ref",
  severity: "low",
  category: "cost",
  run(input) {
    const text = input?.rawText;
    if (typeof text !== "string") return null;
    const matches = new Set();
    for (const pat of PATTERNS) {
      let m;
      while ((m = pat.exec(text)) !== null) {
        matches.add(m[1]);
      }
    }
    if (matches.size === 0) return null;
    return [...matches].map(ref => ({
      rule_id: "claude_md_external_ref",
      severity: "low",
      category: "cost",
      title: "CLAUDE.md forces a per-session file read",
      quote: ref,
      message:
        "Each session that triggers this directive pays for a tool round-trip plus the file's tokens, even when the reference is irrelevant to the current task. If the file is small and always relevant, inline it. If it's large or rarely needed, drop the directive and trust the model to read on demand.",
      fix_hint:
        `Inline ${ref} into CLAUDE.md if it's <1 KB and always relevant. Otherwise delete the directive — the model will request the file via read_file when it actually needs it.`,
      mac_app_can_fix: false
    }));
  }
};
