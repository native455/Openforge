import { Link } from "@tanstack/react-router";
import { Sparkles, FolderKanban, Settings2, Rocket, ChevronDown, Command } from "lucide-react";

export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 flex h-[68px] shrink-0 items-center gap-4 border-b border-white/[0.08] bg-[#0b0d12]/90 px-4 text-white shadow-[0_8px_30px_-22px_rgba(0,0,0,.9)] backdrop-blur-2xl sm:px-6">
      <Link to="/" className="group flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
        <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-400 via-violet-600 to-indigo-700 text-white shadow-[0_6px_24px_-8px_rgba(139,92,246,.8)] transition duration-300 group-hover:rotate-[-6deg] group-hover:scale-105">
          <Sparkles className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="text-[16px] font-semibold tracking-[-0.045em]">OpenForge<span className="ml-1 text-violet-400">.</span></span>
      </Link>
      {children && <div className="flex min-w-0 flex-1 items-center gap-2 border-l border-white/10 pl-4 text-sm text-slate-400">{children}</div>}
      <nav className="ml-auto flex items-center gap-1 text-[13px]">
        <Link to="/" activeOptions={{ exact: true }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-ring [&.active]:bg-white/[0.08] [&.active]:font-medium [&.active]:text-white">
          <FolderKanban className="h-4 w-4" /><span className="hidden sm:inline">Projects</span>
        </Link>
        <Link to="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-ring [&.active]:bg-white/[0.08] [&.active]:font-medium [&.active]:text-white">
          <Settings2 className="h-4 w-4" /><span className="hidden sm:inline">AI engine</span>
        </Link>
        <Link to="/deploy" className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-ring [&.active]:bg-white/[0.08] [&.active]:font-medium [&.active]:text-white">
          <Rocket className="h-4 w-4" /><span className="hidden sm:inline">Publish</span>
        </Link>
        <span className="ml-2 hidden h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-[11px] text-slate-400 lg:inline-flex"><Command className="h-3 w-3" /> Workspace <ChevronDown className="h-3 w-3" /></span>
      </nav>
    </header>
  );
}

export function CostNotice() {
  return (
    <p className="text-xs leading-relaxed text-slate-500">
      No OpenForge subscription. AI models and hosting are provided by external services and may have their own costs or limits.
    </p>
  );
}
