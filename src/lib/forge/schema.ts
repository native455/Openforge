import { z } from "zod";
import { MAX_FILE_BYTES, PROTECTED_FILES, validatePath } from "./paths";

export const fileChangeSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["create", "update"]), path: z.string(), content: z.string() }),
  z.object({ action: z.literal("delete"), path: z.string() }),
]);
export const aiResponseSchema = z.object({
  summary: z.string().min(1).max(4000),
  changes: z.array(fileChangeSchema).max(30),
});
export type FileChange = z.infer<typeof fileChangeSchema>;
export type AiResponse = z.infer<typeof aiResponseSchema>;

export type ParseResult =
  | { ok: true; summary: string; changes: FileChange[]; rejected: { path: string; reason: string }[] }
  | { ok: false; error: string };

function extractJson(text: string): string {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  // Prefer a JSON-labelled fence, but don't mistake code fences inside a response for the outer payload.
  const fenced = trimmed.match(/^\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`$/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  if (start < 0) return trimmed;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return trimmed.slice(start, i + 1);
  }
  // Keep the incomplete object so the caller can report a parse failure cleanly.
  return trimmed.slice(start);
}

/**
 * Models sometimes emit literal line breaks or tabs inside JSON string values
 * (especially when serialising source code). Escape those control characters
 * without changing valid JSON or characters outside strings.
 */
function repairJsonStrings(source: string): string {
  let output = "";
  let inString = false;
  let escaped = false;
  for (const ch of source) {
    if (inString) {
      if (escaped) {
        output += ch;
        escaped = false;
      } else if (ch === "\\") {
        output += ch;
        escaped = true;
      } else if (ch === '"') {
        output += ch;
        inString = false;
      } else if (ch === "\n") output += "\\n";
      else if (ch === "\r") output += "\\r";
      else if (ch === "\t") output += "\\t";
      else output += ch;
    } else {
      output += ch;
      if (ch === '"') inString = true;
    }
  }
  // Remove trailing commas before a closing object or array, but only outside strings.
  let cleaned = "";
  inString = false;
  escaped = false;
  for (let i = 0; i < output.length; i++) {
    const ch = output[i];
    if (inString) {
      cleaned += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; cleaned += ch; continue; }
    if (ch === ",") {
      let next = i + 1;
      while (next < output.length && /\s/.test(output[next])) next++;
      if (output[next] === "}" || output[next] === "]") continue;
    }
    cleaned += ch;
  }
  return cleaned;
}

/** Parse and validate a raw model reply into safe file changes. */
export function parseAiResponse(text: string): ParseResult {
  let data: unknown;
  const candidate = extractJson(text);
  try {
    data = JSON.parse(candidate);
  } catch {
    try {
      data = JSON.parse(repairJsonStrings(candidate));
    } catch {
      return { ok: false, error: "The AI response was incomplete or malformed. Please try again; your existing project files are unchanged." };
    }
  }
  const parsed = aiResponseSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "The AI response did not match the required website-change format: " + parsed.error.issues[0]?.message };
  const changes: FileChange[] = [];
  const rejected: { path: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const c of parsed.data.changes) {
    const v = validatePath(c.path);
    if (!v.ok) { rejected.push({ path: c.path, reason: v.reason }); continue; }
    if (PROTECTED_FILES.includes(v.path)) { rejected.push({ path: v.path, reason: "Protected file" }); continue; }
    if (seen.has(v.path)) { rejected.push({ path: v.path, reason: "Duplicate change" }); continue; }
    if (c.action !== "delete" && c.content.length > MAX_FILE_BYTES) { rejected.push({ path: v.path, reason: "File too large" }); continue; }
    seen.add(v.path);
    changes.push({ ...c, path: v.path });
  }
  return { ok: true, summary: parsed.data.summary, changes, rejected };
}
