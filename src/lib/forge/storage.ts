import type { Files, Proposal } from "./changes";

export interface ChatMessage { id: string; role: "user" | "assistant" | "system"; content: string; proposal?: Proposal; at: number }
export interface Snapshot { id: string; label: string; files: Files; at: number }
export interface Project {
  id: string; name: string; prompt: string; files: Files;
  messages: ChatMessage[]; snapshots: Snapshot[]; createdAt: number; updatedAt: number;
}

const KEY = "openforge.projects.v1";
export const MAX_SNAPSHOTS = 20;

type KV = Pick<Storage, "getItem" | "setItem">;
const store = (): KV | null => (typeof window === "undefined" ? null : window.localStorage);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function loadProjects(s: KV | null = store()): Project[] {
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Project[]) : [];
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch { return []; }
}
export function saveProjects(list: Project[], s: KV | null = store()) {
  s?.setItem(KEY, JSON.stringify(list));
}
export function getProject(id: string, s: KV | null = store()) {
  return loadProjects(s).find((p) => p.id === id) ?? null;
}
export function upsertProject(p: Project, s: KV | null = store()) {
  const list = loadProjects(s).filter((x) => x.id !== p.id);
  saveProjects([{ ...p, updatedAt: Date.now() }, ...list], s);
}
export function deleteProject(id: string, s: KV | null = store()) {
  saveProjects(loadProjects(s).filter((p) => p.id !== id), s);
}
/** Record the current files as a snapshot before changing them. */
export function withSnapshot(p: Project, label: string): Project {
  const snap: Snapshot = { id: uid(), label, files: { ...p.files }, at: Date.now() };
  return { ...p, snapshots: [snap, ...p.snapshots].slice(0, MAX_SNAPSHOTS) };
}