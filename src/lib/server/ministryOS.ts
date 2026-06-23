// Best-effort bridge: push a captured guest to the Ministry OS CRM
// (event-planner-webapp) so a Sunday check-in / guest capture becomes a real
// contact there — tagged by source and ready for a follow-up pipeline.
//
// Env-gated and NON-FATAL by design: if MINISTRY_OS_URL / MINISTRY_OS_KEY are
// unset, or the call fails/times out, this silently no-ops so COMEBACK's own
// guest-capture flow (the Action Queue sheet) is never affected.
//
//   MINISTRY_OS_URL=https://planner.pwasecondbrain.uk
//   MINISTRY_OS_KEY=mos_...   (create under Ministry OS → CRM → Integrations)

export interface MinistryGuest {
  firstName: string;
  lastName?: string;
  firstSunday?: string;
  notes?: string;
  phone?: string;
  email?: string;
}

export async function pushGuestToMinistryOS(guest: MinistryGuest): Promise<void> {
  const base = process.env.MINISTRY_OS_URL;
  const key = process.env.MINISTRY_OS_KEY;
  if (!base || !key) return; // integration not configured — no-op

  try {
    const name = [guest.firstName, guest.lastName].filter(Boolean).join(" ").trim();
    if (!name && !guest.email) return;
    const noteParts = [
      guest.firstSunday ? `First Sunday: ${guest.firstSunday}` : "",
      guest.notes || "",
    ].filter(Boolean);

    await fetch(`${base.replace(/\/$/, "")}/api/integrations/contacts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "Operation COMEBACK",
        contacts: [{
          name,
          email: guest.email,
          phone: guest.phone,
          tags: ["guest", "operation-comeback"],
          stage: "Guest",
          source: "COMEBACK guest capture",
          notes: noteParts.join(" — ") || undefined,
        }],
      }),
      // Keep the capture snappy — drop the push if Ministry OS is slow.
      signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined,
    });
  } catch {
    /* best-effort — never break guest capture */
  }
}
