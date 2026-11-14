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
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text.trim();
}

/** Parse and validate a raw model reply into safe file changes. */
export function parseAiResponse(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(extractJson(text));
  } catch {
    return { ok: false, error: "The model did not return valid JSON." };
  }
  const parsed = aiResponseSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Response did not match the expected format: " + parsed.error.issues[0]?.message };
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