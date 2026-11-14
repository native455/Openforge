import { describe, expect, it } from "vitest";
import { validatePath } from "@/lib/forge/paths";
import { parseAiResponse } from "@/lib/forge/schema";
import { applyProposal, type Proposal } from "@/lib/forge/changes";
import { loadProjects, upsertProject, deleteProject, getProject, withSnapshot, MAX_SNAPSHOTS, type Project } from "@/lib/forge/storage";

describe("validatePath", () => {
  it("normalises valid paths", () => expect(validatePath("components/A.tsx")).toEqual({ ok: true, path: "/components/A.tsx" }));
  it.each(["../etc/passwd.ts", "/a/../b.tsx", ".env", "/node_modules/x.js", "run.sh", "", "https://x.com/a.ts"])("rejects %s", (p) =>
    expect(validatePath(p).ok).toBe(false));
});

describe("parseAiResponse", () => {
  it("parses fenced JSON and filters unsafe changes", () => {
    const r = parseAiResponse('Sure!\n```json\n{"summary":"x","changes":[{"action":"update","path":"App.tsx","content":"a"},{"action":"create","path":"../x.ts","content":"b"},{"action":"update","path":"/package.json","content":"{}"}]}\n```');
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.changes.map((c) => c.path)).toEqual(["/App.tsx"]); expect(r.rejected).toHaveLength(2); }
  });
  it("fails on invalid JSON", () => expect(parseAiResponse("hello").ok).toBe(false));
  it("fails on wrong shape", () => expect(parseAiResponse('{"summary":"x","changes":[{"action":"nuke","path":"/a.ts"}]}').ok).toBe(false));
});

describe("approval flow", () => {
  const base = (status: Proposal["status"]): Proposal => ({ id: "p", summary: "s", rejected: [], status,
    changes: [{ action: "update", path: "/App.tsx", content: "new" }, { action: "delete", path: "/old.ts" }] });
  it("applies a pending proposal without mutating input", () => {
    const files = { "/App.tsx": "old", "/old.ts": "x" };
    expect(applyProposal(files, base("pending"))).toEqual({ "/App.tsx": "new" });
    expect(files["/App.tsx"]).toBe("old");
  });
  it("refuses non-pending proposals", () => {
    expect(() => applyProposal({}, base("applied"))).toThrow();
    expect(() => applyProposal({}, base("rejected"))).toThrow();
  });
});

describe("local persistence", () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
  const proj = (id: string): Project => ({ id, name: id, prompt: "", files: { "/App.tsx": "a" }, messages: [], snapshots: [], createdAt: 0, updatedAt: 0 });
  it("saves, loads and deletes projects", () => {
    const s = mem();
    upsertProject(proj("a"), s); upsertProject(proj("b"), s);
    expect(loadProjects(s)).toHaveLength(2);
    expect(getProject("a", s)?.files["/App.tsx"]).toBe("a");
    deleteProject("a", s);
    expect(loadProjects(s).map((p) => p.id)).toEqual(["b"]);
  });
  it("survives corrupt storage", () => { const s = mem(); s.setItem("openforge.projects.v1", "{bad"); expect(loadProjects(s)).toEqual([]); });
  it("caps snapshots", () => {
    let p = proj("a");
    for (let i = 0; i < MAX_SNAPSHOTS + 5; i++) p = withSnapshot(p, String(i));
    expect(p.snapshots).toHaveLength(MAX_SNAPSHOTS);
    expect(p.snapshots[0].label).toBe(String(MAX_SNAPSHOTS + 4));
  });
});