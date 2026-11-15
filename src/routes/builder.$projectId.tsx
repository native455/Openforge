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
    <div className="flex h-dvh flex-col">
      <AppHeader>
        <span className="truncate text-sm text-muted-foreground">/ {project.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => project.snapshots[0] && restore(project.snapshots[0].id)} disabled={!project.snapshots.length} aria-label="Undo last change"><Undo2 /><span className="hidden lg:inline">Undo</span></Button>
          <Button size="sm" variant="ghost" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory}><History /><span className="hidden lg:inline">History ({project.snapshots.length})</span></Button>
          <Button size="sm" variant="secondary" onClick={exportZip}><Download /><span className="hidden lg:inline">Export ZIP</span></Button>
        </div>
      </AppHeader>
      {showHistory && (
        <div className="max-h-60 overflow-auto border-b border-border bg-card px-4 py-2 text-sm">
          {project.snapshots.length === 0 ? <p className="text-muted-foreground">No snapshots yet. One is saved before every change.</p> : (
            <ul className="space-y-1">{project.snapshots.map((s) => (
              <li key={s.id} className="flex items-center gap-3"><span className="font-mono text-xs text-muted-foreground">{new Date(s.at).toLocaleTimeString()}</span><span className="truncate">{s.label}</span>
                <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => restore(s.id)}>Restore</Button></li>
            ))}</ul>
          )}
        </div>
      )}
      <div role="tablist" className="grid grid-cols-3 border-b border-border md:hidden">
        {(["chat", "preview", "code"] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`py-2 text-sm capitalize ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>{t}</button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-[320px_1fr_minmax(320px,32%)]">
        <section aria-label="Conversation" className={`${panel("chat")} border-r border-border bg-white`}>
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/80 px-4"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> AI assistant</div><span className="text-[11px] text-muted-foreground">BUILD</span></div>
          <div className="flex-1 space-y-3 overflow-auto bg-white p-3">
            {aiReady === false && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-medium">OpenForge AI is being connected</p>
                <p className="mt-1 text-amber-900">You will not need to enter an API key. The shared AI engine must be activated by OpenForge first.</p>
              </div>
            )}
            {project.messages.length === 0 && aiReady === true && <p className="text-sm text-muted-foreground">Tell me what you want to build or change. I’ll inspect the whole project, make the changes, and explain what I updated.</p>}
            {project.messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "ml-6 rounded-lg bg-secondary p-2.5 text-sm" : m.role === "system" ? "rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-sm break-words" : "text-sm"}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.proposal && <ProposalCard proposal={m.proposal} files={project.files} onApprove={() => decide(m.id, true)} onReject={() => decide(m.id, false)} />}
              </div>
            ))}
            {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Understanding your request and building…</p>}
            <div ref={endRef} />
          </div>
          <form className="border-t border-border p-2" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} disabled={aiReady !== true} aria-label="Message"
              placeholder={aiReady === true ? "Describe what you want… (Enter to send)" : "OpenForge AI is being connected"}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} className="min-h-20 resize-none bg-background text-sm" />
            <div className="mt-2 flex items-center justify-between">
              <span className="truncate text-[11px] text-muted-foreground">{aiReady === true ? "OpenForge AI" : "AI engine pending"}</span>
              {busy ? <Button size="sm" variant="secondary" type="button" onClick={() => abortRef.current?.abort()}><Square /> Stop</Button>
                : <Button size="sm" type="submit" disabled={aiReady !== true || !input.trim()}><Send /> Send</Button>}
            </div>
          </form>
        </section>
        <section aria-label="Live preview" className={`${panel("preview")} bg-background`}>
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/80 bg-white px-4"><div className="flex items-center gap-2 text-sm font-semibold"><MonitorPlay className="h-4 w-4 text-primary" /> Preview</div><span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700"><CircleDot className="h-3 w-3" /> LIVE</span></div>
          <ClientOnly fallback={<div className="flex flex-1 items-center justify-center text-muted-foreground">Loading preview…</div>}>
            <Suspense fallback={<div className="flex flex-1 items-center justify-center text-muted-foreground">Loading preview…</div>}>
              <div className="min-h-[60vh] flex-1 md:min-h-0"><Preview files={project.files} /></div>
            </Suspense>
          </ClientOnly>
        </section>
        <section aria-label="Code" className={`${panel("code")} border-l border-border bg-white`}>
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/80 bg-white px-4"><div className="flex items-center gap-2 text-sm font-semibold"><Code2 className="h-4 w-4 text-primary" /> Code</div><span className="text-[11px] text-muted-foreground">{Object.keys(project.files).length} files</span></div>
          <FileExplorer files={project.files} onSave={saveFile} onDelete={deleteFile} />
        </section>
      </div>
    </div>
  );
}