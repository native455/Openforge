import type { FileChange } from "./schema";

export type Files = Record<string, string>;
export type ProposalStatus = "pending" | "applied" | "rejected";
export interface Proposal {
  id: string;
  summary: string;
  changes: FileChange[];
  rejected: { path: string; reason: string }[];
  status: ProposalStatus;
}

export function describeChange(c: FileChange, files: Files): "create" | "update" | "delete" {
  if (c.action === "delete") return "delete";
  return c.path in files ? "update" : "create";
}

/** Pure: returns a new file map. Only callable for pending proposals (approval required). */
export function applyProposal(files: Files, proposal: Proposal): Files {
  if (proposal.status !== "pending") throw new Error("Only pending proposals can be applied");
  const next: Files = { ...files };
  for (const c of proposal.changes) {
    if (c.action === "delete") delete next[c.path];
    else next[c.path] = c.content;
  }
  return next;
}