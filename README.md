# Throttle MCP

Audit your Claude Code config — `CLAUDE.md`, `settings.json`, hooks — from any MCP host.

Free, local, no telemetry. The audit logic comes from [Throttle](https://lorislab.fr/throttle), the macOS menu-bar app that ships the same rules with one-click apply + atomic backup + rollback. The MCP version is read + analyze only.

## Install

Add to your Claude Desktop / Cursor / Cline / Claude Code MCP config:

```json
{
  "mcpServers": {
    "throttle": {
      "command": "npx",
      "args": ["-y", "@lorislab/throttle-mcp"]
    }
  }
}
```

That's it. The host downloads the package on first use; no global install needed.

## Tools

| Tool | What it does |
|---|---|
| `list_claude_projects` | Enumerate `~/.claude/projects/` — one entry per project with name, path, session count, last active. |
| `read_claude_config` | Read a Claude Code config file (sandboxed to `~/`, refuses credential files, 64 KB cap). |
| `audit_settings_json` | Run 4 rules against a `settings.json`: `bash_wildcard`, `read_write_wildcard`, `curl_unscoped`, `opus_default`. |
| `audit_claude_md` | Run 2 rules against a `CLAUDE.md`: `claude_md_size`, `claude_md_external_ref`. |
| `audit_hooks` | Inspect a hooks directory and flag missing high-value hooks. v0.1 covers `session-start-router.sh`. |

## Findings

Every finding has the same shape:

```ts
{
  rule_id: string,
  severity: "high" | "medium" | "low",
  category: "security" | "cost" | "hygiene",
  title: string,
  quote?: string,
  message: string,
  fix_hint: string,
  mac_app_can_fix: boolean
}
```

`mac_app_can_fix: true` means [Throttle's paid Mac app](https://lorislab.fr/throttle) can apply the fix in one click with atomic backup + rollback. The MCP version is read-only — it reports, your host LLM (or you) decide what to do.

## v0.1 ruleset

| `rule_id` | severity | mac_app_can_fix |
|---|---|---|
| `bash_wildcard` | high (security) | yes |
| `read_write_wildcard` | high (security) | yes |
| `curl_unscoped` | high (security) | yes |
| `opus_default` | medium (cost) | yes |
| `claude_md_size` | medium (cost) | — |
| `claude_md_external_ref` | low (cost) | — |
| `no_session_start_router` | medium (cost) | yes |

v0.2 will widen the ruleset based on real-world usage. PRs welcome.

## Privacy

- **No network calls.** Reads local files, returns analysis. Same posture as the Mac app.
- **No telemetry.** Your host's logs are the only record.
- **Sandboxed reads.** `read_claude_config` refuses paths outside `~/`, refuses known credential files (`~/.ssh/**`, `~/.aws/credentials`, `~/.config/git/credentials`, `~/.netrc`, `~/.npmrc`, `~/Downloads/AuthKey_*.p8`), refuses non-UTF-8 binaries, truncates >64 KB with a `truncated:true` flag.

## Develop

```bash
git clone https://github.com/lorislabapp/throttle-mcp.git
cd throttle-mcp
npm install
npm test
```

Every rule is a single file under `src/audit/rules/`. Adding a new rule is: create the file, add the test, register it in the relevant tool. No central registry edit.

## Throttle Pro

Throttle's paid Mac app applies these fixes for you. Side-by-side diff per finding, atomic write with `.bak.<ts>` backups, one-click rollback in the Optimizer tab, plus a Project window with per-project stats and an AI assistant that drives the audit interactively. €19 launch / €29 stable, 30-day refund, 3-Mac license. [lorislab.fr/throttle](https://lorislab.fr/throttle).

## License

MIT.
