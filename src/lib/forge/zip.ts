import JSZip from "jszip";
import type { Files } from "./changes";

export async function buildZip(name: string, files: Files) {
  const zip = new JSZip();
  const root = zip.folder(name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "project")!;
  for (const [p, c] of Object.entries(files)) root.file("src" + p, c);
  root.file("README.md", `# ${name}\n\nExported from OpenForge. These are the source files from the Sandpack react-ts template.\nScaffold a Vite React-TS app, copy src/ in, add Tailwind, then run npm run dev.\n`);
  return zip.generateAsync({ type: "blob" });
}