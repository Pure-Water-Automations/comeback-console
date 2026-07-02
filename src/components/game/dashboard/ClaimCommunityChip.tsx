// "Make this my community" — tags this browser with the pastor's community so
// console trophies/XP sync under the right id and My Console opens here.

import { Star } from "lucide-react";
import { claimCommunity, useMyCommunity } from "@/lib/myCommunity";
import { cn } from "@/lib/utils";

export function ClaimCommunityChip({ communityId }: { communityId: string }) {
  const mine = useMyCommunity();
  const claimed = mine === communityId;
  return (
    <button
      type="button"
      disabled={claimed}
      onClick={() => claimCommunity(communityId)}
      className={cn(
        "inline-flex items-center gap-2 border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] transition-colors",
        claimed
          ? "border-amber-200/50 bg-amber-300/10 text-amber-100"
          : "border-white/15 bg-black/60 text-white/60 hover:border-white/40 hover:text-white",
      )}
    >
      <Star className={cn("size-3.5", claimed && "fill-amber-200 text-amber-200")} />
      {claimed ? "Your community" : "Make this my community"}
    </button>
  );
}
