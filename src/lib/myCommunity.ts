// "My community" claim — lets any pastor tag this browser with their
// community so trophies/XP sync under the right id and "My Console" opens
// their dashboard. Local to the device (the POC has no accounts), defaulting
// to New Jersey (the original pilot console).

import { useSyncExternalStore } from "react";
import { COMMUNITIES } from "@/lib/comebackData";

const KEY = "comeback-my-community";
const DEFAULT_ID = "new-jersey";
const VALID = new Set(COMMUNITIES.map((c) => c.id));
const listeners = new Set<() => void>();

export function myCommunityId(): string {
  if (typeof window === "undefined") return DEFAULT_ID;
  const stored = window.localStorage.getItem(KEY);
  return stored && VALID.has(stored) ? stored : DEFAULT_ID;
}

export function claimCommunity(id: string): void {
  if (!VALID.has(id) || typeof window === "undefined") return;
  window.localStorage.setItem(KEY, id);
  listeners.forEach((fn) => fn());
}

export function useMyCommunity(): string {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => myCommunityId(),
    () => DEFAULT_ID,
  );
}
