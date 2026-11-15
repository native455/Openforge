import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader, CostNotice } from "@/components/forge/AppHeader";
import { getAiStatus } from "@/lib/forge/ai";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "OpenForge AI — Shared engine" },
      { name: "description", content: "OpenForge manages its AI connection for you." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [status, setStatus] = useState<"checking" | "ready" | "pending">("checking");
  useEffect(() => {
    getAiStatus().then((s) => setStatus(s.configured ? "ready" : "pending")).catch(() => setStatus("pending"));
  }, []);

  return (
    <div className="min-h-screen bg-forge">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><CheckCircle2 className="h-5 w-5" /></div>
            <div><h1 className="text-2xl font-bold">OpenForge AI</h1><p className="text-sm text-muted-foreground">One shared engine. No personal API setup.</p></div>
          </div>
          <div className="mt-7 rounded-xl border border-border bg-muted/30 p-4">
            {status === "checking" && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Checking the shared AI engine…</p>}
            {status === "ready" && <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" /> AI engine connected. You can build by chatting.</p>}
            {status === "pending" && <p className="flex items-center gap-2 text-sm text-amber-800"><AlertCircle className="h-4 w-4" /> The shared AI engine has not been activated yet.</p>}
          </div>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">You should not have to find, create, paste, or manage an API key. OpenForge is designed to keep its provider credentials on the server and make the AI available from the builder. The platform owner must activate the shared service once; individual users will not be asked for secrets.</p>
          <CostNotice />
        </div>
      </main>
    </div>
  );
}
