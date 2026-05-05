/// Run a list of rule modules over a single input. Each rule has the
/// shape { id, run(input) } where run returns null/undefined (no
/// finding), a single Finding, or an array of Findings. Throws are
/// caught and logged to stderr — one buggy rule does not blow up an
/// entire audit.
export function runRules(rules, input) {
  const findings = [];
  for (const rule of rules) {
    try {
      const out = rule.run(input);
      if (Array.isArray(out)) findings.push(...out);
      else if (out) findings.push(out);
    } catch (err) {
      console.error(`[throttle-mcp] rule '${rule.id}' threw:`, err);
    }
  }
  return findings;
}
