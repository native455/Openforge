import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader, CostNotice } from "@/components/forge/AppHeader";
import { deleteProject, loadProjects, uid, upsertProject, type Project } from "@/lib/forge/storage";
import { starterFiles } from "@/lib/forge/template";
import { getAiStatus } from "@/lib/forge/ai";
import { ArrowUp, Clock3, Code2, FolderOpen, Globe2, Layers3, Sparkles, Trash2, X, HardDrive, WandSparkles, Plus, Search, ChevronRight, Monitor, Zap, Rocket, Settings2, LayoutDashboard, PanelLeft, CircleHelp } from "lucide-react";

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
  const cleaned = prompt.trim().replace(/^(please\\s+)?(create|build|make|design|develop|add)\\s+/i, "").replace(/\\b(a|an|the|website|web app|app|for|to|that)\\b/gi, " ").replace(/\\s+/g, " ").trim();
  const words = cleaned.split(" ").filter(Boolean).slice(0, 3);
  const w = words.join(" ");
  return w ? w.charAt(0).toUpperCase() + w.slice(1) : "New website";
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
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [onboard, setOnboard] = useState(false);
  const [search, setSearch] = useState("");
  useEffect(() => {
    setProjects(loadProjects()); getAiStatus().then((s) => setAiReady(s.configured)).catch(() => setAiReady(false));
    setOnboard(localStorage.getItem("openforge.onboarded") !== "1"); setReady(true);
  }, []);
  function create() {
    if (!prompt.trim()) return;
    const name = nameFrom(prompt);
    const p: Project = { id: uid(), name, prompt, files: starterFiles(name, prompt), messages: [], snapshots: [], createdAt: Date.now(), updatedAt: Date.now() };
    upsertProject(p);
    nav({ to: "/builder/$projectId", params: { projectId: p.id }, search: { q: prompt || undefined } });
  }
  const filtered = projects.filter(p => (p.name + " " + p.prompt).toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-100">
      <AppHeader />
      <aside className="fixed bottom-0 left-0 top-[68px] z-30 hidden w-[224px] flex-col border-r border-white/[0.07] bg-[#0e1118] px-4 py-6 xl:flex">
        <div className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Workspace</div>
        <Link to="/" activeOptions={{ exact: true }} className="mb-1 flex items-center gap-3 rounded-xl bg-violet-500/[0.12] px-3 py-3 text-sm font-semibold text-violet-200"><LayoutDashboard className="h-4 w-4"/> Overview</Link>
        <Link to="/deploy" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.05] hover:text-white"><Rocket className="h-4 w-4"/> Publish</Link>
        <Link to="/settings" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.05] hover:text-white"><Settings2 className="h-4 w-4"/> AI engine</Link>
        <div className="mt-8 px-3 pb-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Your workspace</div>
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><span className="h-2 w-2 rounded-full bg-emerald-400"/> OpenForge ready</div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">Create, refine and export your projects from one place.</p>
        </div>
        <div className="mt-auto flex items-center gap-2 px-3 text-[11px] text-slate-600"><CircleHelp className="h-3.5 w-3.5"/> Built for ideas that ship</div>
      </aside>
      <main className="mx-auto max-w-[1320px] px-4 pb-20 pt-7 sm:px-7 lg:px-10 xl:ml-[224px]">
        {onboard && <section aria-label="Getting started" className="relative mx-auto mb-7 max-w-4xl rounded-2xl border border-violet-400/20 bg-violet-500/[0.08] p-5">
          <button aria-label="Dismiss" className="absolute right-4 top-4 rounded-md p-1 text-slate-400 hover:bg-white/10" onClick={() => { localStorage.setItem("openforge.onboarded", "1"); setOnboard(false); }}><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-violet-300" /> Welcome to your OpenForge workspace</div>
          <ol className="mt-3 list-decimal space-y-1 pl-5 pr-5 text-sm text-slate-400">
            <li>Describe your idea and OpenForge will create a React project.</li><li>The shared AI engine is already handled — no personal API key is required.</li><li>Review changes, preview your work and export your project.</li><li>Projects are currently saved in this browser only.</li>
          </ol>
        </section>}
        <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[linear-gradient(135deg,#171827_0%,#11141d_52%,#111a28_100%)] px-5 py-10 shadow-[0_30px_100px_-55px_rgba(124,58,237,.5)] sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-24 -top-36 h-[430px] w-[430px] rounded-full bg-violet-600/15 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-52 left-1/3 h-[350px] w-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
          <div className="relative mx-auto max-w-[850px] text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-violet-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" /> Your AI-powered creative workspace</div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.06] tracking-[-.055em] text-white sm:text-5xl md:text-[64px]">From idea to <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-blue-300 bg-clip-text text-transparent">website.</span><br className="hidden sm:block" /> All in one workspace.</h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">Describe what you have in mind. OpenForge plans the experience, builds the interface and gives you a live preview you can refine.</p>
            <form className="mx-auto mt-9 max-w-[760px] rounded-2xl border border-white/[0.13] bg-[#0b0e15] p-3 text-left shadow-[0_18px_60px_-25px_rgba(0,0,0,.8)] transition focus-within:border-violet-400/50 focus-within:shadow-[0_0_0_4px_rgba(139,92,246,.08)] sm:p-4" onSubmit={(e) => { e.preventDefault(); create(); }}>
              <Textarea id="project-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the website or app you want to create..." className="min-h-28 resize-y border-0 bg-transparent px-2 py-2 text-[15px] leading-relaxed text-white shadow-none placeholder:text-slate-600 focus-visible:ring-0" aria-label="Project description" onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) create(); }} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-3">
                <div className="flex items-center gap-2 pl-1 text-xs text-slate-500"><WandSparkles className="h-4 w-4 text-violet-300" /> AI-assisted build <span className="text-slate-700">·</span> No API key needed</div>
                <Button type="submit" disabled={!prompt.trim()} className="h-10 gap-2 rounded-xl bg-violet-500 px-5 font-semibold text-white shadow-[0_8px_24px_-10px_rgba(139,92,246,.9)] hover:bg-violet-400"><span>Start building</span><ArrowUp className="h-4 w-4" /></Button>
              </div>
            </form>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {examples.map(({ icon: Icon, label, prompt: sample }) => <button key={label} type="button" onClick={() => setPrompt(sample)} className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.035] px-3.5 py-2 text-xs font-medium text-slate-400 transition hover:border-violet-300/30 hover:bg-violet-400/[0.08] hover:text-white"><Icon className="h-3.5 w-3.5 text-violet-300" />{label}</button>)}
            </div>
          </div>
          <div className="relative mx-auto mt-11 grid max-w-[760px] grid-cols-3 gap-2 border-t border-white/[0.08] pt-6 sm:gap-8">
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 sm:text-xs"><Zap className="h-4 w-4 text-violet-300" /> Autonomous building</div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 sm:text-xs"><Monitor className="h-4 w-4 text-violet-300" /> Live preview</div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 sm:text-xs"><Code2 className="h-4 w-4 text-violet-300" /> Export your code</div>
          </div>
        </section>
        <section className="mt-12" aria-labelledby="recent">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.07] pb-5">
            <div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-violet-300"><Clock3 className="h-3.5 w-3.5" /> Workspace</div><h2 id="recent" className="mt-2 text-2xl font-semibold tracking-[-.035em] text-white">Your projects <span className="ml-1 text-base font-normal text-slate-600">{projects.length}</span></h2><p className="mt-1 text-sm text-slate-500">Pick up where you left off.</p></div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              {projects.length > 0 && <div className="relative flex-1 sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects..." className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-400/50" /></div>}
              <button onClick={()=>document.getElementById("project-prompt")?.focus()} className="hidden h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-medium text-slate-300 transition hover:bg-white/[0.06] sm:flex"><Plus className="h-4 w-4" /> New project</button>
            </div>
          </div>
          {ready && projects.length === 0 && <div className="rounded-2xl border border-dashed border-white/[0.13] bg-white/[0.02] px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-violet-300"><FolderOpen className="h-6 w-6" /></span><p className="mt-4 font-medium text-white">Your workspace is ready</p><p className="mt-1 text-sm text-slate-500">Your first project will appear here after you start building.</p><button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200">Create your first project <ChevronRight className="h-4 w-4" /></button></div>}
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p, i) => <li key={p.id} className="group relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#11141c] transition duration-200 hover:-translate-y-1 hover:border-violet-400/30 hover:shadow-[0_18px_55px_-30px_rgba(139,92,246,.35)]">
              <Link to="/builder/$projectId" params={{ projectId: p.id }} search={{ q: undefined }} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
                <div className="relative m-3 mb-0 flex h-40 items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-[#171b28]">
                  <div className={`absolute inset-0 opacity-70 ${i%3===0?"bg-[radial-gradient(ellipse_at_30%_20%,rgba(139,92,246,.3),transparent_55%)]":i%3===1?"bg-[radial-gradient(ellipse_at_70%_20%,rgba(14,165,233,.25),transparent_55%)]":"bg-[radial-gradient(ellipse_at_40%_20%,rgba(236,72,153,.22),transparent_55%)]"}`} />
                  <div className="relative w-[72%] rounded-lg border border-white/10 bg-[#0d1018] p-3 shadow-2xl"><div className="mb-3 flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-400/80"/><span className="h-1.5 w-1.5 rounded-full bg-amber-300/80"/><span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80"/><span className="ml-2 h-1.5 w-10 rounded-full bg-white/10"/></div><div className="h-2 w-2/3 rounded-full bg-white/65"/><div className="mt-2 h-1.5 w-1/2 rounded-full bg-white/20"/><div className="mt-4 grid grid-cols-3 gap-2"><div className="h-10 rounded bg-violet-400/20"/><div className="h-10 rounded bg-white/[0.06]"/><div className="h-10 rounded bg-white/[0.06]"/></div></div>
                  <span className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-slate-400"><Monitor className="mr-1 inline h-3 w-3"/> Preview</span>
                </div>
                <div className="p-4"><h3 className="truncate pr-8 text-sm font-semibold text-white">{p.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-xs leading-relaxed text-slate-500">{p.prompt || "A new OpenForge project"}</p><p className="mt-4 flex items-center gap-2 font-mono text-[10px] text-slate-600"><Code2 className="h-3 w-3"/>{Object.keys(p.files).length} files <span>·</span> Updated {new Date(p.updatedAt).toLocaleDateString()}</p></div>
              </Link>
              <button aria-label={`Delete ${p.name}`} className="absolute right-6 top-6 rounded-lg border border-white/10 bg-[#0b0d12]/80 p-2 text-slate-400 opacity-0 shadow-sm transition hover:border-rose-400/30 hover:text-rose-300 group-hover:opacity-100" onClick={() => { if (confirm(`Delete "${p.name}"? This cannot be undone.`)) { deleteProject(p.id); setProjects(loadProjects()); } }}><Trash2 className="h-4 w-4" /></button>
            </li>)}
          </ul>
          {ready && projects.length>0 && filtered.length===0 && <p className="rounded-xl border border-white/10 py-10 text-center text-sm text-slate-500">No projects match that search.</p>}
        </section>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5"><CostNotice/><span className="text-[11px] text-slate-600"><HardDrive className="mr-1 inline h-3 w-3"/> Saved in this browser</span></div>
      </main>
    </div>
  );
}