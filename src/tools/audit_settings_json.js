import { safeReadFile } from "../sandbox.js";
import { runRules } from "../audit/runner.js";
import bashWildcard from "../audit/rules/bash_wildcard.js";
import readWriteWildcard from "../audit/rules/read_write_wildcard.js";
import curlUnscoped from "../audit/rules/curl_unscoped.js";
import opusDefault from "../audit/rules/opus_default.js";

const RULES = [bashWildcard, readWriteWildcard, curlUnscoped, opusDefault];

/// Tool: audit_settings_json
/// Input: { path: string }
/// Output: { findings: Finding[], scanned: { rules_evaluated } } | { error }
export async function auditSettingsJsonTool({ path }) {
  const read = await safeReadFile(path);
  if (read.error) return { error: read.error };
  let parsed;
  try {
    parsed = JSON.parse(read.content);
  } catch (e) {
    // Surface the parser message so the host (or Mac app) can compute
    // a line/col from the byte offset Node embeds in the message.
    return { error: "parse_error", detail: String(e?.message ?? e) };
  }
  const findings = runRules(RULES, {
    parsedJSON: parsed,
    rawText: read.content,
    path
  });
  return {
    findings,
    scanned: { rules_evaluated: RULES.length }
  };
}
