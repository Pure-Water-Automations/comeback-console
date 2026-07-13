// Shared FAQ/rules knowledge base — single source for both the Rulebook's
// FAQ panel and the wizard chat (local matcher + AI system prompt).
// Live-editable in the FAQ Google Sheet (see src/lib/server/liveFaq.ts);
// this array is the fallback when that sheet is unreachable or empty.

export interface FaqEntry {
  id: string;
  topic: string;
  question: string;
  keywords: string[];
  /** Empty when a topic is queued but not yet written — see status. */
  answer: string;
  /** Derived from whether answer is non-empty; needs_content = shown as "coming soon". */
  status: "published" | "needs_content";
  /** Editorial context only — never shown to end users. */
  notes?: string;
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: "fables-overview",
    topic: "FABLES Overview",
    question: "What is FABLES and what are the six growth lanes?",
    keywords: ["fables", "six lanes", "growth lanes", "acronym", "objective", "categories"],
    answer:
      "FABLES is the six-lane growth framework the campaign scores communities on: " +
      "F — Finances (financial health, ownership, and giving), A — Active Members (real participation and connection), " +
      "B — Blessing (step-by-step progress on the Blessing Journey), L — Leadership Development (raising and training emerging leaders), " +
      "E — Environmental Enhancements (community atmosphere and spaces), S — Special Projects (mission-focused initiatives). " +
      "A community's growth is measured by balancing progress across all six lanes, not just one.",
    status: "published",
  },
  {
    id: "finance-scoring",
    topic: "Finances & Income Scoring",
    question: "How are income/finance points calculated?",
    keywords: ["finance", "finances", "income", "money", "giving", "donation", "donations", "point", "points", "scoring", "formula"],
    answer:
      "Income points equal your community's income growth percentage over baseline, multiplied by 10 (Growth % × 10). " +
      "To improve this score: build a culture of financial ownership, log monthly income on time in the Finance tab, " +
      "and aim to keep giving above the trimester's baseline target.",
    status: "published",
  },
  {
    id: "membership-classifications",
    topic: "Active Membership Classifications",
    question: "How does the scoreboard define Core, Active, Inactive, and Archive members?",
    keywords: ["active", "member", "members", "membership", "core", "inactive", "archive", "classification", "attendance", "91", "days"],
    answer:
      "Membership status is based on attendance in the most recent 3-month (91-day) window: " +
      "Core Member = 12 or more attendances in the last 3 months. Active Member = 3 to 11 attendances in the last 3 months. " +
      "Inactive Member = fewer than 3 attendances in the last 3 months. Archive = last attendance was more than 12 months ago. " +
      "These categories only reflect what's recorded, so keep Sunday service and event logs current.",
    status: "published",
  },
  {
    id: "blessing-journey",
    topic: "Blessing Journey Tracker",
    question: "How does the Blessing Journey get scored?",
    keywords: ["blessing", "match", "matching", "journey", "candidate", "ceremony", "education", "singles", "couples"],
    answer:
      "The scoreboard awards points for step-by-step progress along the Blessing Journey, not just for the final ceremony. " +
      "Log every milestone — interest, education, registration, candidate status, matching, and ceremony — so candidates' " +
      "progress is credited monthly instead of only showing up once they're blessed.",
    status: "published",
  },
  {
    id: "les-goals",
    topic: "Leadership, Environment, Special Projects (LES)",
    question: "What are LES goals and how do they work?",
    keywords: ["les", "leadership", "environment", "special projects", "project", "projects", "goal", "goals", "milestones"],
    answer:
      "LES tracks structural growth outside the FABLES point categories: Leadership (training and empowering emerging leaders), " +
      "Environment (facility upkeep and hospitality), and Special Projects (new programs or systems upgrades). Every LES goal " +
      "needs a description, an owner, a target date, a completion date, and visual proof once it's done.",
    status: "published",
  },
  {
    id: "weekly-deadline",
    topic: "Monday 5 PM Sync Deadline",
    question: "When is the weekly data deadline?",
    keywords: ["deadline", "deadlines", "monday", "5", "pm", "est", "sync", "time", "weekly", "update", "updates"],
    answer:
      "All weekly trackers — Sunday attendance, event logs, new registrants, and Blessing progress — must be updated by " +
      "Monday at 5 PM EST. This keeps the regional scoreboard and weekly coaching reviews based on current data.",
    status: "published",
  },
  {
    id: "common-mistakes",
    topic: "Common Scoring Mistakes",
    question: "What are the most common mistakes that hurt a community's score?",
    keywords: ["mistakes", "mistake", "penalties", "penalty", "duplicate", "duplicates", "late", "spelling", "error", "errors", "data"],
    answer:
      "The most common data mistakes that hurt scores: (1) taking attendance but not entering it, (2) not registering " +
      "recurring guests in the Directory, (3) inconsistent name spelling across sheets, which creates duplicate profiles, " +
      "(4) late updates to finance, Blessing progress, or LES goals, and (5) dashboard links pointing to old files. " +
      "Clean, consistent data entry is the single easiest way to improve your score.",
    status: "published",
  },
  {
    id: "baselines-trimesters",
    topic: "Baselines and Trimester Loops",
    question: "How do baselines and trimesters work?",
    keywords: ["baseline", "baselines", "trimester", "target", "targets", "reset", "resets", "grow", "growth"],
    answer:
      "Every community's baseline is its own starting point for the trimester — growth is measured against where YOUR " +
      "community started, not against other communities' totals. A small community can win by growing significantly " +
      "relative to its own baseline, even with much smaller absolute numbers than a large community. Baselines reset " +
      "at the start of each new trimester.",
    status: "published",
  },
  {
    id: "directory-source-of-truth",
    topic: "Directory - Source of Truth",
    question: "Why does the Directory matter so much?",
    keywords: ["directory", "database", "people", "truth", "names", "register", "registration", "guest", "guests"],
    answer:
      "The Directory is the single source of truth for every member's and guest's identity. If a name, guest status, " +
      "or date is misspelled or inconsistent, the dashboard will misread your community's real activity. Make sure every " +
      "repeat attendee is properly registered so their record doesn't get lost or duplicated.",
    status: "published",
  },
  {
    id: "income-pending",
    topic: "Why Income Sometimes Shows Pending",
    question: "Why does my income sometimes show \"Pending\" instead of a dollar amount?",
    keywords: ["pending", "income", "not reported", "blank", "missing", "zero"],
    answer:
      "Income typically isn't finalized and posted to the scoreboard until about the 15th of the following month. " +
      "If your community's Current Income shows \"Pending\" instead of a dollar figure, that just means this month's " +
      "number hasn't been reported yet — it is NOT the same as reporting zero, and it does not count against your score. " +
      "It updates automatically once the number is entered.",
    status: "published",
  },
  {
    id: "what-counts-as-an-event",
    topic: "What Counts as an Event",
    question: "What counts as an event for attendance/scoring purposes?",
    keywords: ["event", "events", "qualify", "count", "counts"],
    answer: "",
    status: "needs_content",
    notes:
      "Pastors have asked this directly. Needs a clear answer: what qualifies as a countable \"event\" versus a casual " +
      "gathering, and does it count toward Active Member attendance the same way a Sunday service does?",
  },
  {
    id: "guest-to-member-conversion",
    topic: "Guest to Member Conversion",
    question: "How does a guest officially become an active member?",
    keywords: ["guest", "guests", "become", "member", "conversion", "convert"],
    answer: "",
    status: "needs_content",
    notes:
      "Pastors have asked this directly. There's also a known Directory bug where first/last names swap and block guests " +
      "from correctly showing as members — worth confirming the intended process actually works before finalizing this answer.",
  },
];
