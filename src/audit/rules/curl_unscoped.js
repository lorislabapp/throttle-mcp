/// Flag unrestricted curl/wget in permissions.allow. These are the
/// classic exfiltration shells — once the model can hit any URL with
/// any payload, prompt injection on a read file can post your secrets.
/// Replace with WebFetch + an explicit allowlist (Anthropic's WebFetch
/// asks the user per host).
const TRIGGERS = ["Bash(curl:*)", "Bash(wget:*)"];

export default {
  id: "curl_unscoped",
  severity: "high",
  category: "security",
  run(input) {
    const allow = input?.parsedJSON?.permissions?.allow;
    if (!Array.isArray(allow)) return null;
    const found = TRIGGERS.filter(t => allow.includes(t));
    if (found.length === 0) return null;
    return found.map(t => ({
      rule_id: "curl_unscoped",
      severity: "high",
      category: "security",
      title: "Unrestricted network shell",
      quote: t,
      message:
        `${t} lets the model exfiltrate data to any URL with any payload. A prompt injection in a file read by the assistant can post your tokens, ssh keys, or .env to an attacker-controlled host.`,
      fix_hint:
        "Drop the entry. Use WebFetch with a host allowlist when you actually need outbound HTTP — the model has to ask before each new host.",
      mac_app_can_fix: true
    }));
  }
};
