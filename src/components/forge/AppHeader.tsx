import { Link } from "@tanstack/react-router";
import { Sparkles, FolderKanban, Settings2, Rocket } from "lucide-react";

export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border/80 bg-white/85 px-4 backdrop-blur-xl sm:px-6">
      <Link to="/" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <span className="text-[15px] font-bold tracking-tight text-foreground">OpenForge</span>
      </Link>
      {children && <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>}
      <nav className="ml-auto flex items-center gap-1 text-sm">
        <Link to="/" activeOptions={{ exact: true }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&.active]:bg-accent [&.active]:font-medium [&.active]:text-accent-foreground">
          <FolderKanban className="h-4 w-4" /><span className="hidden sm:inline">Projects</span>
        </Link>
        <Link to="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&.active]:bg-accent [&.active]:font-medium [&.active]:text-accent-foreground">
          <Settings2 className="h-4 w-4" /><span className="hidden sm:inline">AI engine</span>
        </Link>
        <Link to="/deploy" className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&.active]:bg-accent [&.active]:font-medium [&.active]:text-accent-foreground">
          <Rocket className="h-4 w-4" /><span className="hidden sm:inline">Deploy</span>
        </Link>
      </nav>
    </header>
  );
}

export function CostNotice() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      OpenForge has no subscription or paywall. AI models and hosting are provided by external services and may have their own costs or limits.
    </p>
  );
}