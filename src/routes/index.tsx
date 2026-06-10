import { createFileRoute } from "@tanstack/react-router";
import { CosmicRules } from "@/components/game/CosmicRules";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rules of the Game — Scroll Animation" },
      {
        name: "description",
        content:
          "A scroll-driven, scene-based walkthrough of the rules of the game, told through scaling circles, distance lines and kinetic Helvetica type on a dark cosmic field.",
      },
      { property: "og:title", content: "Rules of the Game" },
      {
        property: "og:description",
        content: "A cosmic, scroll-driven circle animation explaining the rules of the game.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative min-h-screen bg-[#0a0a0b]">
      <nav className="fixed right-4 top-4 z-50 flex items-center gap-2">
        <a
          href="/awards"
          className="border border-white/15 bg-black/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
        >
          Awards
        </a>
        <a
          href="/scoreboard"
          className="border border-white/15 bg-black/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
        >
          Standings
        </a>
        <a
          href="/dashboard"
          className="border border-white/15 bg-black/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
        >
          My Dashboard
        </a>
        <a
          href="/nj"
          className="border border-white/15 bg-black/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 backdrop-blur-md transition-colors hover:border-white/40 hover:text-white"
        >
          NJ Console
        </a>
      </nav>
      <CosmicRules />
    </main>
  );
}
