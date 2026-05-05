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

import fs from "node:fs/promises";
import { isUtf8 } from "node:buffer";

const MAX_BYTES = 64 * 1024;

/// Safely read a file under the user's home directory.
/// Returns { content, bytes, truncated } on success, or { error } on
/// any sandbox / decode / not-found failure. Never throws.
///
/// Order of checks (so a missing credential-named file still denies):
///   1. expandHome -> expanded
///   2. isCredentialPath(expanded) — pre-realpath, catches non-existent
///      credential paths so the deny-list doesn't shadow into not_found
///   3. fs.realpath(expanded) — resolves symlinks
///   4. isInsideHome(real) — defeats symlinks pointing outside home
///   5. isCredentialPath(real) — defeats symlinks into credentials
///   6. fs.stat -> must be a regular file
///   7. read up to MAX_BYTES, check isUtf8 (from node:buffer), return result
export async function safeReadFile(rawPath) {
  const expanded = expandHome(rawPath);
  if (!expanded) return { error: "invalid_path" };

  if (isCredentialPath(expanded)) return { error: "credential_path_denied" };

  let real;
  try {
    real = await fs.realpath(expanded);
  } catch (e) {
    if (e && e.code === "ENOENT") return { error: "not_found" };
    return { error: "stat_failed", detail: String(e) };
  }

  if (!isInsideHome(real)) return { error: "outside_home" };
  if (isCredentialPath(real)) return { error: "credential_path_denied" };

  let stat;
  try {
    stat = await fs.stat(real);
  } catch {
    return { error: "stat_failed" };
  }
  if (!stat.isFile()) return { error: "not_a_file" };

  const totalBytes = stat.size;
  const handle = await fs.open(real, "r");
  try {
    const readLen = Math.min(totalBytes, MAX_BYTES);
    const buffer = Buffer.alloc(readLen);
    await handle.read(buffer, 0, readLen, 0);

    if (typeof isUtf8 === "function" && !isUtf8(buffer)) {
      return { error: "binary_or_invalid_utf8" };
    }
    const content = buffer.toString("utf8");
    return {
      content,
      bytes: totalBytes,
      truncated: totalBytes > MAX_BYTES
    };
  } finally {
    await handle.close();
  }
}
