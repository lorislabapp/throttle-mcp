#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { listClaudeProjectsTool } from "./tools/list_claude_projects.js";
import { readClaudeConfig } from "./tools/read_claude_config.js";
import { auditSettingsJsonTool } from "./tools/audit_settings_json.js";
import { auditClaudeMdTool } from "./tools/audit_claude_md.js";
import { auditHooksTool } from "./tools/audit_hooks.js";

const PathInput = z.object({ path: z.string().min(1) });
const DirInput = z.object({ dir: z.string().min(1) });
const NoInput = z.object({}).passthrough();

const TOOLS = [
  {
    name: "list_claude_projects",
    description: "Enumerate ~/.claude/projects/. Returns one entry per project with name, path, session_count, last_active. No file contents.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    schema: NoInput,
    handler: async () => listClaudeProjectsTool({})
  },
  {
    name: "read_claude_config",
    description: "Read a Claude Code config file (CLAUDE.md, settings.json, hooks/*) under the user's home. Sandboxed: refuses paths outside ~/, refuses known credential files (~/.ssh/**, ~/.aws/credentials, etc.), refuses non-UTF-8 binaries, truncates to 64 KB with a `truncated:true` flag.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Absolute path or ~-prefixed path." } },
      required: ["path"],
      additionalProperties: false
    },
    schema: PathInput,
    handler: async (args) => readClaudeConfig(args)
  },
  {
    name: "audit_settings_json",
    description: "Run Throttle's audit rules against a Claude Code settings.json. Surfaces security findings (Bash(*), Read(*)/Write(*), Bash(curl|wget:*)) and cost findings (Opus default). Each finding includes a `mac_app_can_fix` flag indicating whether Throttle's paid Mac app can apply the fix in one click.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Absolute path to a settings.json under the user's home." } },
      required: ["path"],
      additionalProperties: false
    },
    schema: PathInput,
    handler: async (args) => auditSettingsJsonTool(args)
  },
  {
    name: "audit_claude_md",
    description: "Run Throttle's audit rules against a CLAUDE.md. Surfaces excessive size (>16 KB) and external file-read directives that force a tool round-trip per session.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Absolute path to a CLAUDE.md under the user's home." } },
      required: ["path"],
      additionalProperties: false
    },
    schema: PathInput,
    handler: async (args) => auditClaudeMdTool(args)
  },
  {
    name: "audit_hooks",
    description: "Inspect a Claude Code hooks directory (typically ~/.claude/hooks) and flag missing high-value hooks. v0.1 covers session-start-router.sh — the single biggest input-token saver.",
    inputSchema: {
      type: "object",
      properties: { dir: { type: "string", description: "Absolute path to a hooks directory under the user's home." } },
      required: ["dir"],
      additionalProperties: false
    },
    schema: DirInput,
    handler: async (args) => auditHooksTool(args)
  }
];

const server = new Server(
  { name: "@lorislab/throttle-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema
  }))
}));

// Tool-output convention: the dispatcher treats a top-level `error`
// key as a tool-level failure (sets `isError: true` so MCP hosts can
// render it distinctly from a successful response). NONE of the
// success shapes returned by the 5 handlers contain a top-level
// `error` field — adding one to a future success response would
// silently flip the host into error state. If a tool ever needs an
// `error`-shaped success, switch to throwing for hard failures and
// dropping this heuristic.
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = TOOLS.find(t => t.name === request.params.name);
  if (!tool) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: "unknown_tool", name: request.params.name }) }],
      isError: true
    };
  }
  let args;
  try {
    args = tool.schema.parse(request.params.arguments ?? {});
  } catch (err) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: "invalid_input", detail: err.errors ?? String(err) }) }],
      isError: true
    };
  }
  try {
    const out = await tool.handler(args);
    return {
      content: [{ type: "text", text: JSON.stringify(out, null, 2) }],
      isError: out?.error !== undefined
    };
  } catch (err) {
    console.error(`[throttle-mcp] tool '${tool.name}' threw:`, err);
    return {
      content: [{ type: "text", text: JSON.stringify({ error: "internal", detail: String(err) }) }],
      isError: true
    };
  }
});

// Top-level error trap: a transport failure (e.g. EPIPE before init)
// otherwise surfaces as an opaque unhandled-rejection stack trace
// that gives operators no signal in Claude Desktop's MCP logs.
try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[throttle-mcp] ready (stdio)");
} catch (err) {
  console.error("[throttle-mcp] failed to start:", err);
  process.exit(1);
}
