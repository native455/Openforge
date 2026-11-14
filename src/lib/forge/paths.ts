export const ALLOWED_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".css", ".json", ".html", ".md", ".svg", ".txt"];
export const PROTECTED_FILES = ["/package.json"];
export const MAX_FILE_BYTES = 200_000;

export type PathCheck = { ok: true; path: string } | { ok: false; reason: string };

/** Normalise and validate a project file path. Returns a leading-slash path. */
export function validatePath(raw: unknown): PathCheck {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, reason: "Path is empty" };
  const p = raw.trim().replace(/\\/g, "/");
  if (/[\0<>:"|?*]/.test(p)) return { ok: false, reason: "Path has invalid characters" };
  if (/^[a-z]+:\/\//i.test(p)) return { ok: false, reason: "URLs are not file paths" };
  const parts = p.split("/").filter(Boolean);
  if (parts.length === 0) return { ok: false, reason: "Path is empty" };
  if (parts.some((s) => s === ".." || s === ".")) return { ok: false, reason: "Relative segments are not allowed" };
  if (parts.some((s) => s.startsWith("."))) return { ok: false, reason: "Hidden files are not allowed" };
  if (parts.includes("node_modules")) return { ok: false, reason: "node_modules is not editable" };
  if (parts.length > 8) return { ok: false, reason: "Path is nested too deeply" };
  const path = "/" + parts.join("/");
  const name = parts[parts.length - 1] ?? "";
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) return { ok: false, reason: `File type "${ext || "none"}" is not allowed` };
  return { ok: true, path };
}