import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/forge/AppHeader";
import { ProposalCard } from "@/components/forge/ProposalCard";
import { FileExplorer } from "@/components/forge/FileExplorer";
import { getProject, uid, upsertProject, withSnapshot, type ChatMessage, type Project } from "@/lib/forge/storage";
import { applyProposal, type Proposal } from "@/lib/forge/changes";
import { parseAiResponse } from "@/lib/forge/schema";
import { getAiStatus, requestChanges } from "@/lib/forge/ai";
import { buildZip } from "@/lib/forge/zip";
import { Download, History, Loader2, Send, Undo2, Square, Sparkles, MonitorPlay, Code2, CircleDot } from "lucide-react";

const Preview = lazy(() => import("@/components/forge/Preview"));

export const Route = createFileRoute("/builder/$projectId")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : undefined }),
  head: () => ({
    meta: [
      { title: "Builder — OpenForge" },
      { name: "description", content: "Chat with an AI model, approve code changes and preview your app live." },
      { property: "og:title", content: "Builder — OpenForge" },
      { property: "og:description", content: "Chat, approve changes and preview live." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Builder,
});

type Tab = "chat" | "preview" | "code";

function Builder() {
  const { projectId } = Route.useParams();
  const { q } = Route.useSearch();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoSent = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setProject(getProject(projectId)); getAiStatus().then((s) => setAiReady(s.configured)).catch(() => setAiReady(false)); }, [projectId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [project?.messages.length, busy]);


  function commit(p: Project) { setProject(p); upsertProject(p); }

  async function send(text: string) {
    if (!project || aiReady !== true || !text.trim() || busy) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, at: Date.now() };
    let p: Project = { ...project, messages: [...project.messages, userMsg] };
    commit(p); setInput(""); setBusy(true);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const history = project.messages.filter((m) => m.role !== "system").map((m) => ({
        role: m.role,
        content: m.proposal ? `[Proposal ${m.proposal.status}] ${m.proposal.summary}` : m.content,
      }));
      const raw = await requestChanges({ projectName: project.name, originalBrief: project.prompt, files: project.files, history, prompt: text }, ctrl.signal);
      const parsed = parseAiResponse(raw);
      let msg: ChatMessage;
      if (!parsed.ok) {
        msg = { id: uid(), role: "system", content: parsed.error + " Try rephrasing, or use a stronger model.", at: Date.now() };
      } else {
        // Ignore no-op edits so the assistant cannot ask the user to apply code that is already present.
        const effectiveChanges = parsed.changes.filter((change) =>
          change.action === "delete" ? change.path in project.files : project.files[change.path] !== change.content
        );
        msg = effectiveChanges.length > 0
          ? { id: uid(), role: "assistant", content: parsed.summary, at: Date.now(), proposal: { id: uid(), summary: parsed.summary, changes: effectiveChanges, rejected: parsed.rejected, status: "pending" } }
          : { id: uid(), role: "assistant", content: parsed.summary, at: Date.now() };
      }
      p = { ...p, messages: [...p.messages, msg] };
    } catch (e) {
      const aborted = (e as Error).name === "AbortError";
      p = { ...p, messages: [...p.messages, { id: uid(), role: "system", content: aborted ? "Request cancelled." : (e as Error).message, at: Date.now() }] };
    } finally {
      commit(p); setBusy(false); abortRef.current = null;
    }
  }

  useEffect(() => {
    if (q && project && aiReady === true && !autoSent.current && project.messages.length === 0) { autoSent.current = true; void send(q); }
  }, [q, project, aiReady]); // eslint-disable-line

  function decide(msgId: string, approve: boolean) {
    if (!project) return;
    const msg = project.messages.find((m) => m.id === msgId);
    if (!msg?.proposal || msg.proposal.status !== "pending") return;
    let p = project;
    if (approve) {
      p = withSnapshot(p, "Before: " + msg.proposal.summary.slice(0, 60));
      p = { ...p, files: applyProposal(p.files, msg.proposal) };
    }
    const status: Proposal["status"] = approve ? "applied" : "rejected";
    commit({ ...p, messages: p.messages.map((m) => (m.id === msgId ? { ...m, proposal: { ...m.proposal!, status } } : m)) });
    if (approve) toast.success("Changes applied");
  }

  function saveFile(path: string, content: string) {
    if (!project) return;
    const p = withSnapshot(project, `Before editing ${path}`);
    commit({ ...p, files: { ...p.files, [path]: content } });
  }
  function deleteFile(path: string) {
    if (!project) return;
    const p = withSnapshot(project, `Before deleting ${path}`);
    const files = { ...p.files }; delete files[path];
    commit({ ...p, files });
  }
  function restore(id: string) {
    if (!project) return;
    const snap = project.snapshots.find((s) => s.id === id);
    if (!snap) return;
    const p = withSnapshot(project, "Before restore");
    commit({ ...p, files: { ...snap.files }, snapshots: p.snapshots.filter((s) => s.id !== id) });
    toast("Restored snapshot"); setShowHistory(false);
  }
  async function exportZip() {
    if (!project) return;
    const blob = await buildZip(project.name, project.files);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${project.name.replace(/\W+/g, "-").toLowerCase()}.zip`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  if (project === undefined) return <div className="flex min-h-screen items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>;
  if (project === null) return (
    <div className="min-h-screen"><AppHeader />
      <div className="p-10 text-center"><p>This project isn't in this browser's storage.</p><Link to="/" className="mt-4 inline-block text-primary underline">Back to projects</Link></div>
    </div>
  );

  const panel = (t: Tab) => `${tab === t ? "flex" : "hidden"} md:flex min-h-0 flex-col`;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0b0d12] text-slate-100">
      <AppHeader>
        <span className="truncate text-sm text-slate-400">/ {project.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 hidden items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 sm:inline-flex"><CircleDot className="h-3 w-3"/> Autosaved locally</span>
          <Button size="sm" variant="ghost" onClick={() => project.snapshots[0] && restore(project.snapshots[0].id)} disabled={!project.snapshots.length} aria-label="Undo last change" className="text-slate-400 hover:bg-white/10 hover:text-white"><Undo2 /><span className="hidden lg:inline">Undo</span></Button>
          <Button size="sm" variant="ghost" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory} className="text-slate-400 hover:bg-white/10 hover:text-white"><History /><span className="hidden lg:inline">History</span></Button>
          <Button size="sm" variant="secondary" onClick={exportZip} className="border border-white/10 bg-white/[0.08] text-slate-100 hover:bg-white/[0.13]"><Download /><span className="hidden lg:inline">Export</span></Button>
        </div>
      </AppHeader>
      {showHistory && (
        <div className="max-h-60 overflow-auto border-b border-white/10 bg-[#11141c] px-4 py-3 text-sm text-slate-200">
          {project.snapshots.length === 0 ? <p className="text-slate-500">No snapshots yet. One is saved before every change.</p> : (
            <ul className="space-y-1">{project.snapshots.map((s) => (
              <li key={s.id} className="flex items-center gap-3"><span className="font-mono text-xs text-slate-500">{new Date(s.at).toLocaleTimeString()}</span><span className="truncate">{s.label}</span>
                <Button size="sm" variant="ghost" className="ml-auto h-7 text-violet-300 hover:bg-white/10" onClick={() => restore(s.id)}>Restore</Button></li>
            ))}</ul>
          )}
        </div>
      )}
      <div role="tablist" className="grid grid-cols-3 border-b border-white/10 bg-[#10131a] md:hidden">
        {(["chat", "preview", "code"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`py-3 text-xs font-semibold capitalize transition ${tab === t ? "border-b-2 border-violet-400 text-white" : "text-slate-500"}`}>{t}</button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-[350px_minmax(0,1fr)] xl:grid-cols-[350px_minmax(0,1fr)_300px]">
        <section aria-label="Conversation" className={`${panel("chat")} border-r border-white/[0.08] bg-[#10131a]`}>
          <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
            <div><div className="flex items-center gap-2 text-[13px] font-semibold text-white"><span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Sparkles className="h-4 w-4"/></span> OpenForge AI</div><p className="ml-9 mt-[-2px] text-[10px] text-slate-500">Your product-building partner</p></div>
            <span className="rounded-md border border-white/10 px-2 py-1 text-[9px] font-bold tracking-[.14em] text-slate-500">BUILD</span>
          </div>
          <div className="flex-1 space-y-4 overflow-auto bg-[#10131a] p-4">
            {aiReady === false && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.07] p-3 text-sm text-amber-100">
                <p className="font-medium">AI engine unavailable</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-200/70">You will not need to enter an API key. Please try again shortly.</p>
              </div>
            )}
            {project.messages.length === 0 && aiReady === true && <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3.5"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-200"><Sparkles className="h-3.5 w-3.5"/> Ready when you are</div><p className="text-xs leading-6 text-slate-400">Tell me what you want to build or change. I’ll inspect your project, plan the work and make the changes while preserving what already works.</p><div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-slate-500">Improve design</span><span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-slate-500">Add a page</span><span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-slate-500">Fix a bug</span></div></div>}
            {project.messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "ml-5 rounded-2xl rounded-tr-sm border border-violet-300/10 bg-violet-500/[0.12] p-3 text-[13px] text-slate-100" : m.role === "system" ? "rounded-xl border border-rose-400/20 bg-rose-400/[0.08] p-3 text-[12px] text-rose-200 break-words" : "text-[13px] text-slate-300"}>
                {m.role === "assistant" && <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-violet-300"><Sparkles className="h-3 w-3"/> OpenForge</div>}
                <p className="whitespace-pre-wrap leading-6">{m.content}</p>
                {m.proposal && <ProposalCard proposal={m.proposal} files={project.files} onApprove={() => decide(m.id, true)} onReject={() => decide(m.id, false)} />}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 rounded-xl border border-violet-400/15 bg-violet-400/[0.06] p-3 text-xs text-violet-200"><Loader2 className="h-4 w-4 animate-spin"/> Thinking through your request…</div>}
            <div ref={endRef} />
          </div>
          <form className="border-t border-white/[0.08] bg-[#0d1016] p-3" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
            <div className="rounded-xl border border-white/[0.12] bg-[#151923] p-2 transition focus-within:border-violet-400/50">
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} disabled={aiReady !== true} aria-label="Message"
                placeholder={aiReady === true ? "Ask OpenForge to make a change…" : "Connecting AI engine…"}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} className="min-h-[82px] resize-none border-0 bg-transparent text-[13px] leading-5 text-white shadow-none placeholder:text-slate-600 focus-visible:ring-0" />
              <div className="mt-1 flex items-center justify-between border-t border-white/[0.07] pt-2">
                <span className="text-[10px] text-slate-600">Enter to send · Shift + Enter for new line</span>
                {busy ? <Button size="sm" variant="secondary" type="button" onClick={() => abortRef.current?.abort()} className="h-8 border border-white/10 bg-white/[0.07] text-slate-200"><Square className="h-3.5 w-3.5"/> Stop</Button>
                  : <Button size="sm" type="submit" disabled={aiReady !== true || !input.trim()} className="h-8 gap-1.5 rounded-lg bg-violet-500 px-3 text-white hover:bg-violet-400"><Send className="h-3.5 w-3.5"/> Send</Button>}
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-600">OpenForge can make mistakes. Review changes before applying.</p>
          </form>
        </section>
        <section aria-label="Live preview" className={`${panel("preview")} min-w-0 bg-[#0b0d12]`}>
          <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#10131a] px-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-white"><MonitorPlay className="h-4 w-4 text-violet-300"/> Preview <span className="ml-1 rounded-md bg-white/[0.06] px-2 py-1 text-[9px] font-medium text-slate-500">LIVE</span></div>
            <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.035] p-1"><span className="rounded-md bg-white/[0.1] px-2 py-1 text-[10px] text-slate-200">Desktop</span><span className="px-2 py-1 text-[10px] text-slate-600">Mobile</span></div>
          </div>
          <div className="min-h-0 flex-1 p-3 sm:p-4">
            <div className="flex h-full min-h-[60vh] flex-col overflow-hidden rounded-xl border border-white/[0.12] bg-white shadow-[0_20px_70px_-35px_rgba(0,0,0,.8)] md:min-h-0">
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-3"><div className="flex gap-1"><i className="h-2 w-2 rounded-full bg-rose-400"/><i className="h-2 w-2 rounded-full bg-amber-300"/><i className="h-2 w-2 rounded-full bg-emerald-400"/></div><div className="mx-auto flex h-5 w-[55%] items-center justify-center rounded-md border border-slate-200 bg-white text-[9px] text-slate-400">preview.openforge.app</div></div>
              <ClientOnly fallback={<div className="flex flex-1 items-center justify-center text-sm text-slate-400">Loading preview…</div>}>
                <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-slate-400">Loading preview…</div>}>
                  <div className="min-h-0 flex-1"><Preview files={project.files} /></div>
                </Suspense>
              </ClientOnly>
            </div>
          </div>
        </section>
        <section aria-label="Code" className={`${tab === "code" ? "flex" : "hidden"} xl:flex min-h-0 flex-col border-l border-white/[0.08] bg-[#10131a]`}>
          <div className="flex h-[58px] shrink-0 items-center justify-between border-b border-white/[0.08] px-4"><div className="flex items-center gap-2 text-[13px] font-semibold text-white"><Code2 className="h-4 w-4 text-violet-300"/> Files</div><span className="rounded-md bg-white/[0.05] px-2 py-1 text-[10px] text-slate-500">{Object.keys(project.files).length} files</span></div>
          <div className="min-h-0 flex-1 overflow-auto"><FileExplorer files={project.files} onSave={saveFile} onDelete={deleteFile} /></div>
          <div className="border-t border-white/[0.07] px-4 py-3 text-[10px] text-slate-600">Your source code · Editable</div>
        </section>
      </div>
    </div>
  );
}
