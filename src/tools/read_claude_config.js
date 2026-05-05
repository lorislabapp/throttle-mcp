import { safeReadFile } from "../sandbox.js";

/// Tool: read_claude_config
/// Input: { path: string }  (absolute or ~-prefixed)
/// Output: { path, content, bytes, truncated } | { error }
export async function readClaudeConfig({ path: rawPath }) {
  const result = await safeReadFile(rawPath);
  if (result.error) return { error: result.error };
  return {
    path: rawPath,
    content: result.content,
    bytes: result.bytes,
    truncated: result.truncated
  };
}
