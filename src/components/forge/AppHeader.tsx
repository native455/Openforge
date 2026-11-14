import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";

export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card/60 px-4 backdrop-blur">
      <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <Flame className="h-5 w-5 text-primary" aria-hidden /> OpenForge
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      <nav className="flex items-center gap-1 text-sm">
        {[["/", "Projects"], ["/settings", "AI settings"], ["/deploy", "Deploy guide"]].map(([to, l]) => (
          <Link key={to} to={to as "/"} activeOptions={{ exact: true }} className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&.active]:text-foreground">
            {l}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function CostNotice() {
  return (
    <p className="text-xs text-muted-foreground">
      OpenForge itself is free with no plans or paywalls. AI models and hosting come from outside providers, which may charge you or apply their own limits.
    </p>
  );
}