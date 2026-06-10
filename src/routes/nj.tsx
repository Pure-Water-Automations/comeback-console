import { createFileRoute } from "@tanstack/react-router";

import { NJConsole, type NJTabId, NJ_TAB_IDS } from "@/components/game/nj/NJConsole";

type NJSearch = {
  tab: NJTabId;
};

function tabFromSearch(value: unknown): NJTabId {
  return typeof value === "string" && NJ_TAB_IDS.includes(value as NJTabId)
    ? (value as NJTabId)
    : "overview";
}

export const Route = createFileRoute("/nj")({
  validateSearch: (search: Record<string, unknown>): NJSearch => ({
    tab: tabFromSearch(search.tab),
  }),
  head: () => ({
    meta: [
      { title: "New Jersey Console — Operation COMEBACK" },
      {
        name: "description",
        content:
          "A tabbed command console for New Jersey Family Church pastors tracking Operation COMEBACK finance, attendance, people, Blessing, and quest signals.",
      },
      { property: "og:title", content: "New Jersey Console" },
      {
        property: "og:description",
        content:
          "Operation COMEBACK's New Jersey pastor console with cosmic tabbed dashboards for local action.",
      },
    ],
  }),
  component: NJRoute,
});

function NJRoute() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <main className="relative min-h-screen bg-[#0a0a0b]">
      <NJConsole
        activeTab={tab}
        onTabChange={(nextTab) => {
          void navigate({ search: { tab: nextTab } });
        }}
      />
    </main>
  );
}
