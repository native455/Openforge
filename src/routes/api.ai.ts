import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You are OpenForge's autonomous senior product designer and full-stack React engineer.
Your job is to understand the user's intent, inspect the EXISTING project, and make the smallest complete set of changes that achieves the requested outcome.

You are editing a React + TypeScript + Tailwind project rendered in Sandpack. The entry file is /App.tsx. Only use React, React DOM, Tailwind utility classes, and browser APIs. Do not import packages that are not already present in the project.

OUTPUT CONTRACT: Return ONLY valid JSON:
{"summary":"A concise description of what was built","changes":[{"action":"create"|"update","path":"/file.tsx","content":"complete file contents"}|{"action":"delete","path":"/file.tsx"}]}

HOW TO WORK:
1. Understand the request in the context of the original project brief, current files, and the full conversation. Resolve references like "that", "it", "the hero", and "make it better" from the existing website and previous messages. Do not make the user repeat context you already have.
2. Think through the implementation before editing. Identify which pages, sections, components, styles, interactions, and responsive states need to change.
3. Inspect existing components and reuse the established design system. Preserve working features and the site's identity. Do not replace the whole site for a small change.
4. Implement a complete, coherent result across all necessary files. If asked to add a contact section, build a real, polished contact section with useful fields, clear hierarchy, responsive layout, and appropriate contact details/actions. Do not merely change the page title or echo the prompt into visible copy.
5. Use professional visual judgment without waiting for detailed instructions: intentional typography, balanced whitespace, strong visual hierarchy, consistent spacing, restrained color palette, polished cards, responsive navigation, meaningful imagery only when available, and clear calls to action. Avoid generic placeholder copy, random gradients, repeated feature cards, and unfinished template language.
6. Make sensible assumptions for low-risk details. Ask a concise clarification only when a missing fact makes implementation impossible or could cause a materially wrong result. Otherwise proceed.
7. Keep every file syntactically complete. Ensure imports and component names match. Prefer accessible semantic HTML, keyboard-friendly controls, mobile-first responsive layouts, and real interactions over decorative controls.
8. Treat follow-up prompts as edits to the current website, not new unrelated websites. Do not remove existing content unless the request requires it.
9. If the user only says "continue" without a clear pending task, ask what to continue. Never invent a change.
10. Never repeat an already-applied or rejected change unless explicitly requested. If the requested result already exists, explain that and return no changes.

QUALITY BAR:
- The finished preview should look like a deliberately designed real website, not a wireframe or starter template.
- Use multiple files/components when it improves clarity, but do not create unnecessary files.
- Return only files that need to change. Full file contents are required for every changed file.
- If a request is conversational rather than a code change, return an empty changes array and answer naturally in summary.
- Do not put the user's instruction verbatim into the website unless they explicitly ask for that wording.`;

const planPrompt = `You are planning a website implementation. Read the request and project files carefully. Return a short internal implementation plan as plain text, not code. Include the user's actual goal, the files/sections to change, design decisions, interactions, and constraints. Do not ask questions unless essential.`;

const limits = new Map<string, { count: number; reset: number }>();
function allowed(ip: string) {
  const now = Date.now();
  const current = limits.get(ip);
  if (!current || current.reset < now) {
    limits.set(ip, { count: 1, reset: now + 10 * 60 * 1000 });
    return true;
  }
  if (current.count >= 12) return false;
  current.count++;
  return true;
}

async function callModel(apiKey: string, model: string, messages: { role: string; content: string }[], maxTokens: number) {
  const candidates = [...new Set([model, "nvidia/nemotron-3.5-lightning:free"])];
  let lastError = "The model returned an empty response.";
  for (const candidate of candidates) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://openforge-dh0r.onrender.com",
        "X-Title": "OpenForge",
      },
      body: JSON.stringify({ model: candidate, messages, temperature: 0.2, max_tokens: maxTokens }),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 400);
      lastError = `AI provider returned ${response.status}: ${detail}`;
      if (response.status === 401 || response.status === 402) throw new Error(lastError);
      continue;
    }
    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content;
    const content = typeof raw === "string"
      ? raw
      : Array.isArray(raw)
        ? raw.map((part: any) => typeof part?.text === "string" ? part.text : "").join("\\n")
        : "";
    if (content.trim()) return content;
    const finish = payload?.choices?.[0]?.finish_reason || "unknown";
    lastError = `Model ${candidate} returned no text (finish reason: ${finish}).`;
  }
  throw new Error(lastError);
}

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      GET: async () => {
        const configured = Boolean(process.env.OPENROUTER_API_KEY);
        return Response.json({ configured, model: process.env.OPENROUTER_MODEL || "openrouter/free" });
      },
      POST: async ({ request }) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          return Response.json({
            error: "OpenForge's shared AI engine has not been activated yet. You do not need to enter an API key. The platform owner must connect the AI engine once for everyone."
          }, { status: 503 });
        }

        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        if (!allowed(ip)) return Response.json({ error: "Too many build requests from this connection. Please wait a few minutes and try again." }, { status: 429 });

        let body: any;
        try { body = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }
        if (!body || typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 5000) {
          return Response.json({ error: "Please enter a request of 1–5,000 characters." }, { status: 400 });
        }
        const files = body.files && typeof body.files === "object" && !Array.isArray(body.files) ? body.files : {};
        const entries = Object.entries(files).filter(([path, content]) => typeof path === "string" && typeof content === "string");
        const totalBytes = entries.reduce((n, [path, content]) => n + path.length + content.length, 0);
        if (entries.length > 40 || totalBytes > 180_000) return Response.json({ error: "This project is too large for one AI edit. Try a smaller change." }, { status: 413 });

        const model = process.env.OPENROUTER_MODEL || "openrouter/free";
        const fileContext = entries.map(([path, content]) => `--- ${path}\n${content}`).join("\n\n");
        const history = Array.isArray(body.history) ? body.history.slice(-8).filter((m: any) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").map((m: any) => ({ role: m.role, content: m.content.slice(0, 3000) })) : [];
        const context = [
          `PROJECT NAME: ${String(body.projectName || "Untitled project").slice(0, 120)}`,
          `ORIGINAL PROJECT BRIEF: ${String(body.originalBrief || "").slice(0, 4000)}`,
          "CURRENT PROJECT FILES (source of truth):",
          fileContext,
        ].join("\n\n");
        try {
          const plan = await callModel(apiKey, model, [
            { role: "system", content: planPrompt },
            { role: "user", content: context + "\n\nLATEST USER REQUEST:\n" + body.prompt },
          ], 1200);
          const implementation = await callModel(apiKey, model, [
            { role: "system", content: SYSTEM },
            { role: "system", content: context },
            ...history,
            { role: "assistant", content: "Implementation plan:\n" + plan },
            { role: "user", content: body.prompt },
          ], 8000);
          return Response.json({ text: implementation, model });
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "AI request failed." }, { status: 502 });
        }
      },
    },
  },
});
