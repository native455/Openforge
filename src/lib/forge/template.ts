import type { Files } from "./changes";

export function starterFiles(name: string, _prompt: string): Files {
  const safe = name.replace(/[\`$\\]/g, "").slice(0, 80) || "Your Website";
  return {
    "/App.tsx": `import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { Contact } from "./components/Contact";

export default function App() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <Hero title="${safe}" />
      <Features />
      <Contact />
      <footer className="border-t border-slate-200 px-6 py-8 text-center text-sm text-slate-500">
        Built with OpenForge
      </footer>
    </main>
  );
}
`,
    "/components/Hero.tsx": `export function Hero({ title }: { title: string }) {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 py-24 text-white sm:py-32">
      <div className="mx-auto max-w-6xl">
        <span className="inline-flex rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium tracking-wide text-violet-200">A fresh start</span>
        <h1 className="mt-8 max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">{title}</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">A thoughtfully designed starting point. OpenForge will shape this into the website you described.</p>
        <a href="#contact" className="mt-9 inline-flex rounded-full bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400">Get in touch</a>
      </div>
    </section>
  );
}
`,
    "/components/Features.tsx": `const items = [
  { number: "01", title: "Made for your idea", body: "A flexible foundation ready to become something distinctly yours." },
  { number: "02", title: "Clear by design", body: "Thoughtful structure, readable typography, and space for what matters." },
  { number: "03", title: "Ready to grow", body: "Responsive sections that work beautifully across screen sizes." },
];

export function Features() {
  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-6 py-20 sm:grid-cols-3">
      {items.map((item) => (
        <article key={item.number} className="border-t border-slate-200 pt-5">
          <span className="text-xs font-semibold tracking-widest text-violet-600">{item.number}</span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">{item.title}</h2>
          <p className="mt-3 leading-7 text-slate-600">{item.body}</p>
        </article>
      ))}
    </section>
  );
}
`,
    "/components/Contact.tsx": `export function Contact() {
  return (
    <section id="contact" className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-widest text-violet-600">Let's talk</p>
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Have something in mind?</h2><p className="mt-3 max-w-lg leading-7 text-slate-600">Tell us what you're looking for and let's make it happen.</p></div>
          <a href="mailto:hello@example.com" className="inline-flex shrink-0 rounded-full bg-slate-950 px-6 py-3 font-medium text-white hover:bg-slate-800">Email us</a>
        </div>
      </div>
    </section>
  );
}
`,
    "/styles.css": `body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }\nhtml { scroll-behavior: smooth; }\n`,
  };
}
