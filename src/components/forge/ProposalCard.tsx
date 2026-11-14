import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { describeChange, type Files, type Proposal } from "@/lib/forge/changes";

export function ProposalCard({ proposal, files, onApprove, onReject }: { proposal: Proposal; files: Files; onApprove: () => void; onReject: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="mt-2 rounded-lg border border-border bg-background p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposed changes</p>
      {proposal.changes.length === 0 && <p className="mt-1 text-sm text-muted-foreground">No valid file changes.</p>}
      <ul className="mt-2 space-y-1">
        {proposal.changes.map((c) => {
          const kind = proposal.status === "pending" ? describeChange(c, files) : c.action;
          return (
            <li key={c.path}>
              <button className="flex w-full items-center gap-2 text-left font-mono text-xs hover:text-primary" onClick={() => setOpen(open === c.path ? null : c.path)} aria-expanded={open === c.path}>
                <Badge variant={kind === "delete" ? "destructive" : "secondary"} className="w-14 justify-center">{kind}</Badge>
                <span className="truncate">{c.path}</span>
              </button>
              {open === c.path && c.action !== "delete" && <pre className="mt-1 max-h-60 overflow-auto rounded bg-card p-2 font-mono text-[11px]">{c.content}</pre>}
            </li>
          );
        })}
      </ul>
      {proposal.rejected.length > 0 && (
        <div className="mt-2 text-xs text-destructive">
          Blocked for safety:
          <ul className="list-disc pl-4">{proposal.rejected.map((r, i) => <li key={i}><span className="font-mono">{r.path}</span> — {r.reason}</li>)}</ul>
        </div>
      )}
      {proposal.status === "pending" ? (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={onApprove} disabled={proposal.changes.length === 0}>Apply changes</Button>
          <Button size="sm" variant="ghost" onClick={onReject}>Discard</Button>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{proposal.status === "applied" ? "✓ Applied (snapshot saved)" : "Discarded"}</p>
      )}
    </div>
  );
}