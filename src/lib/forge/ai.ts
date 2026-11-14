import type { Files } from "./changes";
import type { ProviderSettings } from "./settings";

const SYSTEM = `You are OpenForge, an expert React + TypeScript + Tailwind engineer editing a Sandpack project.
Entry file is /App.tsx (default export). Tailwind is available via CDN classes. Only use the "react" and "react-dom" packages.
Reply ONLY with JSON: {"summary": string, "changes": [{"action":"create"|"update","path":"/x.tsx","content":"full file"} | {"action":"delete","path":"/x.tsx"}]}.
Always send complete file contents. Allowed types: .tsx .ts .css .json .md .svg. Keep changes minimal.
IMPORTANT WORKFLOW RULES:
- The current project files below are the latest source of truth. Never propose a change that simply repeats code already present in those files.
- Read the conversation history and respect whether earlier proposals were applied or rejected. Never repeat an already-applied proposal unless the user explicitly asks to revert or change it.
- Interpret each new user message as a request for a new, specific change. If the user says only "continue", "go on", or gives no actionable detail, do not guess and do not edit files. Return {"summary":"What would you like me to build or change next?","changes":[]} instead.
- If the requested result is already present in the current files, return {"summary":"That change is already in place. Tell me what you'd like changed next.","changes":[]}.
- Return only files that genuinely need to change for the latest request.`;

function endpoint(base: string) { return base.replace(/\/+$/, "") + "/chat/completions"; }

async function call(s: ProviderSettings, messages: { role: string; content: string }[] , signal?: AbortSignal) {
  let res: Response;
  try {
    res = await fetch(endpoint(s.baseUrl), {
      method: "POST", signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.apiKey}` },
      body: JSON.stringify({ model: s.model, messages, temperature: 0.2 }),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error("Network error — check the endpoint URL, or the provider may block browser (CORS) requests.");
  }
  if (!res.ok) {
    const hint = res.status === 401 ? "Invalid API key." : res.status === 402 ? "Provider says your account needs credit." : res.status === 429 ? "Rate limited by the provider — try again shortly." : res.status === 404 ? "Model or endpoint not found." : "";
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Provider error ${res.status}. ${hint} ${body}`.trim());
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("Provider returned no message content.");
  return text;
}

export async function testConnection(s: ProviderSettings) {
  await call(s, [{ role: "user", content: "Reply with the word OK." }]);
}

export function requestChanges(s: ProviderSettings, files: Files, history: { role: string; content: string }[], prompt: string, signal?: AbortSignal) {
  const ctx = Object.entries(files).map(([p, c]) => `--- ${p}\n${c}`).join("\n\n");
  return call(s, [
    { role: "system", content: SYSTEM },
    { role: "system", content: "Current project files:\n" + ctx },
    ...history.slice(-6),
    { role: "user", content: prompt },
  ], signal);
}