import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader, CostNotice } from "@/components/forge/AppHeader";
import { PRESETS, clearSettings, emptySettings, loadSettings, saveSettings, type ProviderSettings } from "@/lib/forge/settings";
import { testConnection } from "@/lib/forge/ai";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "AI provider settings — OpenForge" },
      { name: "description", content: "Bring your own key for OpenRouter, OpenAI or any OpenAI-compatible endpoint." },
      { property: "og:title", content: "AI provider settings — OpenForge" },
      { property: "og:description", content: "Bring your own key for any OpenAI-compatible endpoint." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [s, setS] = useState<ProviderSettings>(emptySettings);
  const [status, setStatus] = useState<{ kind: "idle" | "testing" | "ok" | "error"; msg?: string }>({ kind: "idle" });
  useEffect(() => setS(loadSettings()), []);
  const set = (patch: Partial<ProviderSettings>) => { setS((x) => ({ ...x, ...patch })); setStatus({ kind: "idle" }); };

  async function test() {
    setStatus({ kind: "testing" });
    try { await testConnection(s); setStatus({ kind: "ok", msg: "Connected — the model replied." }); }
    catch (e) { setStatus({ kind: "error", msg: (e as Error).message }); }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">AI provider</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use your own key with any OpenAI-compatible API. Requests go directly from your browser to the provider.</p>
        <div role="alert" className="mt-4 flex gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <p>Your key is stored in this browser's local storage. Don't save it on shared or public computers. Prefer a key with a low spending limit.</p>
        </div>
        <form className="mt-6 space-y-5" onSubmit={(e) => { e.preventDefault(); saveSettings(s); toast.success("Settings saved in this browser"); }}>
          <div className="space-y-2">
            <Label htmlFor="preset">Provider</Label>
            <select id="preset" value={s.preset} onChange={(e) => { const p = PRESETS.find((x) => x.id === e.target.value)!; set({ preset: p.id, baseUrl: p.baseUrl || s.baseUrl, model: p.model || s.model }); }}
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm">
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="base">Base URL</Label>
            <Input id="base" value={s.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} placeholder="https://…/v1" className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={s.model} onChange={(e) => set({ model: e.target.value })} placeholder="provider/model-name" className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="key">API key</Label>
            <Input id="key" type="password" autoComplete="off" value={s.apiKey} onChange={(e) => set({ apiKey: e.target.value })} placeholder="sk-…" className="font-mono" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="secondary" onClick={test} disabled={!s.apiKey || !s.baseUrl || !s.model || status.kind === "testing"}>
              {status.kind === "testing" && <Loader2 className="animate-spin" />} Test connection
            </Button>
            <Button type="button" variant="ghost" onClick={() => { clearSettings(); setS(emptySettings); toast("Key removed from this browser"); }}>Remove key</Button>
          </div>
          {status.kind === "ok" && <p className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />{status.msg}</p>}
          {status.kind === "error" && <p role="alert" className="text-sm break-words text-destructive">{status.msg}</p>}
          <CostNotice />
        </form>
      </main>
    </div>
  );
}