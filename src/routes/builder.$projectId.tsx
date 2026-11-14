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
import { requestChanges } from "@/lib/forge/ai";
import { isConfigured, loadSettings, type ProviderSettings } from "@/lib/forge/settings";
import { buildZip } from "@/lib/forge/zip";
import { Download, History, Loader2, Send, Undo2, Square } from "lucide-react";

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
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoSent = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setProject(getProject(projectId)); setSettings(loadSettings()); }, [projectId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [project?.messages.length, busy]);

  const configured = settings ? isConfigured(settings) : false;

  function commit(p: Project) { setProject(p); upsertProject(p); }

  async function send(text: string) {
    if (!project || !settings || !text.trim() || busy) return;
    const userMsg: ChatMessage = { id: uid(), role: "user", content: text, at: Date.now() };
    let p: Project = { ...project, messages: [...project.messages, userMsg] };
    commit(p); setInput(""); setBusy(true);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const history = project.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.proposal ? m.proposal.summary : m.content }));
      const raw = await requestChanges(settings, project.files, history, text, ctrl.signal);
      const parsed = parseAiResponse(raw);
      const msg: ChatMessage = parsed.ok
        ? { id: uid(), role: "assistant", content: parsed.summary, at: Date.now(), proposal: { id: uid(), summary: parsed.summary, changes: parsed.changes, rejected: parsed.rejected, status: "pending" } }
        : { id: uid(), role: "system", content: parsed.error + " Try rephrasing, or use a stronger model.", at: Date.now() };
      p = { ...p, messages: [...p.messages, msg] };
    } catch (e) {
      const aborted = (e as Error).name === "AbortError";
      p = { ...p, messages: [...p.messages, { id: uid(), role: "system", content: aborted ? "Request cancelled." : (e as Error).message, at: Date.now() }] };
    } finally {
      commit(p); setBusy(false); abortRef.current = null;
    }
  }

  useEffect(() => {
    if (q && project && configured && !autoSent.current && project.messages.length === 0) { autoSent.current = true; void send(q); }
  }, [q, project, configured]); // eslint-disable-line

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
        <section aria-label="Conversation" className={`${panel("chat")} border-r border-border bg-card/40`}>
          <div className="flex-1 space-y-3 overflow-auto p-3">
            {!configured && (
              <div className="rounded-lg border border-primary/40 bg-card p-3 text-sm">
                <p className="font-medium">Demo mode</p>
                <p className="mt-1 text-muted-foreground">AI generation needs your own provider key. You can still edit code and use the live preview.</p>
                <Link to="/settings" className="mt-2 inline-block text-primary underline">Configure a provider</Link>
              </div>
            )}
            {project.messages.length === 0 && configured && <p className="text-sm text-muted-foreground">Describe a change, e.g. "Add a pricing section with three cards". You'll review every change before it's applied.</p>}
            {project.messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "ml-6 rounded-lg bg-secondary p-2.5 text-sm" : m.role === "system" ? "rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-sm break-words" : "text-sm"}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.proposal && <ProposalCard proposal={m.proposal} files={project.files} onApprove={() => decide(m.id, true)} onReject={() => decide(m.id, false)} />}
              </div>
            ))}
            {busy && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for {settings?.model}…</p>}
            <div ref={endRef} />
          </div>
          <form className="border-t border-border p-2" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
            <Textarea value={input} onChange={(e) => setInput(e.target.value)} disabled={!configured} aria-label="Message"
              placeholder={configured ? "Ask for a change… (Enter to send, Shift+Enter for newline)" : "Set up an AI provider to chat"}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} className="min-h-20 resize-none bg-background text-sm" />
            <div className="mt-2 flex items-center justify-between">
              <span className="truncate font-mono text-[11px] text-muted-foreground">{configured ? settings?.model : "no provider"}</span>
              {busy ? <Button size="sm" variant="secondary" type="button" onClick={() => abortRef.current?.abort()}><Square /> Stop</Button>
                : <Button size="sm" type="submit" disabled={!configured || !input.trim()}><Send /> Send</Button>}
            </div>
          </form>
        </section>
        <section aria-label="Live preview" className={`${panel("preview")} bg-background`}>
          <ClientOnly fallback={<div className="flex flex-1 items-center justify-center text-muted-foreground">Loading preview…</div>}>
            <Suspense fallback={<div className="flex flex-1 items-center justify-center text-muted-foreground">Loading preview…</div>}>
              <div className="min-h-[60vh] flex-1 md:min-h-0"><Preview files={project.files} /></div>
            </Suspense>
          </ClientOnly>
        </section>
        <section aria-label="Code" className={`${panel("code")} border-l border-border`}>
          <FileExplorer files={project.files} onSave={saveFile} onDelete={deleteFile} />
        </section>
      </div>
    </div>
  );
}