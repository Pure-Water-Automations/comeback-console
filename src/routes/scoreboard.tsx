import { createFileRoute } from "@tanstack/react-router";
import { GameNav } from "@/components/game/GameNav";
import { ScoreboardPage } from "@/components/game/scoreboard/ScoreboardPage";

export const Route = createFileRoute("/scoreboard")({
  head: () => ({
    meta: [
      { title: "T2 League Standings - Operation COMEBACK" },
      {
        name: "description",
        content:
          "A gamified regional scoreboard for Operation COMEBACK communities, with sports-league standings, podium leaders, STRATCOM team race, and category champions.",
      },
      { property: "og:title", content: "T2 League Standings" },
      {
        property: "og:description",
        content:
          "Operation COMEBACK's cosmic sports-league scoreboard for ministry community standings.",
      },
    ],
  }),
  component: ScoreboardRoute,
});

function ScoreboardRoute() {
  return (
    <main className="relative min-h-screen bg-[#0a0a0b]">
      <GameNav />
      <ScoreboardPage />
    </main>
  );
}
