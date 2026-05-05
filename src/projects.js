import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/// Enumerate ~/.claude/projects/ subdirectories. Returns one entry per
/// project with name, absolute path, .jsonl session count, and an ISO
/// last_active timestamp derived from the newest file under that
/// project. Sorted by last_active descending so the host LLM sees the
/// most-recent project first.
///
/// `projectsDir` defaults to ~/.claude/projects but is parameterized
/// for testability. Callers from the MCP tool layer enforce sandboxing
/// before invoking this — the function itself does no path checking.
export async function listClaudeProjects(projectsDir) {
  const dir = projectsDir ?? path.join(os.homedir(), ".claude", "projects");
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projPath = path.join(dir, entry.name);
    const stats = await collectProjectStats(projPath);
    projects.push({
      name: entry.name,
      path: projPath,
      session_count: stats.sessionCount,
      last_active: stats.lastActive
    });
  }

  projects.sort((a, b) => {
    if (a.last_active === b.last_active) return a.name.localeCompare(b.name);
    return a.last_active > b.last_active ? -1 : 1;
  });
  return projects;
}

async function collectProjectStats(projPath) {
  let sessionCount = 0;
  let lastActiveMs = 0;
  try {
    const files = await fs.readdir(projPath, { withFileTypes: true });
    for (const f of files) {
      if (!f.isFile() || !f.name.endsWith(".jsonl")) continue;
      sessionCount++;
      const stat = await fs.stat(path.join(projPath, f.name));
      if (stat.mtimeMs > lastActiveMs) lastActiveMs = stat.mtimeMs;
    }
  } catch {
    // Project dir is gone or not readable — best-effort, no throw.
  }
  return {
    sessionCount,
    lastActive: lastActiveMs > 0 ? new Date(lastActiveMs).toISOString() : null
  };
}
