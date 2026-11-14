import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/forge/AppHeader";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/deploy")({
  head: () => ({
    meta: [
      { title: "Deploy guide — OpenForge" },
      { name: "description", content: "How to take an exported OpenForge project and host it on Render as a static site." },
      { property: "og:title", content: "Deploy guide — OpenForge" },
      { property: "og:description", content: "Host an exported OpenForge project on Render." },
    ],
  }),
  component: Deploy,
});

const Code = ({ children }: { children: string }) => <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-card p-3 font-mono text-xs">{children}</pre>;

function Deploy() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-sm leading-relaxed">
        <div>
          <h1 className="text-2xl font-bold">Deploy your project</h1>
          <p className="mt-1 text-muted-foreground">OpenForge doesn't deploy for you yet. Here's the manual path. Hosting providers have their own free tiers, limits and prices.</p>
        </div>
        <section>
          <h2 className="text-lg font-semibold">1. Export and set up locally</h2>
          <p className="text-muted-foreground">In the builder, click <b>Export ZIP</b>. Then:</p>
          <Code>{`npm create vite@latest my-app -- --template react-ts
cd my-app && npm install
npm install -D tailwindcss @tailwindcss/vite
# copy the exported src/ files into my-app/src (App.tsx, components/…)
# add tailwindcss() to vite.config.ts plugins and @import "tailwindcss"; in src/index.css
npm run build`}</Code>
        </section>
        <section>
          <h2 className="text-lg font-semibold">2. Push to GitHub</h2>
          <Code>{`git init && git add . && git commit -m "Initial"
git remote add origin https://github.com/<you>/my-app.git
git push -u origin main`}</Code>
        </section>
        <section>
          <h2 className="text-lg font-semibold">3. Render static site</h2>
          <p className="text-muted-foreground">Render → New → Static Site → pick the repo. Or add this <code className="font-mono">render.yaml</code> to the repo root:</p>
          <Code>{`services:
  - type: web
    name: my-app
    runtime: static
    buildCommand: npm ci && npm run build
    staticPublishPath: ./dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html`}</Code>
        </section>
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2"><h2 className="font-semibold">GitHub export & one-click deploy</h2><Badge variant="secondary">Coming next</Badge></div>
          <p className="mt-1 text-muted-foreground">Pushing straight to GitHub needs proper OAuth and secure token handling, which isn't built yet. Until then, use the ZIP export above.</p>
        </section>
      </main>
    </div>
  );
}