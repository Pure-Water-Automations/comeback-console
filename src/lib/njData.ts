// New Jersey Family Church — local console data snapshot.
// Pulled from the live 2026 NJ workbooks (Dashboard, Directory, Attendance,
// Blessing, LES Development) on 2026-06-09. POC snapshot — a future version
// would read these through a small sync job instead of a static module.
// Contact info is deliberately excluded; guests appear by first name only.

export const NJ_PROFILE = {
  name: "New Jersey Family Church",
  shortName: "New Jersey",
  address: "78 DeMott Ave, Clifton, NJ 07011",
  ownership: "Own",
  capacity: 250,
  sizeTier: "Extra Large",
  team: "NE",
  pastors: [
    { name: "Barbara Robertson", role: "Lead Pastor" },
    { name: "Atsushi Takino", role: "Associate Pastor" },
    { name: "Jake Lavina", role: "Next Gen Pastor" },
  ],
} as const;

// ---------------------------------------------------------------------------
// Finance (Dashboard → Finance tab). USD, by month.
// ---------------------------------------------------------------------------

export interface FinanceMonth {
  month: string; // "Jan" ... "Dec"
  donationIncome: number;
  otherIncome: number; // non-donation + transfer
  totalIncome: number;
  payroll: number;
  facility: number;
  program: number;
  tithe: number;
  totalExpense: number;
  net: number;
}

/** 2026 months with data entered (June is partial — month in progress) */
export const FINANCE_2026: FinanceMonth[] = [
  { month: "Jan", donationIncome: 51328, otherIncome: 14310, totalIncome: 65637, payroll: 29131, facility: 5179, program: 11499, tithe: 550, totalExpense: 46359, net: 19278 },
  { month: "Feb", donationIncome: 56962, otherIncome: 15140, totalIncome: 72101, payroll: 32817, facility: 5914, program: 29432, tithe: 0, totalExpense: 68163, net: 3938 },
  { month: "Mar", donationIncome: 62884, otherIncome: 11014, totalIncome: 73897, payroll: 33546, facility: 8721, program: 13341, tithe: 0, totalExpense: 55608, net: 18289 },
  { month: "Apr", donationIncome: 61629, otherIncome: 33678, totalIncome: 95306, payroll: 29612, facility: 2788, program: 14614, tithe: 0, totalExpense: 47013, net: 48293 },
  { month: "May", donationIncome: 56332, otherIncome: 4065, totalIncome: 60397, payroll: 32003, facility: 6760, program: 14433, tithe: 0, totalExpense: 53196, net: 7201 },
  { month: "Jun", donationIncome: 4755, otherIncome: 0, totalIncome: 4755, payroll: 0, facility: 2935, program: 382, tithe: 0, totalExpense: 3317, net: 1438 },
];

/** 2025 monthly average, the natural comparison line */
export const FINANCE_2025_AVG = { donationIncome: 56148, totalIncome: 62696, totalExpense: 60740, net: 1956 } as const;

/** Months whose books are complete (June is in progress) */
export const FINANCE_COMPLETE_THROUGH = "May";

// ---------------------------------------------------------------------------
// Attendance (Dashboard → Attendance tab + Attendance workbook charts)
// ---------------------------------------------------------------------------

export interface AttendanceMonth {
  month: string;
  sundayInPerson: number;
  sundayOnline: number;
  sundayTotal: number; // avg weekly Sunday Service
  otherEvents: number;
}

export const ATTENDANCE_2026: AttendanceMonth[] = [
  { month: "Jan", sundayInPerson: 129, sundayOnline: 54, sundayTotal: 183, otherEvents: 113 },
  { month: "Feb", sundayInPerson: 138, sundayOnline: 73, sundayTotal: 211, otherEvents: 234 },
  { month: "Mar", sundayInPerson: 161, sundayOnline: 95, sundayTotal: 256, otherEvents: 153 },
  { month: "Apr", sundayInPerson: 164, sundayOnline: 59, sundayTotal: 223, otherEvents: 113 },
  { month: "May", sundayInPerson: 171, sundayOnline: 84, sundayTotal: 255, otherEvents: 2 },
  { month: "Jun", sundayInPerson: 122, sundayOnline: 89, sundayTotal: 211, otherEvents: 18 },
];

/** Weekly Sunday Service headcounts, Jan 4 through Jun 7 (last recorded week) */
export const WEEKLY_SUNDAY_2026: { week: string; count: number }[] = [
  { week: "1/4", count: 289 },
  { week: "1/11", count: 246 },
  { week: "1/18", count: 149 },
  { week: "1/25", count: 49 },
  { week: "2/1", count: 199 },
  { week: "2/8", count: 176 },
  { week: "2/15", count: 218 },
  { week: "2/22", count: 252 },
  { week: "3/1", count: 288 },
  { week: "3/8", count: 191 },
  { week: "3/15", count: 290 },
  { week: "3/22", count: 302 },
  { week: "3/29", count: 208 },
  { week: "4/5", count: 244 },
  { week: "4/12", count: 286 },
  { week: "4/19", count: 238 },
  { week: "4/26", count: 124 },
  { week: "5/3", count: 232 },
  { week: "5/10", count: 234 },
  { week: "5/17", count: 252 },
  { week: "5/24", count: 235 },
  { week: "5/31", count: 321 },
  { week: "6/7", count: 211 },
];

// ---------------------------------------------------------------------------
// Membership (Directory workbook → Membership Charts)
// ---------------------------------------------------------------------------

export const MEMBERSHIP = {
  activityLevels: { core: 90, active: 293, inactive: 288, archived: 0 },
  activeByGender: { male: 147, female: 181 },
  activeByLineage: { g1: 214, g2: 91, g3: 14 },
  activeByAge: { "0-18": 25, "19-39": 68, "40-59": 51, "60+": 163 },
  activeByBlessing: { g1: 190, "g2+": 35 },
  activeByTenure: { "0-3 mo": 4, "4-11 mo": 33, "12+ mo": 262 },
} as const;

/**
 * Guest funnel (Attendance workbook → Guest Tracker totals).
 * 1,164 guests have touched the community; almost none have advanced past
 * attending — the single biggest pastoral opportunity in the data.
 */
export const GUEST_FUNNEL = [
  { stage: "On Guest List", count: 1164 },
  { stage: "Attended Sunday Service", count: 1050 },
  { stage: "Orientation", count: 0 },
  { stage: "Registration", count: 0 },
  { stage: "Full Membership", count: 0 },
] as const;

/** Sample of recent guest first names (no contact info in this POC) */
export const RECENT_GUESTS = [
  { firstName: "Alyson", firstSunday: "10/19/25" },
  { firstName: "Asanji", firstSunday: "12/7/25" },
  { firstName: "Assi", firstSunday: "12/7/25" },
  { firstName: "Bell", firstSunday: "12/21/25" },
  { firstName: "Beth", firstSunday: "11/30/25" },
  { firstName: "Bin", firstSunday: "10/5/25" },
  { firstName: "Bryant", firstSunday: "11/30/25" },
  { firstName: "Carol", firstSunday: "11/16/25" },
  { firstName: "Clementina", firstSunday: "12/21/25" },
] as const;

// ---------------------------------------------------------------------------
// Blessing Journey (Dashboard → Blessing tab). Monthly pipeline state.
// ---------------------------------------------------------------------------

export interface BlessingMonth {
  month: string;
  eligibleSingles: number;
  hjbgRegistered: number;
  pctAnnualGoal: number; // e.g. 166.7
  candidate: number;
  inConversation: number;
  engaged: number;
  registered: number;
}

export const BLESSING_2026: BlessingMonth[] = [
  { month: "Jan", eligibleSingles: 173, hjbgRegistered: 48, pctAnnualGoal: 133.3, candidate: 21, inConversation: 11, engaged: 6, registered: 0 },
  { month: "Feb", eligibleSingles: 180, hjbgRegistered: 55, pctAnnualGoal: 152.8, candidate: 27, inConversation: 12, engaged: 8, registered: 1 },
  { month: "Mar", eligibleSingles: 183, hjbgRegistered: 57, pctAnnualGoal: 158.3, candidate: 34, inConversation: 13, engaged: 8, registered: 8 },
  { month: "Apr", eligibleSingles: 184, hjbgRegistered: 59, pctAnnualGoal: 163.9, candidate: 36, inConversation: 13, engaged: 9, registered: 8 },
  { month: "May", eligibleSingles: 184, hjbgRegistered: 60, pctAnnualGoal: 166.7, candidate: 36, inConversation: 13, engaged: 10, registered: 8 },
  { month: "Jun", eligibleSingles: 184, hjbgRegistered: 60, pctAnnualGoal: 166.7, candidate: 37, inConversation: 13, engaged: 10, registered: 8 },
];

// ---------------------------------------------------------------------------
// LES quests (LES Development workbook trackers). Cleaned of sheet artifacts.
// ---------------------------------------------------------------------------

export interface LesQuest {
  lane: "Leadership" | "Environment" | "Special Projects";
  month: string;
  title: string;
  targetDate?: string;
  completedDate?: string;
}

export const LES_QUESTS: LesQuest[] = [
  { lane: "Leadership", month: "Jan", title: "10 people enroll in Accelerate 2.0", targetDate: "2/14/26", completedDate: "4/22/26" },
  { lane: "Leadership", month: "Jan", title: "3 participants joining NJ Mission Program", targetDate: "3/1/26" },
  { lane: "Leadership", month: "Feb", title: "4-day spirituality workshop", targetDate: "2/16/26", completedDate: "2/18/26" },
  { lane: "Leadership", month: "Mar", title: "Accelerate 2.0 cohort", targetDate: "2/14/26", completedDate: "2/14/26" },
  { lane: "Environment", month: "Jan", title: "Kitchen cupboard replacement estimate", targetDate: "1/31/26", completedDate: "3/1/26" },
  { lane: "Environment", month: "Jan", title: "Home Base painting project finish", targetDate: "3/31/26" },
  { lane: "Environment", month: "Feb", title: "CheonBo Great Works", targetDate: "2/7/26", completedDate: "2/7/26" },
  { lane: "Environment", month: "Mar", title: "Replace damaged outdoor sign", targetDate: "3/30/26" },
  { lane: "Environment", month: "Mar", title: "Replace defective radiators + paint CSW walls", targetDate: "3/30/26" },
  { lane: "Environment", month: "Mar", title: "Repair damaged exterior wall", targetDate: "4/5/26" },
  { lane: "Special Projects", month: "Jan", title: "ACLC Prayer Breakfast", targetDate: "3/21/26", completedDate: "3/21/26" },
  { lane: "Special Projects", month: "Jan", title: "NJ Next Gen Assembly", targetDate: "1/31/26" },
  { lane: "Special Projects", month: "Feb", title: "PSWM Alliance event", targetDate: "2/21/26" },
  { lane: "Special Projects", month: "Feb", title: "TP Holy Birthday CheonBo registration ceremony", targetDate: "2/1/26", completedDate: "2/1/26" },
  { lane: "Special Projects", month: "Mar", title: "Family Home Night", targetDate: "3/27/26" },
  { lane: "Special Projects", month: "Mar", title: "Meeting with Rev. Kajikuri", targetDate: "3/29/26" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function latestBlessing(): BlessingMonth {
  return BLESSING_2026[BLESSING_2026.length - 1];
}

export function questStats() {
  const total = LES_QUESTS.length;
  const done = LES_QUESTS.filter((q) => q.completedDate).length;
  return { total, done, open: total - done };
}

export function ytdFinance() {
  const complete = FINANCE_2026.filter((m) => m.month !== "Jun");
  const income = complete.reduce((s, m) => s + m.totalIncome, 0);
  const expense = complete.reduce((s, m) => s + m.totalExpense, 0);
  return { income, expense, net: income - expense, months: complete.length };
}

export const SNAPSHOT_DATE = "2026-06-09";

export const SOURCE_SHEETS = [
  { label: "2026 Dashboard New Jersey", id: "1lbrRXNTBD28jnXmV3xW1fVXIaIDnKfNmWd5VUcqlOUY" },
  { label: "2026 New Jersey Attendance", id: "1PR9YNHFi7BT_F09UkjSM2slpFN1ZWWQk-Y9FVZLK2bg" },
  { label: "2026 New Jersey Directory", id: "1p_gyuEnNackRBNFfTFUs4C-TpuDtFkdkvmZlAXvtR3I" },
  { label: "2026 New Jersey Blessing", id: "12SOVoxL6bnnv4LaphpiNovu_jU0TepT7Mdx3ItCVc08" },
  { label: "2026 New Jersey LES Development", id: "1x06-r8SSwJnOaW7oHl-5RHyYQLrkBm_Ch1CpwWH85rc" },
] as const;
