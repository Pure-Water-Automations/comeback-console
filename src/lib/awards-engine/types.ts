import type { Community, CommunitySize } from "@/lib/comebackData";
import type { AwardTone } from "@/lib/weeklyAwards";
import type { MetricId } from "./metricCatalog";

export type EvaluatorId = "metric_rank" | "david" | "triple_header" | "trophy_count";

export type Scope =
  | { type: "all" }
  | { type: "size"; sizes: CommunitySize[] }
  | { type: "list"; communityIds: string[] };

export interface EligibilityRules {
  /** Minimum reported Sunday weeks this month */
  minWeeksReported?: number;
  /** Must have entered data in all three FAB lanes */
  requireAllCategories?: boolean;
  excludeCommunityIds?: string[];
  /** metric_rank / trophy_count: winners need a strictly positive value */
  requirePositive?: boolean;
}

export interface PrizeSpec {
  tier: number; // 1..3
  type: "cash" | "gift_card" | "other";
  valueUsd: number;
  label: string;
}

export interface AwardDef {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  tone: AwardTone;
  evaluator: EvaluatorId;
  metricId?: MetricId;
  scope: Scope;
  tiers: 1 | 3;
  /** "campaign" | "latest-week" | "month:<tab name>" */
  window: string;
  tieBreakers: MetricId[];
  eligibility: EligibilityRules;
  prizes: PrizeSpec[];
  blurb: string;
  status: "draft" | "active" | "archived";
  sort: number;
}

export interface EngineData {
  communities: Community[];
  /** communityId -> trophies unlocked (server-side trophy_events) */
  trophyCounts: Record<string, number>;
}

export interface RunWinner {
  tier: number;
  communityId: string;
  community: string;
  mascot: Community["mascot"];
  statValue: number;
  stat: string;
  detail?: string;
}

export interface Disqualification {
  communityId: string;
  community: string;
  reason: string;
}

export interface AwardRunResult {
  awardId: string;
  winners: RunWinner[];
  disqualified: Disqualification[];
  tieBreaksApplied: string[];
}
