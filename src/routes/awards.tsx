import { createFileRoute } from "@tanstack/react-router";

import { GameNav } from "@/components/game/GameNav";
import { AwardsShow } from "@/components/game/awards/AwardsShow";

export const Route = createFileRoute("/awards")({
  head: () => ({
    meta: [
      { title: "Awards Night — Operation COMEBACK" },
      {
        name: "description",
        content:
          "A full-screen Wednesday Northeast recognition ceremony for Operation COMEBACK weekly awards.",
      },
      { property: "og:title", content: "Awards Night — Operation COMEBACK" },
      {
        property: "og:description",
        content:
          "Operation COMEBACK's ceremonial awards presentation for weekly Northeast recognition.",
      },
    ],
  }),
  component: AwardsRoute,
});

function AwardsRoute() {
  return (
    <main className="relative min-h-screen bg-[#0a0a0b]">
      <GameNav />
      <AwardsShow />
      <a
        href="/awards/admin"
        className="fixed bottom-3 left-4 z-40 text-[10px] uppercase tracking-[0.3em] text-white/25 transition-colors hover:text-white/70"
      >
        Admin
      </a>
    </main>
  );
}
