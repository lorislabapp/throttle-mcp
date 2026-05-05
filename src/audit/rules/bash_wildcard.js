/// Flag `Bash(*)` in permissions.allow. With Bash(*), any prompt
/// injection in any file the assistant reads can shell out arbitrarily.
/// The fix is to scope to specific commands (Bash(git:*), Bash(swift:*),
/// etc.) so the model can only invoke approved tools.
export default {
  id: "bash_wildcard",
  severity: "high",
  category: "security",
  run(input) {
    const allow = input?.parsedJSON?.permissions?.allow;
    if (!Array.isArray(allow)) return null;
    if (!allow.includes("Bash(*)")) return null;
    return {
      rule_id: "bash_wildcard",
      severity: "high",
      category: "security",
      title: "Unrestricted Bash permission",
      quote: "Bash(*)",
      message:
        "Bash(*) lets the model run any shell command. A prompt injection in any file the model reads can pivot to data exfiltration or arbitrary writes. Scope to specific binaries instead.",
      fix_hint:
        "Replace `Bash(*)` with the specific commands you actually need, e.g. `Bash(git:*)`, `Bash(swift:*)`, `Bash(xcodebuild:*)`. Use the project's existing call sites to seed the list.",
      mac_app_can_fix: true
    };
  }
};
