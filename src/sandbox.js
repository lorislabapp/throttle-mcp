import os from "node:os";
import path from "node:path";

/// Resolve a `~`-prefixed or absolute path. Returns null for relative
/// paths — the MCP layer should reject those at the schema level too.
export function expandHome(p) {
  if (typeof p !== "string" || p.length === 0) return null;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  if (path.isAbsolute(p)) return p;
  return null;
}

/// Strictly true when `p` resolves under the user's home directory.
/// Caller is expected to have already resolved symlinks via
/// fs.realpath. We check after normalization to defeat `..` traversal.
export function isInsideHome(p) {
  if (typeof p !== "string") return false;
  const home = os.homedir();
  const normalized = path.resolve(p);
  return normalized === home || normalized.startsWith(home + path.sep);
}

/// True when `p` matches a known credential file. Belt-and-suspenders
/// against host-side prompt injection — the user's `~/` is otherwise
/// fully readable.
export function isCredentialPath(p) {
  if (typeof p !== "string") return false;
  const home = os.homedir();
  const sep = path.sep;
  // Anything under ~/.ssh/
  if (p === path.join(home, ".ssh") || p.startsWith(path.join(home, ".ssh") + sep)) return true;
  // ~/.aws/credentials and ~/.aws/config
  if (p === path.join(home, ".aws", "credentials")) return true;
  if (p === path.join(home, ".aws", "config")) return true;
  // ~/.config/git/credentials (NOT ~/.config/git/config which is not secret)
  if (p === path.join(home, ".config", "git", "credentials")) return true;
  // ~/.netrc, ~/.npmrc
  if (p === path.join(home, ".netrc")) return true;
  if (p === path.join(home, ".npmrc")) return true;
  // ~/Downloads/AuthKey_*.p8
  const downloads = path.join(home, "Downloads") + sep;
  if (p.startsWith(downloads)) {
    const base = path.basename(p);
    if (/^AuthKey_.+\.p8$/.test(base)) return true;
  }
  return false;
}
