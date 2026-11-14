import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader, CostNotice } from "@/components/forge/AppHeader";
import { deleteProject, loadProjects, uid, upsertProject, type Project } from "@/lib/forge/storage";
import { starterFiles } from "@/lib/forge/template";
import { isConfigured, loadSettings } from "@/lib/forge/settings";
import { ArrowUp, Clock3, Code2, FolderOpen, Globe2, Layers3, Plus, Sparkles, Trash2, X, HardDrive, WandSparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "OpenForge — Build anything with AI" },
    { name: "description", content: "Describe your idea, build with AI, and preview your app. No subscriptions." },
    { property: "og:title", content: "OpenForge — Build anything with AI" },
    { property: "og:description", content: "Turn your ideas into websites and apps." },
  ] }),
  component: Dashboard,
});
function nameFrom(prompt: string) {
  const w = prompt.trim().split(/\\s+/).slice(0, 4).join(" ");
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : "Untitled project";
}
const examples = [
  { icon: Globe2, label: "Business website", prompt: "Create a modern website for a local business with services, testimonials, contact details and a WhatsApp button." },
  { icon: Layers3, label: "SaaS dashboard", prompt: "Build a clean SaaS dashboard with a sidebar, analytics cards, charts and a recent activity table." },
  { icon: Code2, label: "Portfolio", prompt: "Create a professional personal portfolio with a hero section, projects, skills and contact form." },
];
function Dashboard() {
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompt, setPrompt] = useState("");
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [onboard, setOnboard] = useState(false);
  useEffect(() => {
    setProjects(loadProjects()); setConfigured(isConfigured(loadSettings()));
    setOnboard(localStorage.getItem("openforge.onboarded") !== "1"); setReady(true);
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
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        {onboard && <section aria-label="Getting started" className="relative mx-auto mb-8 max-w-3xl rounded-2xl border border-primary/20 bg-white p-5 shadow-sm">
          <button aria-label="Dismiss" className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-secondary" onClick={() => { localStorage.setItem("openforge.onboarded", "1"); setOnboard(false); }}><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Welcome to OpenForge</div>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 pr-5 text-sm leading-relaxed text-muted-foreground">
            <li>Describe what you want to build and start with a working React project.</li>
            <li>Add your own AI provider key in <Link to="/settings" className="font-medium text-primary underline">AI settings</Link> to generate changes through chat.</li>
            <li>Review changes before applying them, then preview and export your project.</li>
            <li>Projects are currently saved in this browser only.</li>
          </ol>
        </section>}
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1.5 text-xs font-medium text-primary shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Your ideas, brought to life
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl md:text-6xl">What will you <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">create</span> today?</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">Describe your idea. OpenForge helps you turn it into a website or app you can shape, preview and export.</p>
          <form className="mt-9 rounded-2xl border border-border/90 bg-white p-3 text-left shadow-[0_18px_60px_-35px_rgba(53,35,100,0.32)] transition focus-within:border-primary/40 focus-within:shadow-[0_18px_60px_-28px_rgba(98,63,180,0.28)] sm:p-4" onSubmit={(e) => { e.preventDefault(); create(); }}>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the website or app you want to build..." className="min-h-28 resize-y border-0 bg-transparent px-2 py-2 text-base leading-relaxed shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0" aria-label="Project description" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) create(); }} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
              <div className="flex items-center gap-2 pl-1 text-xs text-muted-foreground"><WandSparkles className="h-4 w-4 text-primary" /> Start with a description</div>
              <Button type="submit" disabled={!prompt.trim()} className="gap-2 rounded-xl px-5 shadow-sm"><span>Start building</span><ArrowUp className="h-4 w-4" /></Button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {examples.map(({ icon: Icon, label, prompt: sample }) => <button key={label} type="button" onClick={() => setPrompt(sample)} className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/75 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:bg-white hover:text-foreground"><Icon className="h-3.5 w-3.5 text-primary" />{label}</button>)}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> No subscription</span>
            <span className="inline-flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5" /> Export your code</span>
            <span className="inline-flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5" /> Live preview</span>
          </div>
          <div className="mx-auto mt-4 max-w-2xl text-left"><CostNotice />{ready && !configured && <p className="mt-2 text-xs text-muted-foreground">AI chat is not configured yet. <Link to="/settings" className="font-medium text-primary underline">Connect an AI provider</Link>; you can still create and edit starter projects.</p>}</div>
        </section>
        <section className="mt-16" aria-labelledby="recent">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Clock3 className="h-3.5 w-3.5" /> Your workspace</div><h2 id="recent" className="mt-1 text-xl font-semibold tracking-tight">Recent projects</h2></div>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><HardDrive className="h-3.5 w-3.5" /> Saved in this browser</span>
          </div>
          {ready && projects.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-white/60 px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent text-primary"><FolderOpen className="h-5 w-5" /></span><p className="mt-4 font-medium">Your workspace is ready</p><p className="mt-1 text-sm text-muted-foreground">Your projects will appear here when you start building.</p></div>}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => <li key={p.id} className="group relative overflow-hidden rounded-2xl border border-border/80 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
              <Link to="/builder/$projectId" params={{ projectId: p.id }} search={{ q: undefined }} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
                <div className={`mb-4 flex h-28 items-center justify-center overflow-hidden rounded-xl ${i % 3 === 0 ? "bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-100" : i % 3 === 1 ? "bg-gradient-to-br from-sky-100 via-blue-50 to-violet-100" : "bg-gradient-to-br from-amber-100 via-rose-50 to-fuchsia-100"}`}><div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/80 bg-white/75 text-primary shadow-sm"><Code2 className="h-5 w-5" /></div></div>
                <h3 className="truncate pr-8 font-semibold">{p.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-muted-foreground">{p.prompt || "A new OpenForge project"}</p>
                <p className="mt-4 font-mono text-[11px] text-muted-foreground">{Object.keys(p.files).length} files · Updated {new Date(p.updatedAt).toLocaleDateString()}</p>
              </Link>
              <button aria-label={`Delete ${p.name}`} className="absolute right-4 top-4 rounded-lg bg-white/90 p-2 text-muted-foreground opacity-70 shadow-sm transition hover:text-destructive group-hover:opacity-100" onClick={() => { if (confirm(`Delete "${p.name}"? This cannot be undone.`)) { deleteProject(p.id); setProjects(loadProjects()); } }}><Trash2 className="h-4 w-4" /></button>
            </li>)}
          </ul>
        </section>
      </main>
    </div>
  );
}