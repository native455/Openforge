import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader, CostNotice } from "@/components/forge/AppHeader";
import { deleteProject, loadProjects, uid, upsertProject, type Project } from "@/lib/forge/storage";
import { starterFiles } from "@/lib/forge/template";
import { isConfigured, loadSettings } from "@/lib/forge/settings";
import { FolderOpen, Plus, Trash2, X, HardDrive } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OpenForge — Free AI website & app builder" },
      { name: "description", content: "Describe an app, review AI-proposed code, preview it live and export it. No subscriptions." },
      { property: "og:title", content: "OpenForge — Free AI website & app builder" },
      { property: "og:description", content: "Describe an app, review AI-proposed code, preview it live and export it." },
    ],
  }),
  component: Dashboard,
});

function nameFrom(prompt: string) {
  const w = prompt.trim().split(/\s+/).slice(0, 4).join(" ");
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : "Untitled project";
}

function Dashboard() {
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompt, setPrompt] = useState("");
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [onboard, setOnboard] = useState(false);

  useEffect(() => {
    setProjects(loadProjects());
    setConfigured(isConfigured(loadSettings()));
    setOnboard(localStorage.getItem("openforge.onboarded") !== "1");
    setReady(true);
  }, []);

  function create() {
    const name = nameFrom(prompt);
    const p: Project = { id: uid(), name, prompt, files: starterFiles(name, prompt), messages: [], snapshots: [], createdAt: Date.now(), updatedAt: Date.now() };
    upsertProject(p);
    nav({ to: "/builder/$projectId", params: { projectId: p.id }, search: { q: prompt && configured ? prompt : undefined } });
  }

  return (
    <div className="min-h-screen bg-forge">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10">
        {onboard && (
          <section aria-label="Getting started" className="relative mb-8 rounded-xl border border-primary/40 bg-card p-5">
            <button aria-label="Dismiss" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={() => { localStorage.setItem("openforge.onboarded", "1"); setOnboard(false); }}><X className="h-4 w-4" /></button>
            <h2 className="font-semibold">Welcome to OpenForge</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Describe what you want to build and create a project — you get a working React starter.</li>
              <li>Add your own AI key in <Link to="/settings" className="text-primary underline">AI settings</Link> to chat with a model. Without one, demo mode still lets you edit code and preview.</li>
              <li>Review every AI change before it's applied. Snapshots let you undo.</li>
              <li>Export a ZIP whenever you like. Projects are saved only in this browser.</li>
            </ol>
          </section>
        )}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">What do you want to build?</h1>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); create(); }}>
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A landing page for a neighborhood coffee roaster with a menu and opening hours…" className="min-h-28 bg-card font-mono text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) create(); }} aria-label="Project description" />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit"><Plus /> Create project</Button>
            <span className="text-xs text-muted-foreground">Ctrl/⌘ + Enter</span>
            {ready && !configured && <span className="text-xs text-muted-foreground">Demo mode: no AI provider set — you'll get the starter template. <Link to="/settings" className="text-primary underline">Set one up</Link></span>}
          </div>
          <CostNotice />
        </form>

        <section className="mt-12" aria-labelledby="recent">
          <div className="flex items-center justify-between">
            <h2 id="recent" className="text-lg font-semibold">Recent projects</h2>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><HardDrive className="h-3.5 w-3.5" /> Stored in this browser only — no cloud sync</span>
          </div>
          {ready && projects.length === 0 && (
            <div className="mt-4 rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              <FolderOpen className="mx-auto h-8 w-8" />
              <p className="mt-2">No projects yet. Describe an idea above to create your first one.</p>
            </div>
          )}
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id} className="group relative rounded-xl border border-border bg-card p-4 transition hover:shadow-glow">
                <Link to="/builder/$projectId" params={{ projectId: p.id }} search={{ q: undefined }} className="block focus-visible:outline-none">
                  <h3 className="truncate font-medium">{p.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{p.prompt || "No description"}</p>
                  <p className="mt-3 font-mono text-xs text-muted-foreground">{Object.keys(p.files).length} files · {new Date(p.updatedAt).toLocaleString()}</p>
                </Link>
                <button aria-label={`Delete ${p.name}`} className="absolute right-3 top-3 text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100"
                  onClick={() => { if (confirm(`Delete "${p.name}"? This cannot be undone.`)) { deleteProject(p.id); setProjects(loadProjects()); } }}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}