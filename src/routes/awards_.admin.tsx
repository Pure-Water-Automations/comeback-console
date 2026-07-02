import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/game/awards/admin/AdminPage";

export const Route = createFileRoute("/awards_/admin")({
  head: () => ({
    meta: [
      { title: "Awards Admin — Operation COMEBACK" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <main className="relative min-h-screen bg-[#0a0a0b]">
      <AdminPage />
    </main>
  );
}
