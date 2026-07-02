// Awards admin — passcode gate + tabbed shell (Awards / Prizes / Issuances /
// Audit). The passcode lives in sessionStorage and every server fn re-checks
// it server-side; this gate is a UX convenience, not the security boundary.

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminState } from "@/lib/awardsAdminApi";
import { GameNav } from "@/components/game/GameNav";
import { AwardDefsPanel } from "./AwardDefsPanel";
import { PrizesPanel } from "./PrizesPanel";
import { IssuancesPanel } from "./IssuancesPanel";
import { AuditPanel } from "./AuditPanel";

const PASS_KEY = "comeback-admin-passcode";

function getPasscode(): string {
  return typeof window === "undefined" ? "" : sessionStorage.getItem(PASS_KEY) ?? "";
}

export function AdminPage() {
  const [passcode, setPasscode] = useState(getPasscode);
  const [input, setInput] = useState("");
  const queryClient = useQueryClient();

  const state = useQuery({
    queryKey: ["admin-state", passcode],
    queryFn: () => adminState({ data: { passcode } }),
    enabled: passcode.length > 0,
    retry: false,
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin-state"] });

  if (!passcode || state.isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-4">
        <GameNav />
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-signal">Awards Admin</p>
        <h1 className="display text-4xl uppercase text-white">Enter Passcode</h1>
        {state.isError ? (
          <p className="text-sm text-rose-300">That passcode was not accepted.</p>
        ) : null}
        <form
          className="flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem(PASS_KEY, input);
            setPasscode(input);
          }}
        >
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Admin passcode"
            className="w-full border border-white/15 bg-black/60 px-3 py-2 text-white outline-none focus:border-white/40"
          />
          <button
            type="submit"
            className="border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-white hover:bg-white/20"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  if (!state.data) {
    return <p className="p-10 text-white/50">Loading admin console…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
      <GameNav />
      <p className="text-xs font-bold uppercase tracking-[0.4em] text-signal">Recognition Engine</p>
      <h1 className="display mt-2 text-5xl uppercase text-white">Awards Admin</h1>
      <Tabs defaultValue="awards" className="mt-8">
        <TabsList className="grid h-auto w-full grid-cols-4 gap-px border border-white/10 bg-black/70 p-0 text-white/50 backdrop-blur-md">
          <TabsTrigger value="awards">Awards</TabsTrigger>
          <TabsTrigger value="prizes">Prizes</TabsTrigger>
          <TabsTrigger value="issuances">Issuances</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>
        <TabsContent value="awards">
          <AwardDefsPanel state={state.data} passcode={passcode} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="prizes">
          <PrizesPanel state={state.data} passcode={passcode} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="issuances">
          <IssuancesPanel state={state.data} passcode={passcode} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="audit">
          <AuditPanel state={state.data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
