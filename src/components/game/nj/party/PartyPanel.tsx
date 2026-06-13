import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, ShieldCheck, Sparkles, UserPlus, UsersRound, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addPartyMember,
  fetchParty,
  PARTY_SUPERVISORS_SEED,
  removePartyMember,
  searchDirectory,
  type DirectoryPerson,
  type PartyMember,
} from "@/lib/partyData";
import { NJ_PROFILE } from "@/lib/njData";
import { cn } from "@/lib/utils";
import { firstFreeSprite, SPRITE_CATALOG, spriteSrc, type SpriteEntry } from "./partySprites";
import { PartyViews } from "./PartyViews";

const CARD = "border border-white/10 bg-black/60 backdrop-blur-md";
const DIALOG_CONTENT =
  "max-h-[calc(100vh-2rem)] overflow-y-auto rounded-none border-white/15 bg-[#050509]/95 text-white shadow-[0_0_48px_rgba(45,212,191,0.18)] backdrop-blur-xl sm:rounded-none [&>button]:rounded-none [&>button]:text-white/60 [&>button:hover]:text-white";

const COMMON_MINISTRIES = [
  "Youth",
  "Worship",
  "Outreach",
  "Education",
  "Administration",
  "Hospitality",
  "Blessing",
  "Other",
] as const;

const ACCESS_LEVELS = ["Full Access", "View Only", "Attendance Only"] as const;
const DEFAULT_SUPERVISOR = PARTY_SUPERVISORS_SEED[0] ?? "Pastor";
const DEFAULT_MINISTRY = COMMON_MINISTRIES[0];
const DEFAULT_ACCESS = ACCESS_LEVELS[1];

function directorySummary(person: DirectoryPerson) {
  const activity = person.activity
    ? `${person.activity}${/member/i.test(person.activity) ? "" : " member"}`
    : "Directory member";
  const parts = [activity, person.lineage, person.age ? `age ${person.age}` : ""].filter(Boolean);
  return parts.join(", ");
}

function activityTone(activity: string) {
  const normalized = activity.toLowerCase();
  if (normalized.includes("core")) return "border-amber-200/30 bg-amber-300/10 text-amber-100";
  if (normalized.includes("inactive")) return "border-red-200/25 bg-red-950/20 text-red-100/70";
  if (normalized.includes("active")) return "border-teal-200/30 bg-teal-300/10 text-teal-100";
  return "border-white/10 bg-white/[0.04] text-white/55";
}

function FieldLabel({ children }: { children: string }) {
  return <span className="mb-1.5 block text-[10px] uppercase tracking-[0.26em] text-white/35">{children}</span>;
}

function darkInputClass(accent = "focus:border-teal-100/45") {
  return cn(
    "h-10 w-full border border-white/10 bg-black/70 px-3 text-sm text-white outline-none transition placeholder:text-white/25 disabled:cursor-not-allowed disabled:opacity-50",
    accent,
  );
}

function darkSelectTriggerClass() {
  return "h-10 rounded-none border-white/10 bg-black/70 text-sm text-white shadow-none ring-offset-black focus:ring-0 focus:ring-offset-0 data-[placeholder]:text-white/25 [&>span]:text-left";
}

function darkSelectContentClass() {
  return "rounded-none border-white/10 bg-[#050509] text-white shadow-[0_0_32px_rgba(45,212,191,0.16)]";
}

function darkSelectItemClass() {
  return "rounded-none text-sm text-white/75 focus:bg-white/[0.08] focus:text-white";
}

function LoadingRoster() {
  return (
    <div className={cn(CARD, "p-4")}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="h-3 w-36 animate-pulse bg-white/10" />
          <div className="mt-3 h-7 w-52 animate-pulse bg-white/10" />
        </div>
        <div className="h-10 w-10 animate-pulse bg-white/10" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-20 min-w-56 animate-pulse border border-white/10 bg-white/[0.035]" />
        ))}
      </div>
    </div>
  );
}

function EmptyRoster() {
  return (
    <div className={cn(CARD, "p-5 text-center")}>
      <UsersRound className="mx-auto size-8 text-teal-100/70" />
      <p className="mt-3 text-[10px] uppercase tracking-[0.3em] text-white/35">No staff sprites yet</p>
      <p className="mt-2 text-sm uppercase leading-6 tracking-[0.2em] text-white/50">
        Add the first team member to start the roster.
      </p>
    </div>
  );
}

function RosterStrip({
  members,
  pendingRemoveId,
  onRemove,
}: {
  members: PartyMember[];
  pendingRemoveId: string | null;
  onRemove: (member: PartyMember) => void;
}) {
  if (!members.length) return <EmptyRoster />;

  return (
    <div className={cn(CARD, "relative overflow-hidden p-4")}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 16% 12%, rgba(45,212,191,0.15), transparent 34%), radial-gradient(circle at 82% 80%, rgba(234,179,8,0.1), transparent 32%)",
        }}
      />
      <div className="relative mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.34em] text-white/35">Roster strip</p>
          <h3 className="mt-1 text-2xl font-bold uppercase text-white">Active staff sprites</h3>
        </div>
        <p className="font-mono text-sm uppercase tracking-[0.24em] text-teal-100">
          {members.length} {members.length === 1 ? "member" : "members"}
        </p>
      </div>

      <div className="relative flex gap-3 overflow-x-auto pb-1">
        {members.map((member) => {
          const removing = pendingRemoveId === member.id;
          return (
            <div
              key={member.id}
              className="flex min-w-60 items-center gap-3 border border-white/10 bg-black/70 p-3"
            >
              <div className="grid h-14 w-14 shrink-0 place-items-center border border-teal-100/20 bg-teal-300/10">
                <img
                  src={spriteSrc(member.spriteFamily, member.spritePose)}
                  alt=""
                  className="h-12 w-12 object-contain [image-rendering:pixelated] drop-shadow-2xl"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold uppercase tracking-[0.08em] text-white">{member.name}</p>
                <p className="mt-1 truncate text-[10px] uppercase tracking-[0.22em] text-white/38">
                  {member.role || "Staff"} / {member.ministry || "Ministry"}
                </p>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 shrink-0 place-items-center border border-white/10 bg-white/[0.035] text-white/45 transition hover:border-red-200/35 hover:bg-red-950/25 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => onRemove(member)}
                disabled={Boolean(pendingRemoveId)}
                aria-label={`Remove ${member.name}`}
              >
                {removing ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DirectorySearch({
  addingNew,
  directoryQuery,
  directoryResults,
  directorySearching,
  directoryMessage,
  name,
  pending,
  selectedPerson,
  onAddNewChange,
  onDirectoryQueryChange,
  onNameChange,
  onSelectPerson,
}: {
  addingNew: boolean;
  directoryQuery: string;
  directoryResults: DirectoryPerson[];
  directorySearching: boolean;
  directoryMessage: string;
  name: string;
  pending: boolean;
  selectedPerson: DirectoryPerson | null;
  onAddNewChange: (addingNew: boolean) => void;
  onDirectoryQueryChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onSelectPerson: (person: DirectoryPerson) => void;
}) {
  return (
    <div className="border border-white/10 bg-white/[0.025] p-3">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-teal-100/75">Member source</p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/42">
            Pull from directory or queue a new person.
          </p>
        </div>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center justify-center gap-2 border px-3 text-[10px] font-bold uppercase tracking-[0.22em] transition disabled:cursor-not-allowed disabled:opacity-45",
            addingNew
              ? "border-amber-100/45 bg-amber-300/10 text-amber-50"
              : "border-white/10 bg-black/50 text-white/55 hover:border-teal-100/35 hover:text-white",
          )}
          onClick={() => onAddNewChange(!addingNew)}
          disabled={pending}
        >
          <UserPlus className="size-3.5" />
          {addingNew ? "Search directory" : "Add new person"}
        </button>
      </div>

      {addingNew ? (
        <div className="grid gap-2">
          <label className="block">
            <FieldLabel>New person name</FieldLabel>
            <input
              className={darkInputClass("focus:border-amber-100/45")}
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="First Last"
              disabled={pending}
              required
            />
          </label>
          <p className="border border-amber-200/20 bg-amber-300/10 p-3 text-[10px] uppercase leading-5 tracking-[0.22em] text-amber-100/70">
            New staff are also queued for the membership directory.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <label className="block">
            <FieldLabel>Search directory</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/28" />
              <input
                className={cn(darkInputClass(), "pl-10")}
                value={directoryQuery}
                onChange={(event) => onDirectoryQueryChange(event.target.value)}
                placeholder="Type at least 2 characters"
                disabled={pending}
              />
              {directorySearching ? (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-teal-100" />
              ) : null}
            </div>
          </label>

          {selectedPerson ? (
            <div className="border border-teal-200/25 bg-teal-300/10 p-3">
              <p className="text-[10px] uppercase leading-5 tracking-[0.24em] text-teal-100">
                Pulled from directory: {directorySummary(selectedPerson)}
              </p>
            </div>
          ) : null}

          {directoryMessage ? (
            <p className="text-[10px] uppercase leading-5 tracking-[0.22em] text-white/35">{directoryMessage}</p>
          ) : null}

          {directoryResults.length > 0 ? (
            <div className="max-h-56 overflow-y-auto border border-white/10 bg-black/55">
              {directoryResults.map((person) => (
                <button
                  key={`${person.name}-${person.lastName}-${person.firstName}-${person.age}`}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 border-b border-white/10 px-3 py-3 text-left transition last:border-b-0 hover:bg-white/[0.055] disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={() => onSelectPerson(person)}
                  disabled={pending}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold uppercase tracking-[0.08em] text-white">{person.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/36">
                      {[person.lineage, person.age ? `Age ${person.age}` : ""].filter(Boolean).join(" / ") ||
                        "Directory record"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
                      activityTone(person.activity),
                    )}
                  >
                    {person.activity || "Member"}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SpritePicker({
  members,
  selectedSpriteId,
  pending,
  onSelectSprite,
}: {
  members: PartyMember[];
  selectedSpriteId: string;
  pending: boolean;
  onSelectSprite: (sprite: SpriteEntry) => void;
}) {
  const usedSpriteIds = useMemo(
    () => new Set(members.map((member) => `${member.spriteFamily}:${member.spritePose}`)),
    [members],
  );
  const hasFreeSprites = SPRITE_CATALOG.some((sprite) => !usedSpriteIds.has(sprite.id));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <FieldLabel>Sprite</FieldLabel>
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/32">Pick a unique staff sprite</p>
      </div>
      <div className="max-h-64 overflow-y-auto border border-white/10 bg-black/50 p-2">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {SPRITE_CATALOG.map((sprite) => {
            const selected = selectedSpriteId === sprite.id;
            const used = usedSpriteIds.has(sprite.id);
            const disabled = pending || (used && !selected && hasFreeSprites);

            return (
              <button
                key={sprite.id}
                type="button"
                className={cn(
                  "relative grid min-h-24 place-items-center border bg-white/[0.025] p-2 text-center transition disabled:cursor-not-allowed disabled:opacity-35",
                  selected
                    ? "border-teal-100/70 shadow-[0_0_22px_rgba(45,212,191,0.28)]"
                    : "border-white/10 hover:border-teal-100/35 hover:bg-teal-300/10",
                )}
                onClick={() => onSelectSprite(sprite)}
                disabled={disabled}
                aria-pressed={selected}
              >
                <img
                  src={sprite.src}
                  alt=""
                  className="h-14 w-14 object-contain [image-rendering:pixelated] drop-shadow-2xl"
                />
                <span className="mt-1 max-w-full truncate text-[9px] uppercase tracking-[0.16em] text-white/45">
                  {sprite.family.replace(/_/g, " ")}
                </span>
                <span className="max-w-full truncate text-[9px] uppercase tracking-[0.16em] text-white/65">
                  {sprite.label}
                </span>
                {used ? (
                  <span className="absolute right-1 top-1 border border-white/10 bg-black/70 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.14em] text-white/42">
                    Used
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AddMemberDialog({
  members,
  onRefresh,
}: {
  members: PartyMember[];
  onRefresh: () => Promise<void>;
}) {
  const supervisorOptions = useMemo(
    () =>
      Array.from(
        new Set([
          DEFAULT_SUPERVISOR,
          ...PARTY_SUPERVISORS_SEED,
          ...members.map((member) => member.name).filter(Boolean),
        ]),
      ),
    [members],
  );
  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<DirectoryPerson[]>([]);
  const [directorySearching, setDirectorySearching] = useState(false);
  const [directoryMessage, setDirectoryMessage] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<DirectoryPerson | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [supervisor, setSupervisor] = useState(DEFAULT_SUPERVISOR);
  const [ministry, setMinistry] = useState<(typeof COMMON_MINISTRIES)[number]>(DEFAULT_MINISTRY);
  const [otherMinistry, setOtherMinistry] = useState("");
  const [accessLevel, setAccessLevel] = useState<(typeof ACCESS_LEVELS)[number]>(DEFAULT_ACCESS);
  const [selectedSpriteId, setSelectedSpriteId] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  const resetForm = useCallback(() => {
    const freeSprite = firstFreeSprite(members);
    setAddingNew(false);
    setDirectoryQuery("");
    setDirectoryResults([]);
    setDirectorySearching(false);
    setDirectoryMessage("");
    setSelectedPerson(null);
    setName("");
    setRole("");
    setSupervisor(supervisorOptions[0] ?? DEFAULT_SUPERVISOR);
    setMinistry(DEFAULT_MINISTRY);
    setOtherMinistry("");
    setAccessLevel(DEFAULT_ACCESS);
    setSelectedSpriteId(freeSprite.id);
    setNotes("");
    setPending(false);
  }, [members, supervisorOptions]);

  useEffect(() => {
    if (open) resetForm();
  }, [open, resetForm]);

  useEffect(() => {
    if (!open || addingNew) return;

    const query = directoryQuery.trim();
    if (selectedPerson && selectedPerson.name === query) {
      setDirectoryResults([]);
      setDirectoryMessage("");
      return;
    }
    if (query.length < 2) {
      setDirectoryResults([]);
      setDirectoryMessage(query.length === 0 ? "" : "Type at least 2 characters to search.");
      setDirectorySearching(false);
      return;
    }

    let cancelled = false;
    setDirectorySearching(true);
    setDirectoryMessage("");

    const timeout = window.setTimeout(() => {
      void searchDirectory({ data: { query } })
        .then((res) => {
          if (cancelled) return;
          if (res.ok) {
            setDirectoryResults(res.people);
            setDirectoryMessage(res.people.length ? "" : "No directory matches found.");
          } else {
            setDirectoryResults([]);
            setDirectoryMessage(res.message ?? "Directory search failed.");
          }
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setDirectoryResults([]);
          setDirectoryMessage(error instanceof Error ? error.message : "Directory search failed.");
        })
        .finally(() => {
          if (!cancelled) setDirectorySearching(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [addingNew, directoryQuery, open, selectedPerson]);

  const selectedSprite = useMemo(
    () => SPRITE_CATALOG.find((sprite) => sprite.id === selectedSpriteId) ?? firstFreeSprite(members),
    [members, selectedSpriteId],
  );
  const ministryForSubmit = ministry === "Other" ? otherMinistry.trim() || "Other" : ministry;
  const canSubmit =
    !pending &&
    name.trim().length > 0 &&
    role.trim().length > 0 &&
    supervisor.trim().length > 0 &&
    ministryForSubmit.trim().length > 0;

  const handleNewModeChange = (nextAddingNew: boolean) => {
    setAddingNew(nextAddingNew);
    setSelectedPerson(null);
    setDirectoryResults([]);
    setDirectoryMessage("");
    setDirectoryQuery("");
    setName("");
  };

  const handleDirectoryQueryChange = (value: string) => {
    setDirectoryQuery(value);
    setSelectedPerson(null);
    setName("");
  };

  const handleSelectPerson = (person: DirectoryPerson) => {
    setSelectedPerson(person);
    setDirectoryQuery(person.name);
    setDirectoryResults([]);
    setDirectoryMessage("");
    setName(person.name);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setPending(true);
    try {
      const res = await addPartyMember({
        data: {
          name: name.trim(),
          role: role.trim(),
          supervisor: supervisor.trim(),
          ministry: ministryForSubmit,
          spriteFamily: selectedSprite.family,
          spritePose: selectedSprite.pose,
          accessLevel,
          inDirectory: !addingNew && Boolean(selectedPerson),
          notes: notes.trim(),
        },
      });

      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        await onRefresh();
      } else {
        toast.error(res.message);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-12 items-center justify-center gap-3 border border-teal-100/45 bg-teal-300/10 px-5 text-[10px] font-bold uppercase tracking-[0.28em] text-teal-50 shadow-[0_0_22px_rgba(45,212,191,0.16)] transition hover:bg-teal-300/15"
        >
          <Plus className="size-4" />
          Add member
        </button>
      </DialogTrigger>
      <DialogContent className={cn(DIALOG_CONTENT, "w-[calc(100vw-1rem)] max-w-4xl")}>
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-2xl font-bold uppercase tracking-[0.24em] text-white">Add member</DialogTitle>
          <DialogDescription className="text-[10px] uppercase leading-5 tracking-[0.24em] text-white/40">
            Search directory, assign structure, and choose a pixel sprite.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DirectorySearch
            addingNew={addingNew}
            directoryMessage={directoryMessage}
            directoryQuery={directoryQuery}
            directoryResults={directoryResults}
            directorySearching={directorySearching}
            name={name}
            onAddNewChange={handleNewModeChange}
            onDirectoryQueryChange={handleDirectoryQueryChange}
            onNameChange={setName}
            onSelectPerson={handleSelectPerson}
            pending={pending}
            selectedPerson={selectedPerson}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <FieldLabel>Role / Title</FieldLabel>
              <input
                className={darkInputClass()}
                value={role}
                onChange={(event) => setRole(event.target.value)}
                placeholder="Youth coordinator"
                disabled={pending}
                required
              />
            </label>

            <label className="block">
              <FieldLabel>Supervisor</FieldLabel>
              <Select value={supervisor} onValueChange={setSupervisor} disabled={pending}>
                <SelectTrigger className={darkSelectTriggerClass()}>
                  <SelectValue placeholder="Select supervisor" />
                </SelectTrigger>
                <SelectContent className={darkSelectContentClass()}>
                  {supervisorOptions.map((option) => (
                    <SelectItem key={option} value={option} className={darkSelectItemClass()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block">
              <FieldLabel>Ministry</FieldLabel>
              <Select
                value={ministry}
                onValueChange={(value) => setMinistry(value as (typeof COMMON_MINISTRIES)[number])}
                disabled={pending}
              >
                <SelectTrigger className={darkSelectTriggerClass()}>
                  <SelectValue placeholder="Select ministry" />
                </SelectTrigger>
                <SelectContent className={darkSelectContentClass()}>
                  {COMMON_MINISTRIES.map((option) => (
                    <SelectItem key={option} value={option} className={darkSelectItemClass()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block">
              <FieldLabel>Access level</FieldLabel>
              <Select
                value={accessLevel}
                onValueChange={(value) => setAccessLevel(value as (typeof ACCESS_LEVELS)[number])}
                disabled={pending}
              >
                <SelectTrigger className={darkSelectTriggerClass()}>
                  <SelectValue placeholder="Select access" />
                </SelectTrigger>
                <SelectContent className={darkSelectContentClass()}>
                  {ACCESS_LEVELS.map((option) => (
                    <SelectItem key={option} value={option} className={darkSelectItemClass()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          {ministry === "Other" ? (
            <label className="block">
              <FieldLabel>Other ministry</FieldLabel>
              <input
                className={darkInputClass()}
                value={otherMinistry}
                onChange={(event) => setOtherMinistry(event.target.value)}
                placeholder="Care, media, small groups"
                disabled={pending}
              />
            </label>
          ) : null}

          <div className="border border-cyan-200/15 bg-cyan-300/10 p-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-100" />
              <p className="text-[10px] uppercase leading-5 tracking-[0.22em] text-cyan-100/70">
                Access levels are saved for the POC but are not enforced yet.
              </p>
            </div>
          </div>

          <SpritePicker
            members={members}
            onSelectSprite={(sprite) => setSelectedSpriteId(sprite.id)}
            pending={pending}
            selectedSpriteId={selectedSprite.id}
          />

          <label className="block">
            <FieldLabel>Notes</FieldLabel>
            <textarea
              className="min-h-20 w-full resize-none border border-white/10 bg-black/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-teal-100/45 disabled:cursor-not-allowed disabled:opacity-50"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional setup notes"
              disabled={pending}
            />
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="h-11 border border-white/10 bg-white/[0.035] px-4 text-[10px] font-bold uppercase tracking-[0.24em] text-white/50 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex h-11 items-center justify-center gap-2 border border-teal-100/45 bg-teal-300/10 px-5 text-[10px] font-bold uppercase tracking-[0.28em] text-teal-50 transition hover:bg-teal-300/15 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canSubmit}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Add to party
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// The community's pastors are always shown as the standing leadership tier
// (top of the org chart) even before any staff are added. They are synthetic,
// non-removable members derived from the church profile.
const PASTOR_SPRITES: Record<string, [string, string]> = {
  "Lead Pastor": ["mentor", "mentor_full_power"],
  "Associate Pastor": ["wizard", "wizard_talking"],
  "Next Gen Pastor": ["adventurer", "adventurer_victory"],
};
const PASTOR_MEMBERS: PartyMember[] = NJ_PROFILE.pastors.map((p, i) => {
  const [family, pose] = PASTOR_SPRITES[p.role] ?? ["mentor", "mentor_idle"];
  return {
    id: `pastor-${i}`,
    name: p.name,
    role: p.role,
    supervisor: "",
    ministry: "Leadership",
    spriteFamily: family,
    spritePose: pose,
    accessLevel: "Full Access",
    inDirectory: true,
    notes: "",
    addedAt: "",
  };
});

export function PartyPanel() {
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  // Pastors (leadership) shown in the team views alongside the added staff, so
  // the roster/ministry/org-chart always include the leadership the header
  // lists. The remove-able RosterStrip below still operates on staff only.
  const teamWithLeadership = useMemo<PartyMember[]>(() => {
    const staffNames = new Set(members.map((m) => m.name.toLowerCase()));
    const pastors = PASTOR_MEMBERS.filter((p) => !staffNames.has(p.name.toLowerCase()));
    return [...pastors, ...members];
  }, [members]);

  const refreshParty = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const res = await fetchParty();
      if (res.ok) {
        setMembers(res.members);
      } else {
        toast.error(res.message ?? "Could not load party roster.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load party roster.");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshParty(true);
  }, [refreshParty]);

  const handleRemove = useCallback(
    async (member: PartyMember) => {
      if (pendingRemoveId) return;
      setPendingRemoveId(member.id);

      try {
        const res = await removePartyMember({ data: { id: member.id } });
        if (res.ok) {
          toast.success(res.message);
          await refreshParty(false);
        } else {
          toast.error(res.message);
        }
      } finally {
        setPendingRemoveId(null);
      }
    },
    [pendingRemoveId, refreshParty],
  );

  return (
    <section className="relative overflow-hidden text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(45,212,191,0.17), transparent 35%), radial-gradient(circle at 84% 42%, rgba(168,85,247,0.13), transparent 34%)",
        }}
      />

      <div className="relative space-y-6">
        <div className={cn(CARD, "relative overflow-hidden p-5 md:p-7")}>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 22% 14%, rgba(45,212,191,0.2), transparent 34%), radial-gradient(circle at 82% 74%, rgba(234,179,8,0.12), transparent 32%)",
            }}
          />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-signal">Build your team</p>
              <h2 className="display mt-3 text-5xl uppercase text-white md:text-7xl">Your party</h2>
              <p className="mt-4 max-w-3xl text-sm uppercase leading-6 tracking-[0.22em] text-white/45">
                Assemble staff who get their own sprite, a supervisor, and console access for the New Jersey POC.
              </p>
            </div>
            <AddMemberDialog members={members} onRefresh={() => refreshParty(false)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className={cn(CARD, "p-4")}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Team size</p>
              <UsersRound className="size-5 text-teal-100" />
            </div>
            <p className="font-mono text-4xl font-bold text-white">{teamWithLeadership.length}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/35">
              {members.length} staff · {teamWithLeadership.length - members.length} leadership
            </p>
          </div>
          <div className={cn(CARD, "p-4")}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Directory linked</p>
              <ShieldCheck className="size-5 text-cyan-100" />
            </div>
            <p className="font-mono text-4xl font-bold text-cyan-100">
              {teamWithLeadership.filter((member) => member.inDirectory).length}
            </p>
          </div>
          <div className={cn(CARD, "p-4")}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Sprite pool</p>
              <Sparkles className="size-5 text-amber-100" />
            </div>
            <p className="font-mono text-4xl font-bold text-amber-100">
              {Math.max(0, SPRITE_CATALOG.length - teamWithLeadership.length)}
            </p>
          </div>
        </div>

        {initialLoading ? (
          <LoadingRoster />
        ) : (
          <RosterStrip members={members} onRemove={handleRemove} pendingRemoveId={pendingRemoveId} />
        )}

        {refreshing && !initialLoading ? (
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
            <Loader2 className="size-3.5 animate-spin text-teal-100" />
            Refreshing party roster
          </div>
        ) : null}

        {!initialLoading ? <PartyViews members={teamWithLeadership} /> : null}
      </div>
    </section>
  );
}
