// Global game navigation — Awards · Standings · Rulebook · My Console · NJ.
// Fixed top-right chip row per DESIGN_BRIEF (bordered, backdrop-blur, no radius).

import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/awards", label: "Awards" },
  { to: "/scoreboard", label: "Standings" },
  { to: "/", label: "Rulebook" },
  { to: "/dashboard", label: "My Console" },
  { to: "/nj", label: "NJ Console" },
] as const;

export function GameNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed right-4 top-4 z-50 flex flex-wrap items-center justify-end gap-2">
      {LINKS.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          className={cn(
            "border px-4 py-2 text-xs uppercase tracking-[0.3em] backdrop-blur-md transition-colors",
            pathname === link.to
              ? "border-white/50 bg-white/10 text-white"
              : "border-white/15 bg-black/60 text-white/80 hover:border-white/40 hover:text-white",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
