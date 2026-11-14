import type { Files } from "./changes";

export function starterFiles(name: string, prompt: string): Files {
  const safe = name.replace(/[`$\\]/g, "");
  const idea = prompt.replace(/[`$\\]/g, "").slice(0, 200);
  return {
    "/App.tsx": `import { Hero } from "./components/Hero";
import { Features } from "./components/Features";

export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Hero title="${safe}" />
      <Features />
    </main>
  );
}
`,
    "/components/Hero.tsx": `export function Hero({ title }: { title: string }) {
  return (
    <section className="px-6 py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight">{title}</h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-400">${idea || "Describe your idea in the chat to start building."}</p>
      <button className="mt-8 rounded-lg bg-amber-500 px-5 py-2.5 font-medium text-slate-950 hover:bg-amber-400">Get started</button>
    </section>
  );
}
`,
    "/components/Features.tsx": `const items = [
  { title: "Fast", body: "Built with React and Tailwind." },
  { title: "Typed", body: "TypeScript from the start." },
  { title: "Yours", body: "Export the code anytime." },
];

export function Features() {
  return (
    <section className="mx-auto grid max-w-4xl gap-4 px-6 pb-24 sm:grid-cols-3">
      {items.map((i) => (
        <div key={i.title} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="font-semibold">{i.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{i.body}</p>
        </div>
      ))}
    </section>
  );
}
`,
    "/styles.css": `body { margin: 0; font-family: system-ui, sans-serif; }\n`,
  };
}