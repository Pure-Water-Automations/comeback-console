import { createFileRoute } from "@tanstack/react-router";

import { GameNav } from "@/components/game/GameNav";
import { DashboardPage } from "@/components/game/dashboard/DashboardPage";
import { COMMUNITIES } from "@/lib/comebackData";

const DEFAULT_COMMUNITY_ID = "new-jersey";

type DashboardSearch = {
  community: string;
};

function communityIdFromSearch(value: unknown) {
  return typeof value === "string" && COMMUNITIES.some((community) => community.id === value)
    ? value
    : DEFAULT_COMMUNITY_ID;
}

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    community: communityIdFromSearch(search.community),
  }),
  head: () => ({
    meta: [
      { title: "Pastor's Command Center - Operation COMEBACK" },
      {
        name: "description",
        content:
          "A local stats dashboard for Operation COMEBACK pastors, showing community score gauges, Sunday Service attendance, quests, achievements, and coaching tips.",
      },
      { property: "og:title", content: "Pastor's Command Center" },
      {
        property: "og:description",
        content:
          "Operation COMEBACK's cosmic local command center for pastors tracking community momentum.",
      },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { community } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <main className="relative min-h-screen bg-[#0a0a0b]">
      <GameNav />
      <DashboardPage
        selectedCommunityId={community}
        onCommunityChange={(communityId) => {
          void navigate({ search: { community: communityId } });
        }}
      />
    </main>
  );
}
