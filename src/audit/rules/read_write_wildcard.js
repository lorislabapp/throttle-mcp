/// Flag `Read(*)` and `Write(*)` in permissions.allow. Each one is its
/// own finding — they are independent attack surfaces. Scoping these
/// to the project tree (Read(./**)) closes the data-exfiltration path.
export default {
  id: "read_write_wildcard",
  severity: "high",
  category: "security",
  run(input) {
    const allow = input?.parsedJSON?.permissions?.allow;
    if (!Array.isArray(allow)) return null;
    const findings = [];
    if (allow.includes("Read(*)")) findings.push(makeFinding("Read"));
    if (allow.includes("Write(*)")) findings.push(makeFinding("Write"));
    return findings.length > 0 ? findings : null;
  }
};

function makeFinding(verb) {
  return {
    rule_id: "read_write_wildcard",
    severity: "high",
    category: "security",
    title: `Unrestricted ${verb} permission`,
    quote: `${verb}(*)`,
    message:
      `${verb}(*) lets the model ${verb === "Read" ? "read every file in your home directory" : "overwrite any file in your home directory"}. A prompt injection chain (e.g. ${verb === "Read" ? "Read your ~/.ssh/" : "writing to a path used by another tool"}) becomes a one-step pivot.`,
    fix_hint:
      `Scope ${verb} to the project tree: ${verb}(./**). Repeat the audit on each project's .claude/settings.json so the global allow stays narrow.`,
    mac_app_can_fix: true
  };
}
