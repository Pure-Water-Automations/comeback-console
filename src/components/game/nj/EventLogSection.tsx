import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2, Loader2, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import {
  addEvent,
  checkInEvent,
  listEvents,
  searchEventRoster,
  type EventColumn,
  type RosterPerson,
} from "@/lib/njActions";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const CARD = "border border-white/10 bg-black/60 backdrop-blur-md";
const CONTROL =
  "h-11 w-full border border-white/10 bg-black/70 px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-100/45 disabled:cursor-not-allowed disabled:opacity-50";
const ACTION_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 border border-violet-200/30 bg-violet-300/10 px-4 text-[10px] font-bold uppercase tracking-[0.28em] text-violet-100 transition hover:bg-violet-300/15 disabled:cursor-not-allowed disabled:opacity-40";

function toastResult(ok: boolean, message?: string) {
  if (!message) return;
  if (ok) {
    toast.success(message);
  } else {
    toast.error(message);
  }
}

function PersonTypeChip({ type }: { type: string }) {
  const normalized = type.trim() || "Person";
  const isGuest = normalized.toLowerCase().includes("guest");

  return (
    <span
      className={cn(
        "border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.24em]",
        isGuest
          ? "border-amber-200/30 bg-amber-300/10 text-amber-100"
          : "border-violet-200/25 bg-violet-300/10 text-violet-100",
      )}
    >
      {normalized}
    </span>
  );
}

export function EventLogSection() {
  const [events, setEvents] = useState<EventColumn[]>([]);
  const [selectedCol, setSelectedCol] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventDate, setEventDate] = useState("");
  const [eventName, setEventName] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RosterPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [party, setParty] = useState<RosterPerson[]>([]);
  const [checkingIn, setCheckingIn] = useState(false);

  const selectedEvent = useMemo(
    () => events.find((event) => event.col === selectedCol),
    [events, selectedCol],
  );
  const visibleEvents = useMemo(() => events.slice(-5).reverse(), [events]);

  const refreshEvents = useCallback(async (preferredCol?: string) => {
    setLoadingEvents(true);
    try {
      const res = await listEvents();
      if (!res.ok) {
        toastResult(false, res.message);
        return;
      }

      setEvents(res.events);
      setSelectedCol((current) => {
        if (preferredCol && res.events.some((event) => event.col === preferredCol)) {
          return preferredCol;
        }
        if (current && res.events.some((event) => event.col === current)) {
          return current;
        }
        return res.events[res.events.length - 1]?.col ?? "";
      });
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    void refreshEvents();
  }, [refreshEvents]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const res = await searchEventRoster({ data: { query: trimmed } });
      if (cancelled) return;

      if (res.ok) {
        setResults(res.people);
      } else {
        setResults([]);
        toastResult(false, res.message);
      }
      setSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const addToParty = (person: RosterPerson) => {
    setParty((current) => {
      if (current.some((member) => member.row === person.row)) return current;
      return [...current, person];
    });
  };

  const removeFromParty = (row: number) => {
    setParty((current) => current.filter((person) => person.row !== row));
  };

  const handleAddEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (addingEvent) return;

    setAddingEvent(true);
    try {
      const res = await addEvent({ data: { date: eventDate, name: eventName } });
      toastResult(res.ok, res.message);
      if (res.ok) {
        setEventDate("");
        setEventName("");
        await refreshEvents(res.col);
      }
    } finally {
      setAddingEvent(false);
    }
  };

  const handleCheckIn = async () => {
    if (checkingIn || !selectedCol || party.length === 0) return;

    setCheckingIn(true);
    try {
      const res = await checkInEvent({
        data: { col: selectedCol, rows: party.map((person) => person.row) },
      });
      toastResult(res.ok, res.message);
      if (res.ok) {
        setParty([]);
        await refreshEvents(selectedCol);
      }
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <motion.section
      className={cn(CARD, "relative overflow-hidden p-4 md:p-5")}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.62, delay: 0.06, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 18%, rgba(168,85,247,0.17), transparent 34%), radial-gradient(circle at 82% 72%, rgba(234,179,8,0.1), transparent 32%)",
        }}
      />

      <div className="relative">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-violet-100">Field actions</p>
            <h3 className="mt-2 text-3xl font-bold uppercase tracking-[-0.03em] text-white md:text-5xl">
              Event log
            </h3>
          </div>
          <div className="border border-violet-200/25 bg-violet-300/10 px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/42">Selected total</p>
            <p className="mt-1 font-mono text-3xl font-bold text-white">
              {selectedEvent ? selectedEvent.total.toLocaleString("en-US") : "--"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(300px,0.72fr)]">
          <div className="space-y-4">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">Recent events</p>
                {loadingEvents ? <Loader2 className="size-4 animate-spin text-violet-100" /> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleEvents.map((event) => (
                  <button
                    key={event.col}
                    type="button"
                    className={cn(
                      "max-w-[220px] border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40",
                      selectedCol === event.col
                        ? "border-violet-100/70 bg-violet-300/15 text-white shadow-[0_0_18px_rgba(168,85,247,0.16)]"
                        : "border-white/10 bg-white/[0.035] text-white/58 hover:bg-white/[0.06]",
                    )}
                    disabled={checkingIn}
                    onClick={() => setSelectedCol(event.col)}
                  >
                    <span className="block truncate text-[10px] uppercase tracking-[0.28em]">{event.name}</span>
                    <span className="mt-1 block font-mono text-sm font-bold">
                      {event.date || "No date"} / {event.total}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <form className="grid gap-2 border border-white/10 bg-white/[0.03] p-3" onSubmit={handleAddEvent}>
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">Add event</p>
              <div className="grid gap-2">
                <input
                  className={CONTROL}
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  placeholder="6-14"
                  disabled={addingEvent}
                  aria-label="Event date"
                />
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    className={CONTROL}
                    value={eventName}
                    onChange={(event) => setEventName(event.target.value)}
                    placeholder="Event name"
                    disabled={addingEvent}
                    aria-label="Event name"
                  />
                  <button
                    type="submit"
                    className={ACTION_BUTTON}
                    disabled={addingEvent || eventDate.trim().length === 0 || eventName.trim().length === 0}
                  >
                    {addingEvent ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
                    Add
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-2 block text-[10px] uppercase tracking-[0.32em] text-white/35">Event roster search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                <input
                  className={cn(CONTROL, "pl-10")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type at least 2 characters"
                  disabled={checkingIn}
                />
              </div>
            </label>

            <div className="min-h-[244px] border border-white/10 bg-black/45">
              {searching ? (
                <div className="grid h-[244px] place-items-center text-violet-100">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              ) : results.length > 0 ? (
                <div className="divide-y divide-white/10">
                  {results.map((person) => {
                    const alreadySelected = party.some((member) => member.row === person.row);
                    return (
                      <button
                        key={person.row}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-white/[0.045] disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={alreadySelected || checkingIn}
                        onClick={() => addToParty(person)}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold uppercase tracking-[0.06em] text-white">
                            {person.name}
                          </span>
                          <span className="mt-1 block font-mono text-[10px] text-white/35">Row {person.row}</span>
                        </span>
                        <PersonTypeChip type={person.type} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid h-[244px] place-items-center px-6 text-center">
                  <p className="text-xs uppercase leading-5 tracking-[0.24em] text-white/35">
                    {query.trim().length >= 2 ? "No roster matches" : "Search the live event roster"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.32em] text-white/35">Event party</p>
              <span className="font-mono text-lg font-bold text-white">{party.length}</span>
            </div>

            <div className="min-h-[184px] flex-1 space-y-2">
              {party.map((person) => (
                <div key={person.row} className="flex items-center justify-between gap-3 border border-white/10 bg-black/45 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold uppercase tracking-[0.06em] text-white">{person.name}</p>
                    <p className="mt-1 font-mono text-[10px] text-white/35">Row {person.row}</p>
                  </div>
                  <button
                    type="button"
                    className="grid h-8 w-8 shrink-0 place-items-center border border-white/10 bg-white/[0.04] text-white/45 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={checkingIn}
                    onClick={() => removeFromParty(person.row)}
                    aria-label={`Remove ${person.name}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="mt-4 flex min-h-14 w-full items-center justify-center gap-3 border border-violet-100/50 bg-violet-300/15 px-4 py-3 text-sm font-bold uppercase tracking-[0.32em] text-violet-50 shadow-[0_0_24px_rgba(168,85,247,0.18)] transition hover:bg-violet-300/20 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={checkingIn || party.length === 0 || !selectedCol}
              onClick={handleCheckIn}
            >
              {checkingIn ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
              Check in
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
