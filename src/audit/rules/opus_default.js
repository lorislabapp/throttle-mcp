/// Flag a default Opus model in settings.json. Opus bills ~5× Sonnet
/// for typical Claude Code workloads (input-heavy, cache-friendly).
/// >70% Opus usage on a steady week is the single biggest cost lever
/// Throttle's audits surface — and unlike CLAUDE.md hints, the
/// `model` field is binding.
export default {
  id: "opus_default",
  severity: "medium",
  category: "cost",
  run(input) {
    const m = input?.parsedJSON?.model;
    if (typeof m !== "string") return null;
    if (!m.startsWith("claude-opus")) return null;
    return {
      rule_id: "opus_default",
      severity: "medium",
      category: "cost",
      title: "Opus set as the default model",
      quote: `"model": "${m}"`,
      message:
        "Opus bills roughly 5× Sonnet on Claude Code workloads. For 90% of code edits, Sonnet's accuracy gap is small enough that the model split alone moves your weekly cost the most. Reserve Opus for architecture sessions via `--model claude-opus-4-7` when you need it.",
      fix_hint:
        "Change the field to `\"model\": \"claude-sonnet-4-6\"` or remove it (Claude Code's default is already Sonnet). Spot-spike Opus per session via the CLI flag.",
      mac_app_can_fix: true
    };
  }
};
