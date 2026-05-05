/// Flag the absence of session-start-router.sh. The router is the
/// single biggest input-token saver Throttle ships: it routes only
/// the project-relevant memory into the session prelude instead of
/// the full ~/.claude/CLAUDE.md every time. Without it, every project
/// pays the full home CLAUDE.md in tokens per session.
export default {
  id: "no_session_start_router",
  severity: "medium",
  category: "cost",
  run(input) {
    const present = Array.isArray(input?.hooksPresent) ? input.hooksPresent : [];
    if (present.includes("session-start-router.sh")) return null;
    return {
      rule_id: "no_session_start_router",
      severity: "medium",
      category: "cost",
      title: "session-start-router.sh missing",
      quote: `~/.claude/hooks/session-start-router.sh not found`,
      message:
        "Without the session-start router, every Claude Code session prepends your full ~/.claude/CLAUDE.md in input tokens, even when the active project has no use for the global content. The router emits only the slice that matches the current working directory — typically a 60–80% reduction on the always-loaded prelude.",
      fix_hint:
        "Drop a session-start-router.sh into ~/.claude/hooks/ that reads ~/.claude/memory-routing.json and emits only the entries whose path prefix matches the current CWD. Throttle's Mac app generates the router + a starter routing config in one click via the Optimizer tab.",
      mac_app_can_fix: true
    };
  }
};
