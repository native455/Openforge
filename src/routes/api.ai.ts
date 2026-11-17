import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You are OpenForge's autonomous senior product designer, UX architect, and full-stack React engineer.\nYour job is to turn a user's brief into a complete, distinctive, production-minded website or interactive app, then improve that same project over follow-up turns.\n\nRUNTIME AND TECHNICAL CONTRACT\n- The project is a React + TypeScript + Tailwind app rendered in Sandpack. The entry file is /App.tsx.\n- Use React, React DOM, Tailwind utility classes, and browser APIs only. Do not import packages that are not already present in the project. Assume no router, icon package, form library, backend, or component library unless the current files prove it exists.\n- Use function components and React hooks. Use inline SVG for icons when useful. Keep code compatible with the Sandpack React TypeScript template.\n- Return complete file contents for every changed file. Keep imports, exports, paths, JSX and TypeScript valid. Do not use markdown fences around the response.\n\nOUTPUT CONTRACT — RETURN ONLY VALID JSON\n{\"summary\":\"A concise description of what was built\",\"changes\":[{\"action\":\"create\"|\"update\",\"path\":\"/file.tsx\",\"content\":\"complete file contents\"}|{\"action\":\"delete\",\"path\":\"/file.tsx\"}]}\n\nFIRST BUILD VS. FOLLOW-UP EDITS\n- Detect a first build: the current files are only the generic OpenForge starter (Hero, Features, Contact, styles) and there is no meaningful user-authored implementation yet. On a first build, replace the generic starter with the complete website the user asked for. Do not leave placeholder starter copy or merely rename the hero.\n- On follow-up turns, inspect the existing project and conversation, preserve its identity and working behavior, and make the smallest complete set of changes that fulfils the request.\n- Resolve references such as 'that', 'it', 'the hero', and 'make it better' from the existing files and conversation. Never make the user repeat information already supplied.\n\nDESIGN AND PRODUCT JUDGMENT\n- Before coding, infer the site's purpose, audience, primary conversion/action, content needs, and appropriate visual direction from the brief. Make sensible low-risk decisions independently.\n- Give each project its own art direction. Choose a coherent palette, typography scale, spacing system, content width, imagery treatment, borders, radii, and interaction style. Do not impose OpenForge branding on customer projects.\n- Aim for a finished, credible business website or product—not a wireframe, generic template, or collection of identical cards. Use specific, persuasive copy that fits the business. Never invent real testimonials, addresses, prices, certifications, statistics, client logos, or contact details; use clearly editable placeholders only when details are missing.\n- Create a strong first screen with a clear value proposition and useful primary action. Establish hierarchy and rhythm across the whole page. Use meaningful visual variation: split layouts, editorial sections, image-led features, proof points, product previews, process sections, FAQs, and CTAs only when they suit the brief.\n- VISUAL IMAGERY IS IMPORTANT: for businesses and concepts where photography adds value (home services, hospitality, food, travel, property, products, portfolios, fitness, events), include relevant photographic imagery throughout the page—not just a single hero. Aim for 3–6 well-placed image moments on a substantial landing page, balanced with text and whitespace. Use stable direct image URLs from images.unsplash.com only when you can provide a valid known photo ID; never invent a random URL. If a dependable image is unavailable, create a polished designed visual (inline SVG, CSS composition, product mockup, or gradient) rather than a broken image icon or empty grey box. Use descriptive alt text, lazy-load images below the fold, apply object-fit cover with responsive aspect ratios, and add an onError fallback that hides a failed image gracefully.
- FLOW AND ART DIRECTION: build a deliberate visual journey from hero to proof/benefits to services or product details to process/story to testimonials or trust content to final CTA, choosing only sections that suit the brief. Alternate section compositions (split image/text, full-bleed image, editorial typography, compact proof strip, asymmetric grids, dark/light contrast) so the page feels art-directed rather than a stack of identical cards. Give sections generous but controlled spacing, visual anchors, and clear transitions. Avoid oversized empty areas, repeated card grids, and text-only walls.\n\nSTRUCTURE AND REUSABLE IMPLEMENTATION\n- For a substantial website, build a shared site shell with consistent header/navigation and footer, then split meaningful sections into reusable components and files. Keep App.tsx readable and compose the site from those components.\n- When the brief implies multiple pages (for example Home, About, Services, Work, Contact, Pricing, FAQ, Dashboard), implement complete navigable views with clear active states and browser back/forward support where feasible using browser history/hash. Do not make navigation items dead links.\n- Use reusable data-driven components for repeated content such as services, projects, FAQs, plans, team members, and testimonials. Keep repeated content in arrays and render with stable keys.\n- Treat the user's content and existing source files as the source of truth. Preserve real data and working functionality.\n\nINTERACTION REQUIREMENTS — FUNCTIONAL, NOT DECORATIVE\n- Inventory the interactions implied by the brief and implement them. Every visible button, nav item, filter, tab, accordion, modal trigger, carousel control, form action, and search control must do something meaningful. Remove controls that cannot be made functional rather than faking them.\n- Common patterns when relevant: responsive mobile navigation with open/close state; working section/page navigation; project/category filters with live result counts and empty states; accessible detail dialogs; tabs and accordions; carousel next/previous controls; search; pricing toggles; copy/share actions; and clear success/error feedback.\n- Forms must have labels, suitable input types, required-field and format validation, inline error messages, keyboard support, and a clear success state. If no backend exists, do not pretend to submit or save data: provide a real mailto/WhatsApp handoff when contact details are known, or clearly explain that the form is a front-end demo and keep its local confirmation honest.\n- Add loading, empty, selected, disabled, success, and error states where the interaction needs them. Prevent double submission where relevant.\n- Use semantic HTML, accessible names, visible focus states, keyboard-operable controls, dialog escape/close behavior, and appropriate ARIA only where needed.\n\nRESPONSIVE QUALITY\n- Design mobile-first and verify the layout mentally at narrow phone, tablet, laptop, and wide desktop widths. No horizontal overflow, clipped content, tiny tap targets, or navigation that disappears without a mobile alternative.\n- Use responsive grids and type scales; ensure forms, dialogs, tables, menus, and previews remain usable on small screens.\n- Respect prefers-reduced-motion. Use restrained transitions and animation only to clarify hierarchy or state.\n\nQUALITY ASSURANCE BEFORE RETURNING\n- Mentally run the app: check the component tree, imports, props, keys, state transitions, event handlers, conditional rendering, and all navigation destinations.\n- Check that every CTA has a valid destination/action, filters actually filter, dialogs can close, forms validate, and responsive navigation works.\n- Ensure the generated result is coherent end-to-end, not just a polished hero. Include enough real sections and content for the requested site type.\n- Do not introduce dependencies, server endpoints, authentication, payment processing, or data persistence that the runtime cannot support. Explain backend-dependent limits in the summary rather than fabricating functionality.\n- Return only files that need to change. Do not exceed 30 file changes. If the request is conversational rather than a code change, return an empty changes array and answer naturally in summary.\n- If the requested result already exists, explain that and return no changes. Never repeat an already-applied or rejected change unless explicitly requested.\n- Ask a concise clarification only when a missing fact makes implementation impossible or could cause a materially wrong result. Otherwise proceed using professional judgment.\n- Do not put the user's instruction verbatim into the website unless they explicitly ask for that wording.";`;

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

async function streamModel(apiKey: string, model: string, messages: { role: string; content: string }[], signal?: AbortSignal) {
  const candidates = [...new Set([model, "nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3.5-super-vl:free", "cohere/north-mini-code:free", "nvidia/nemotron-3.5-lightning:free"])];
  let selected: { reader: ReadableStreamDefaultReader<Uint8Array>; first: Uint8Array; abort: AbortController } | null = null;
  let lastError = "No available model endpoint accepted the request.";

  // Do not let one unresponsive free endpoint hold the builder on its connecting state.
  for (const candidate of candidates) {
    if (signal?.aborted) throw new DOMException("The request was cancelled.", "AbortError");
    const upstreamAbort = new AbortController();
    const abortFromClient = () => upstreamAbort.abort();
    signal?.addEventListener("abort", abortFromClient, { once: true });
    const startedAt = Date.now();
    const timeout = setTimeout(() => upstreamAbort.abort(), 12_000);
    let response: Response | null = null;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: upstreamAbort.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "HTTP-Referer": "https://openforge-dh0r.onrender.com", "X-Title": "OpenForge" },
        body: JSON.stringify({
          model: candidate, messages, temperature: 0.2, max_tokens: 16000, stream: true, response_format: { type: "json_object" },
          ...(["nvidia/nemotron-3.5-super-vl", "nvidia/nemotron-3.5-lightning"].some((prefix) => candidate.startsWith(prefix))
            ? { chat_template_kwargs: { enable_thinking: false } }
            : {}),
        }),
      });
      if (!response.ok || !response.body) {
        const detail = (await response.text()).slice(0, 240);
        lastError = `AI provider returned ${response.status}: ${detail || response.statusText}`;
        if (response.status === 401 || response.status === 402) {
          clearTimeout(timeout);
          signal?.removeEventListener("abort", abortFromClient);
          throw new Error(lastError);
        }
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abortFromClient);
        continue;
      }
      const reader = response.body.getReader();
      // Wait for the first usable assistant content token, not comments, headers, or hidden reasoning.
      const initialChunks: Uint8Array[] = [];
      const initialDecoder = new TextDecoder();
      let initialText = "";
      let gotContent = false;
      while (!gotContent) {
        const part = await reader.read();
        if (part.done || !part.value?.length) break;
        initialChunks.push(part.value);
        initialText += initialDecoder.decode(part.value, { stream: true });
        for (const line of initialText.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const event = JSON.parse(data);
            if (event?.error) throw new Error(event.error.message || "AI provider stream failed.");
            const content = event?.choices?.[0]?.delta?.content;
            if ((typeof content === "string" && content.length > 0) ||
                (Array.isArray(content) && content.some((part: any) => typeof part?.text === "string" && part.text.length > 0))) {
              gotContent = true;
              break;
            }
          } catch (error) {
            if (error instanceof SyntaxError) continue;
            throw error;
          }
        }
      }
      if (!gotContent) {
        await reader.cancel().catch(() => {});
        lastError = `AI model ${candidate} did not produce a usable text token within 12 seconds.`;
        console.error("[OpenForge AI] model attempt failed", { model: candidate, elapsedMs: Date.now() - startedAt, reason: lastError });
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abortFromClient);
        continue;
      }
      const totalLength = initialChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const first = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of initialChunks) { first.set(chunk, offset); offset += chunk.length; }
      clearTimeout(timeout);
      selected = { reader, first, abort: upstreamAbort };
      // Keep the client-abort listener attached for the lifetime of the stream.
      (selected as any).cleanup = () => signal?.removeEventListener("abort", abortFromClient);
      console.info("[OpenForge AI] model selected", { model: candidate, firstTokenMs: Date.now() - startedAt });
      break;
    } catch (error) {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromClient);
      if (signal?.aborted) throw new DOMException("The request was cancelled.", "AbortError");
      if (response?.status === 401 || response?.status === 402) throw error;
      lastError = error instanceof Error && error.name !== "AbortError"
        ? error.message
        : `AI model ${candidate} did not produce a usable text token within 12 seconds. Trying another model.`;
      console.error("[OpenForge AI] model attempt failed", { model: candidate, elapsedMs: Date.now() - startedAt, reason: lastError });
      if (response?.body) await response.body.cancel().catch(() => {});
    }
  }

  if (!selected) throw new Error(`OpenForge could not connect to an AI model. ${lastError} Please try again in a moment.`);

  const { reader, first, abort } = selected;
  const cleanup = (selected as any).cleanup as (() => void) | undefined;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const output = new ReadableStream<Uint8Array>({
    async start(controller) {
      let streamedCharacters = 0;
      let finishReason: string | null = null;
      const consumeLine = (line: string) => {
        if (!line.startsWith("data:")) return;
        const payloadText = line.slice(5).trim();
        if (!payloadText || payloadText === "[DONE]") return;
        try {
          const payload = JSON.parse(payloadText);
          const choice = payload?.choices?.[0];
          if (typeof choice?.finish_reason === "string") finishReason = choice.finish_reason;
          if (finishReason === "length") throw new Error("The AI model reached its output limit before finishing the website files. Your project is unchanged; try asking for the site in smaller sections.");
          const delta = choice?.delta?.content;
          const text = typeof delta === "string" ? delta : Array.isArray(delta) ? delta.map((p: any) => p?.text || "").join("") : "";
          if (text) { streamedCharacters += text.length; controller.enqueue(encoder.encode(text)); }
          if (payload?.error) throw new Error(payload.error.message || "AI provider stream failed.");
        } catch (err) {
          if (err instanceof SyntaxError) return;
          throw err;
        }
      };
      const consumeChunk = (chunk: Uint8Array, final = false) => {
        buffer += decoder.decode(chunk, { stream: !final });
        const lines = buffer.split("\n");
        buffer = final ? "" : (lines.pop() || "");
        for (const line of lines) consumeLine(line.trimEnd());
        if (final && buffer.trim()) consumeLine(buffer.trimEnd());
      };
      try {
        consumeChunk(first);
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          consumeChunk(value);
        }
        const tail = decoder.decode();
        if (tail) {
          buffer += tail;
          const lines = buffer.split("\n");
          for (const line of lines) consumeLine(line.trimEnd());
          buffer = "";
        } else if (buffer.trim()) {
          consumeLine(buffer.trimEnd());
          buffer = "";
        }
        console.info("[OpenForge AI] generation stream completed", { streamedCharacters, finishReason });
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        cleanup?.();
        reader.releaseLock();
      }
    },
    async cancel(reason) {
      abort.abort();
      cleanup?.();
      await reader.cancel(reason).catch(() => {});
    },
  });
  return output;
}

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      GET: async () => {
        const configured = Boolean(process.env.OPENROUTER_API_KEY);
        const configuredModel = process.env.OPENROUTER_MODEL?.trim();
        const model = configuredModel && configuredModel !== "openrouter/free"
          ? configuredModel
          : "nvidia/nemotron-3-ultra-550b-a55b:free";
        return Response.json({ configured, model, fallbackModels: ["cohere/north-mini-code:free", "nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3.5-lightning:free"] });
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

        const configuredModel = process.env.OPENROUTER_MODEL?.trim();
        // Avoid openrouter/free's random routing; use a tested, fast coding-capable default.
        const model = configuredModel && configuredModel !== "openrouter/free"
          ? configuredModel
          : "nvidia/nemotron-3-ultra-550b-a55b:free";
        const fileContext = entries.map(([path, content]) => `--- ${path}\n${content}`).join("\n\n");
        const history = Array.isArray(body.history) ? body.history.slice(-8).filter((m: any) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").map((m: any) => ({ role: m.role, content: m.content.slice(0, 3000) })) : [];
        const context = [
          `PROJECT NAME: ${String(body.projectName || "Untitled project").slice(0, 120)}`,
          `ORIGINAL PROJECT BRIEF: ${String(body.originalBrief || "").slice(0, 4000)}`,
          "CURRENT PROJECT FILES (source of truth):",
          fileContext,
        ].join("\n\n");
        try {
          const stream = await streamModel(apiKey, model, [
            { role: "system", content: SYSTEM },
            { role: "system", content: context },
            ...history,
            { role: "user", content: body.prompt },
          ], request.signal);
          return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "AI request failed." }, { status: 502 });
        }
      },
    },
  },
});
