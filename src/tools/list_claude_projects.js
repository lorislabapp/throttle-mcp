import { listClaudeProjects } from "../projects.js";

/// Tool: list_claude_projects
/// Input: {}  (the optional projectsDir is for tests only — MCP exposes
///            no input)
/// Output: { projects: [{ name, path, session_count, last_active }] }
export async function listClaudeProjectsTool(input = {}) {
  const projects = await listClaudeProjects(input.projectsDir);
  return { projects };
}
