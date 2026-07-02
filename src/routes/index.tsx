import { createFileRoute } from "@tanstack/react-router";
import { CosmicRules } from "@/components/game/CosmicRules";
import { GameNav } from "@/components/game/GameNav";

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
      <GameNav />
      <CosmicRules />
    </main>
  );
}
