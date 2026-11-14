import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validatePath } from "@/lib/forge/paths";
import type { Files } from "@/lib/forge/changes";
import { FilePlus, Trash2, FileCode } from "lucide-react";
import { toast } from "sonner";

export function FileExplorer({ files, onSave, onDelete }: { files: Files; onSave: (path: string, content: string) => void; onDelete: (path: string) => void }) {
  const paths = Object.keys(files).sort();
  const [active, setActive] = useState<string>(paths.includes("/App.tsx") ? "/App.tsx" : (paths[0] ?? "/App.tsx"));
  const [draft, setDraft] = useState(files[active] ?? "");
  const [newPath, setNewPath] = useState("");
  useEffect(() => { if (!(active in files)) setActive(paths[0] ?? "/App.tsx"); }, [files]); // eslint-disable-line
  useEffect(() => setDraft(files[active] ?? ""), [active, files]);
  const dirty = draft !== (files[active] ?? "");

  function add() {
    const v = validatePath(newPath);
    if (!v.ok) { toast.error(v.reason); return; }
    if (v.path in files) { toast.error("File already exists"); return; }
    onSave(v.path, ""); setActive(v.path); setNewPath("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <div className="flex shrink-0 flex-col border-b border-border md:w-48 md:border-b-0 md:border-r">
        <ul className="max-h-40 overflow-auto p-1 md:max-h-none md:flex-1" aria-label="Project files">
          {paths.map((p) => (
            <li key={p}>
              <button onClick={() => setActive(p)} aria-current={p === active} className={`flex w-full items-center gap-1.5 truncate rounded px-2 py-1 text-left font-mono text-xs hover:bg-accent ${p === active ? "bg-accent text-primary" : "text-muted-foreground"}`}>
                <FileCode className="h-3.5 w-3.5 shrink-0" />{p.slice(1)}
              </button>
            </li>
          ))}
        </ul>
        <form className="flex gap-1 border-t border-border p-1" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <Input value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="components/New.tsx" className="h-7 font-mono text-xs" aria-label="New file path" />
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Add file"><FilePlus /></Button>
        </form>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-2 py-1">
          <span className="truncate font-mono text-xs">{active}{dirty && " •"}</span>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="secondary" className="h-7" disabled={!dirty} onClick={() => onSave(active, draft)}>Save</Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Delete ${active}`} disabled={active === "/App.tsx"} onClick={() => confirm(`Delete ${active}?`) && onDelete(active)}><Trash2 /></Button>
          </div>
        </div>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} aria-label={`Edit ${active}`}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); if (dirty) onSave(active, draft); } }}
          className="min-h-64 flex-1 resize-none bg-background p-3 font-mono text-xs leading-relaxed outline-none" />
      </div>
    </div>
  );
}