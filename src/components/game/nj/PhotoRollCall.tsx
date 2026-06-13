import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Search, Upload, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";

import {
  checkInSunday,
  listSundays,
  searchRoster,
  type RosterPerson,
  type SundayColumn,
} from "@/lib/njActions";
import { award } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { celebrate } from "./ProgressHud";
import { detectFaces, buildFaceMatcher, loadModels, type FaceMemoryEntry } from "@/lib/faceApi";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const CARD = "border border-white/10 bg-black/60 backdrop-blur-md rounded-none";
const CONTROL =
  "h-11 w-full border border-white/10 bg-black/70 px-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-teal-100/45 disabled:cursor-not-allowed disabled:opacity-50 rounded-none";
const ACTION_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 border border-teal-200/30 bg-teal-300/10 px-4 text-[10px] font-bold uppercase tracking-[0.28em] text-teal-100 transition hover:bg-teal-300/15 disabled:cursor-not-allowed disabled:opacity-40 rounded-none";

interface RecognitionSuggestion {
  name: string;
  type: string;
  row: number;
  confidence: number; // 0–100, computed as Math.round((1 - distance) * 100)
}

interface FaceBox {
  id: string;
  x: number;      // percentage left
  y: number;      // percentage top
  width: number;  // percentage width (box is square)
  name: string | null;
  type: string | null;
  row: number | null;
  isManual: boolean;
  descriptor: number[] | null;               // null until computed
  recognitionSuggestion: RecognitionSuggestion | null; // null for manual boxes or no match
}

interface FaceMemoryValue {
  count: number;
  row: number;
  type: string;
  descriptors?: number[][];  // added; absent on existing v1 entries
}

function getSeed(name: string, size: number): number {
  let hash = 0;
  const str = `${name}-${size}`;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function createRandom(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateMockFaces(fileName: string, fileSize: number): FaceBox[] {
  const seed = getSeed(fileName, fileSize);
  const rng = createRandom(seed);
  const numFaces = Math.floor(rng() * 3) + 3; // 3, 4, or 5 faces

  const faces: FaceBox[] = [];
  for (let i = 0; i < numFaces; i++) {
    // Generate x, y in range [10, 75] percent to keep boxes safely inside the image boundaries
    const x = Math.floor(rng() * 65) + 10;
    const y = Math.floor(rng() * 65) + 10;
    // Box width: 12% to 18%
    const width = Math.floor(rng() * 6) + 12;
    faces.push({
      id: `auto-${i}-${seed}`,
      x,
      y,
      width,
      name: null,
      type: null,
      row: null,
      isManual: false,
      descriptor: null,
      recognitionSuggestion: null,
    });
  }
  return faces;
}

function upcomingSundayIndex(sundays: { date: string }[]): number {
  let year = 2025;
  let prevMonth = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < sundays.length; i++) {
    const m = /^(\d{1,2})-(\d{1,2})$/.exec(sundays[i].date.trim());
    if (!m) continue;
    const month = Number(m[1]);
    if (i === 0 && month < 9) year = 2026; // sheet starts mid-year variant
    if (month < prevMonth) year++;
    prevMonth = month;
    if (new Date(year, month - 1, Number(m[2])) >= today) return i;
  }
  return Math.max(0, sundays.length - 1);
}

export function PhotoRollCall() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isReduced = useReducedMotion();
  const shouldReduceMotion = typeof isReduced === "boolean" ? isReduced : false;

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<{ name: string; size: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [faces, setFaces] = useState<FaceBox[]>([]);
  const [activeBoxId, setActiveBoxId] = useState<string | null>(null);

  // Search state inside popover
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RosterPerson[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Face Memory state
  const [faceMemory, setFaceMemory] = useState<Record<string, FaceMemoryValue>>({});

  // Sunday Selector & Check-in
  const [sundays, setSundays] = useState<SundayColumn[]>([]);
  const [selectedCol, setSelectedCol] = useState("");
  const [loadingSundays, setLoadingSundays] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  type ModelState = "idle" | "loading-models" | "detecting" | "done" | "error";
  const [modelState, setModelState] = useState<ModelState>("idle");

  // Load Face Memory and Sunday Columns
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nj-face-memory-v1");
      if (raw) {
        setFaceMemory(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Failed to load nj-face-memory-v1:", e);
    }

    const fetchSundays = async () => {
      setLoadingSundays(true);
      try {
        const res = await listSundays();
        if (res.ok && res.sundays) {
          setSundays(res.sundays);
          // Default to the first Sunday on or after today.
          const frontier = res.sundays[upcomingSundayIndex(res.sundays)];
          setSelectedCol(frontier?.col ?? res.sundays[res.sundays.length - 1]?.col ?? "");
        }
      } catch (err) {
        console.error("Failed to load Sundays:", err);
      } finally {
        setLoadingSundays(false);
      }
    };
    void fetchSundays();
  }, []);

  // Clean up Object URL
  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  // Debounced search query
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await searchRoster({ data: { query: trimmed } });
        if (cancelled) return;
        if (res.ok && res.people) {
          setSearchResults(res.people.slice(0, 8));
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Derived Face Memory values
  const topNames = useMemo(() => {
    return Object.entries(faceMemory)
      .map(([name, val]) => ({
        name,
        count: val.count,
        confidence: Math.min(50 + val.count * 10, 98),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [faceMemory]);

  const numKnownFaces = useMemo(() => {
    return Object.keys(faceMemory).length;
  }, [faceMemory]);

  // Get current tag suggestions for popover
  const suggestion = useMemo(() => {
    const entries = Object.entries(faceMemory);
    if (entries.length === 0) return null;

    // Filter out people who are already tagged in the current image
    const taggedNames = faces
      .map((f) => f.name)
      .filter((name): name is string => name !== null);

    const sorted = entries
      .map(([name, val]) => ({
        name,
        count: val.count,
        row: val.row,
        type: val.type,
        confidence: Math.min(50 + val.count * 10, 98),
      }))
      .filter((item) => !taggedNames.includes(item.name))
      .sort((a, b) => b.count - a.count);

    return sorted[0] || null;
  }, [faceMemory, faces]);

  // Filter visible Sundays
  const visibleSundays = useMemo(() => {
    if (sundays.length === 0) return [];
    const idx = upcomingSundayIndex(sundays);
    const end = Math.min(sundays.length, idx + 1);
    return sundays.slice(Math.max(0, end - 4), end).reverse();
  }, [sundays]);

  // Handle Photo Selection
  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setPhotoFile({ name: file.name, size: file.size });
    setFaces([]);
    setActiveBoxId(null);
    setSearchQuery("");
    setModelState("loading-models");

    try {
      const img = new Image();
      img.src = url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image failed to load"));
      });

      await loadModels();
      setModelState("detecting");
      const detected = await detectFaces(img);

      const matcher = buildFaceMatcher(faceMemory as Record<string, FaceMemoryEntry>);

      const faceBoxes: FaceBox[] = detected.map((d, i) => {
        let recognitionSuggestion: RecognitionSuggestion | null = null;
        if (matcher) {
          const match = matcher.findBestMatch(new Float32Array(d.descriptor));
          if (match.label !== "unknown") {
            const memEntry = faceMemory[match.label];
            recognitionSuggestion = {
              name: match.label,
              type: memEntry?.type ?? "",
              row: memEntry?.row ?? 0,
              confidence: Math.round((1 - match.distance) * 100),
            };
          }
        }
        return {
          id: `auto-${i}-${Date.now()}`,
          x: d.x,
          y: d.y,
          width: d.width,
          name: null,
          type: null,
          row: null,
          isManual: false,
          descriptor: d.descriptor,
          recognitionSuggestion,
        };
      });

      setFaces(faceBoxes);
      setModelState("done");
      celebrate(award("photo_uploaded"));
      const count = detected.length;
      if (count > 0) {
        toast.success(`${count} face${count > 1 ? "s" : ""} detected!`);
      } else {
        toast.info("No faces detected — click anywhere on the photo to add faces manually.");
      }
    } catch (err) {
      console.error("Face detection failed:", err);
      setModelState("error");
      toast.error("Vision models unavailable — add faces manually.");
    }
  }, [faceMemory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  // Add manual face box on photo click
  const handlePhotoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (checkingIn) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const boxWidth = 14; // default box size percent
    // Clamp box positions within bounds
    const x = Math.max(0, Math.min(100 - boxWidth, clickX - boxWidth / 2));
    const y = Math.max(0, Math.min(100 - boxWidth, clickY - boxWidth / 2));

    const newBox: FaceBox = {
      id: `manual-${Date.now()}`,
      x,
      y,
      width: boxWidth,
      name: null,
      type: null,
      row: null,
      isManual: true,
      descriptor: null,
      recognitionSuggestion: null,
    };

    setFaces((prev) => [...prev, newBox]);
    setActiveBoxId(newBox.id);
    setSearchQuery("");
  };

  // Confirm tag selection
  const handleConfirmTag = (boxId: string, person: { name: string; type: string; row: number }) => {
    setFaces((prev) =>
      prev.map((box) =>
        box.id === boxId
          ? {
              ...box,
              name: person.name,
              type: person.type,
              row: person.row,
            }
          : box
      )
    );

    // Save/update Face Memory
    setFaceMemory((current) => {
      const prevEntry = current[person.name];
      const newCount = (prevEntry?.count ?? 0) + 1;
      const nextMemory = {
        ...current,
        [person.name]: {
          count: newCount,
          row: person.row,
          type: person.type,
        },
      };
      try {
        localStorage.setItem("nj-face-memory-v1", JSON.stringify(nextMemory));
      } catch (e) {
        console.error("Failed to write to localStorage:", e);
      }
      return nextMemory;
    });

    // Celebrate and close
    celebrate(award("face_tagged"));
    setActiveBoxId(null);
    setSearchQuery("");
  };

  // Delete/cancel a single face box
  const handleRemoveFaceBox = (boxId: string) => {
    setFaces((prev) => prev.filter((box) => box.id !== boxId));
    if (activeBoxId === boxId) {
      setActiveBoxId(null);
    }
  };

  // Clear photo state
  const handleReset = () => {
    setPhotoUrl(null);
    setPhotoFile(null);
    setFaces([]);
    setActiveBoxId(null);
    setSearchQuery("");
    setModelState("idle");
  };

  // Run sheet check-in
  const handleCheckIn = async () => {
    if (checkingIn || !selectedCol) return;

    const confirmedRows = faces
      .map((f) => f.row)
      .filter((row): row is number => row !== null);

    if (confirmedRows.length === 0) {
      toast.error("No confirmed faces found. Tag at least one face before checking in.");
      return;
    }

    setCheckingIn(true);
    try {
      const res = await checkInSunday({
        data: { col: selectedCol, rows: confirmedRows },
      });

      if (res.ok) {
        toast.success(res.message || `Successfully checked in ${confirmedRows.length} people!`);
        celebrate(award("checkin", confirmedRows.length));
        handleReset();
      } else {
        toast.error(res.message || "Failed to check in.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error writing check-in to roster sheet.");
    } finally {
      setCheckingIn(false);
    }
  };

  const confirmedFacesCount = faces.filter((f) => f.name !== null).length;

  return (
    <motion.section
      className={cn(CARD, "relative overflow-hidden p-4 md:p-5")}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: EASE }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(20,184,166,0.15), transparent 40%)",
        }}
      />

      <div className="relative">
        {/* Title Block */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-teal-100">
              BETA · COMPUTER VISION MOCK
            </p>
            <h3 className="mt-2 text-3xl font-bold uppercase tracking-[-0.03em] text-white md:text-5xl">
              PHOTO ROLL CALL
            </h3>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
          {/* Main Workspace (Upload zone OR Image workspace) */}
          <div className="space-y-3">
            {!photoUrl ? (
              <div
                className={cn(
                  "flex flex-col items-center justify-center border-2 border-dashed border-white/10 bg-white/[0.02] p-12 text-center transition cursor-pointer hover:bg-white/[0.04] hover:border-teal-500/30 rounded-none h-[380px]",
                  isDragging && "border-teal-500 bg-teal-500/5"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <Upload className="size-10 text-teal-400/70 mb-4" />
                <p className="text-sm font-bold uppercase tracking-wider text-white">
                  Drag & Drop Regional Photo
                </p>
                <p className="mt-2 text-xs text-white/45 uppercase tracking-wide">
                  Or click to browse device storage
                </p>
                <p className="mt-6 text-[10px] uppercase tracking-widest text-teal-400/50">
                  Photo stays on this device — POC
                </p>
              </div>
            ) : (
              <div className="relative border border-white/15 bg-black/40 rounded-none overflow-hidden select-none">
                {/* Reset button */}
                <button
                  type="button"
                  className="absolute top-3 right-3 z-30 bg-black/80 hover:bg-black text-white/60 hover:text-white border border-white/10 p-1.5 transition rounded-none disabled:opacity-40"
                  onClick={handleReset}
                  disabled={checkingIn}
                  title="Remove Photo"
                >
                  <X className="size-4" />
                </button>

                {/* Clickable Image Container */}
                <div
                  className={cn(
                    "relative w-full h-auto cursor-crosshair",
                    checkingIn && "pointer-events-none opacity-80"
                  )}
                  onClick={handlePhotoClick}
                >
                  {/* Detection loading overlay */}
                  {(modelState === "loading-models" || modelState === "detecting") && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                      <Loader2 className="size-8 animate-spin text-teal-400 mb-3" />
                      <p className="text-xs font-bold uppercase tracking-widest text-teal-100">
                        {modelState === "loading-models" ? "Loading vision models…" : "Scanning for faces…"}
                      </p>
                    </div>
                  )}

                  <img
                    ref={imgRef}
                    src={photoUrl}
                    alt="Roll Call Preview"
                    className="w-full h-auto block"
                    draggable={false}
                  />

                  {/* Face Boxes Overlays */}
                  {faces.map((box) => {
                    const isConfirmed = box.name !== null;
                    const isSelected = activeBoxId === box.id;
                    const isGuest = box.type?.toLowerCase().includes("guest") ?? false;

                    return (
                      <div
                        key={box.id}
                        className={cn(
                          "absolute border-2 transition-all rounded-none",
                          isConfirmed
                            ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                            : "border-teal-400 bg-teal-500/5 shadow-[0_0_8px_rgba(45,212,191,0.3)]",
                          !isConfirmed && !shouldReduceMotion && "motion-safe:animate-pulse",
                          isSelected && "ring-2 ring-white border-white z-20"
                        )}
                        style={{
                          left: `${box.x}%`,
                          top: `${box.y}%`,
                          width: `${box.width}%`,
                          height: `${box.width}%`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation(); // prevent adding another manual box
                          if (checkingIn) return;
                          setActiveBoxId(isSelected ? null : box.id);
                        }}
                      >
                        {/* Status/Name Badge */}
                        <div className="absolute -top-6 left-0 flex items-center gap-1.5 bg-black/90 px-1.5 py-0.5 text-[9px] font-bold text-white border border-white/15 uppercase tracking-wider whitespace-nowrap">
                          {isConfirmed ? (
                            <>
                              <span className="text-emerald-400">{box.name}</span>
                              <span
                                className={cn(
                                  "text-[7px] border px-1 font-extrabold tracking-tight",
                                  isGuest
                                    ? "border-amber-200/30 bg-amber-300/10 text-amber-100"
                                    : "border-teal-200/25 bg-teal-300/10 text-teal-100"
                                )}
                              >
                                {box.type}
                              </span>
                            </>
                          ) : (
                            <span className="text-teal-400/80">UNKNOWN</span>
                          )}

                          {/* Close/Remove X for manual boxes (or auto ones, to clean up workspace) */}
                          <button
                            type="button"
                            className="ml-1.5 text-white/40 hover:text-white transition"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFaceBox(box.id);
                            }}
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>

                        {/* Search & Tag Popover */}
                        {isSelected && (
                          <div
                            className={cn(
                              "absolute z-40 w-64 border border-white/10 bg-black/95 p-3 shadow-2xl rounded-none text-white text-left",
                              box.y > 50 ? "bottom-full mb-2" : "top-full mt-2",
                              box.x > 60 ? "right-0" : "left-0"
                            )}
                            onClick={(e) => e.stopPropagation()} // stop clicks in popover from bubbling up
                          >
                            {/* Popover Header */}
                            <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5">
                              <span className="text-[10px] uppercase tracking-wider text-white/50">
                                {isConfirmed ? "Edit Face Tag" : "Identify Face"}
                              </span>
                              <button
                                type="button"
                                className="text-white/40 hover:text-white/80 transition"
                                onClick={() => setActiveBoxId(null)}
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>

                            {/* One-Click Face Memory Suggestion */}
                            {!isConfirmed && suggestion && (
                              <div className="mb-2.5 border border-teal-500/25 bg-teal-950/30 p-2 rounded-none">
                                <p className="text-[9px] text-teal-400/70 uppercase tracking-widest">
                                  Suggested Tag
                                </p>
                                <p className="mt-0.5 text-xs font-bold text-white">
                                  {suggestion.name}
                                </p>
                                <p className="text-[9px] text-teal-300/70">
                                  Confidence: {suggestion.confidence}%
                                </p>
                                <button
                                  type="button"
                                  className="mt-1.5 w-full bg-teal-500 hover:bg-teal-600 text-black text-[9px] font-bold py-1 uppercase tracking-wider transition rounded-none"
                                  onClick={() => {
                                    handleConfirmTag(box.id, {
                                      name: suggestion.name,
                                      type: suggestion.type,
                                      row: suggestion.row,
                                    });
                                  }}
                                >
                                  Accept Suggestion
                                </button>
                              </div>
                            )}

                            {/* Autocomplete Input */}
                            <div className="relative mb-2">
                              <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-white/30" />
                              <input
                                type="text"
                                className="h-8 w-full border border-white/10 bg-black/70 pl-8 pr-2 text-xs text-white outline-none focus:border-teal-500/50 rounded-none placeholder:text-white/20"
                                placeholder="Type roster name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                              />
                            </div>

                            {/* List of Autocomplete matches */}
                            <div className="max-h-40 overflow-y-auto space-y-0.5">
                              {isSearching ? (
                                <div className="flex items-center justify-center py-2.5 text-xs text-white/40">
                                  <Loader2 className="size-3.5 animate-spin mr-1.5 text-teal-400" />
                                  Searching roster...
                                </div>
                              ) : searchResults.length > 0 ? (
                                searchResults.map((person) => (
                                  <button
                                    key={person.row}
                                    type="button"
                                    className="flex w-full items-center justify-between px-2 py-1.5 text-left text-xs bg-white/[0.03] hover:bg-white/[0.08] transition border border-transparent hover:border-white/10 rounded-none"
                                    onClick={() => handleConfirmTag(box.id, person)}
                                  >
                                    <span className="truncate pr-2">{person.name}</span>
                                    <span
                                      className={cn(
                                        "text-[8px] border px-1 uppercase tracking-tight",
                                        person.type.toLowerCase().includes("guest")
                                          ? "border-amber-200/30 bg-amber-300/10 text-amber-100"
                                          : "border-teal-200/25 bg-teal-300/10 text-teal-100"
                                      )}
                                    >
                                      {person.type}
                                    </span>
                                  </button>
                                ))
                              ) : searchQuery.trim().length >= 2 ? (
                                <div className="py-2 text-center text-xs text-white/30">
                                  No members found
                                </div>
                              ) : (
                                <div className="py-2 text-center text-xs text-white/30">
                                  Type 2+ chars to filter
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* No-faces-detected message */}
                  {modelState === "done" && faces.length === 0 && (
                    <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
                      <p className="bg-black/80 border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/50">
                        No faces detected — click to add manually
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar (Face memory panel) */}
          <div className="space-y-4">
            <div className="border border-white/10 bg-white/[0.01] p-4 rounded-none">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/40 font-bold">
                  Face Memory
                </p>
                <span className="border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-teal-300 rounded-none">
                  KNOWS: {numKnownFaces}
                </span>
              </div>

              {topNames.length > 0 ? (
                <div className="space-y-2">
                  {topNames.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs border-b border-white/[0.04] pb-1.5"
                    >
                      <span className="text-white/80 truncate max-w-[130px]" title={item.name}>
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 font-mono">
                          {item.count} tag{item.count > 1 ? "s" : ""}
                        </span>
                        <span className="text-teal-400 font-mono font-bold text-[10px]">
                          {item.confidence}% conf
                        </span>
                      </div>
                    </div>
                  ))}
                  <p className="mt-4 text-[9px] uppercase tracking-wider text-white/30 leading-normal">
                    Fake confidence percent grows with each face tagging confirm (max 98%).
                  </p>
                </div>
              ) : (
                <p className="text-xs text-white/30 italic leading-relaxed">
                  No face signatures registered. Tag detected boxes on the photo to calibrate the mock neural processor.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bar: Sunday Chips & Check-in Button */}
        <div className="mt-5 border-t border-white/10 pt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Sunday column chips */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">
                Sunday Column
              </span>
              {loadingSundays && <Loader2 className="size-3.5 animate-spin text-teal-300" />}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {visibleSundays.map((sunday) => (
                <button
                  key={sunday.col}
                  type="button"
                  className={cn(
                    "border px-3 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-40 rounded-none",
                    selectedCol === sunday.col
                      ? "border-teal-400 bg-teal-500/10 text-white shadow-[0_0_12px_rgba(45,212,191,0.2)]"
                      : "border-white/10 bg-white/[0.02] text-white/50 hover:bg-white/[0.06]"
                  )}
                  disabled={checkingIn}
                  onClick={() => setSelectedCol(sunday.col)}
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wider">
                    {sunday.date}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-end justify-end">
            <button
              type="button"
              className={cn(
                ACTION_BUTTON,
                "h-12 text-[11px] font-extrabold tracking-[0.3em] min-w-[200px]"
              )}
              disabled={checkingIn || confirmedFacesCount === 0 || !selectedCol || !photoUrl}
              onClick={handleCheckIn}
            >
              {checkingIn ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Checking In...
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Check In {confirmedFacesCount} Tagged
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
