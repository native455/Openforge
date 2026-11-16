import type { Files } from "./changes";

export interface BuildContext {
  projectName: string;
  originalBrief: string;
  files: Files;
  history: { role: string; content: string }[];
  prompt: string;
}

export async function getAiStatus(): Promise<{ configured: boolean; model?: string }> {
  const res = await fetch("/api/ai", { method: "GET" });
  if (!res.ok) return { configured: false };
  return res.json();
}

export async function requestChanges(context: BuildContext, signal?: AbortSignal, onChunk?: (chunk: string) => void): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/ai", {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(context),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error("Could not reach OpenForge's AI engine. Please try again.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "The AI engine could not complete this request.");
  }
  if (!res.body) throw new Error("The AI engine did not open a streaming response.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      result += chunk;
      onChunk?.(chunk);
    }
    result += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  if (!result.trim()) throw new Error("The AI engine returned an empty response.");
  return result;
}
