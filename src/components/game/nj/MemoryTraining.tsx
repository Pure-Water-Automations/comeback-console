import { useEffect, useMemo, useRef, useState } from "react";
import {
  BrainCircuit,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  SkipForward,
  Sparkles,
  Upload,
  UserPlus,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";

import { searchRoster, type RosterPerson } from "@/lib/njActions";
import { award, awardOnce } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { celebrate } from "./ProgressHud";
import {
  detectFaces,
  buildFaceMatcher,
  loadModels,
  type FaceMemoryEntry,
} from "@/lib/faceApi";
import { clusterFaces, cropFaceToDataUrl } from "@/lib/faceCluster";

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
const CARD = "border border-white/10 bg-black/60 backdrop-blur-md rounded-none";
const ACTION_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 border border-teal-200/30 bg-teal-300/10 px-4 text-[10px] font-bold uppercase tracking-[0.28em] text-teal-100 transition hover:bg-teal-300/15 disabled:cursor-not-allowed disabled:opacity-40 rounded-none";
const GHOST_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 border border-white/10 bg-white/[0.02] px-4 text-[10px] font-bold uppercase tracking-[0.28em] text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 rounded-none";

const FACE_MEMORY_KEY = "nj-face-memory-v1";

interface RecognitionSuggestion {
  name: string;
  type: string;
  row: number;
  confidence: number;
}

interface FaceMemoryValue {
  count: number;
  row: number;
  type: string;
  descriptors?: number[][];
}

interface TrainingFace {
  id: string;
  descriptor: number[];
  thumbnailUrl: string;
  photoIndex: number;
}

interface TrainingCluster {
  id: string;
  faces: TrainingFace[];
  taggedName: string | null;
  suggestion: RecognitionSuggestion | null;
}

type Stage = "upload" | "processing" | "review" | "done";

export function MemoryTraining() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isReduced = useReducedMotion();
  const shouldReduceMotion = typeof isReduced === "boolean" ? isReduced : false;

  const [stage, setStage] = useState<Stage>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string }>({
    current: 0,
    total: 0,
    label: "",
  });

  const [clusters, setClusters] = useState<TrainingCluster[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totals, setTotals] = useState<{ photos: number; faces: number }>({ photos: 0, faces: 0 });

  const [faceMemory, setFaceMemory] = useState<Record<string, FaceMemoryValue>>({});

  // Practice-loop XP tracking (repeatable, skill-gated)
  const correctStreakRef = useRef(0); // consecutive Memory-suggestion confirms
  const roundScoredRef = useRef(false); // guards once-per-round clear/perfect award

  // Roster search (inside the carousel)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RosterPerson[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load Face Memory once (shared with Photo Check-In)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FACE_MEMORY_KEY);
      if (raw) setFaceMemory(JSON.parse(raw));
    } catch (e) {
      console.error("Failed to load face memory:", e);
    }
  }, []);

  // Debounced roster search
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
        setSearchResults(res.ok && res.people ? res.people.slice(0, 8) : []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  const taggedCountForScore = useMemo(
    () => clusters.filter((c) => c.taggedName).length,
    [clusters],
  );

  // Reaching the Done stage closes the round — reward completion once per round,
  // with a bonus when every detected person was tagged (no misses).
  useEffect(() => {
    if (stage !== "done") {
      roundScoredRef.current = false;
      return;
    }
    if (roundScoredRef.current) return;
    roundScoredRef.current = true;
    celebrate(award("memory_round_cleared"));
    if (clusters.length > 0 && taggedCountForScore === clusters.length) {
      celebrate(award("memory_perfect_round"));
    }
  }, [stage, taggedCountForScore, clusters.length]);

  const numKnownFaces = useMemo(() => Object.keys(faceMemory).length, [faceMemory]);
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

  const taggedCount = useMemo(
    () => clusters.filter((c) => c.taggedName).length,
    [clusters],
  );

  // Ingest one or more photos: detect + crop + cluster.
  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      toast.error("Please upload image files.");
      return;
    }

    setStage("processing");
    setProgress({ current: 0, total: files.length, label: "Loading vision models…" });

    try {
      await loadModels();

      const allFaces: TrainingFace[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress({
          current: i,
          total: files.length,
          label: `Scanning photo ${i + 1} of ${files.length}…`,
        });
        const url = URL.createObjectURL(files[i]);
        try {
          const img = new Image();
          img.src = url;
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Image failed to load"));
          });
          const detected = await detectFaces(img);
          detected.forEach((d, j) => {
            allFaces.push({
              id: `f-${i}-${j}-${Date.now()}`,
              descriptor: d.descriptor,
              thumbnailUrl: cropFaceToDataUrl(img, d),
              photoIndex: i,
            });
          });
        } finally {
          URL.revokeObjectURL(url);
        }
      }

      if (allFaces.length === 0) {
        toast.info("No faces detected in those photos.");
        setStage("upload");
        return;
      }

      const matcher = buildFaceMatcher(faceMemory as Record<string, FaceMemoryEntry>);
      const grouped = clusterFaces(allFaces);
      const trainingClusters: TrainingCluster[] = grouped.map((faces, idx) => {
        let suggestion: RecognitionSuggestion | null = null;
        if (matcher) {
          const match = matcher.findBestMatch(new Float32Array(faces[0].descriptor));
          if (match.label !== "unknown") {
            const mem = faceMemory[match.label];
            suggestion = {
              name: match.label,
              type: mem?.type ?? "",
              row: mem?.row ?? 0,
              confidence: Math.round((1 - match.distance) * 100),
            };
          }
        }
        return {
          id: `cluster-${idx}-${Date.now()}`,
          faces,
          taggedName: null,
          suggestion,
        };
      });

      setClusters(trainingClusters);
      setCurrentIndex(0);
      setTotals({ photos: files.length, faces: allFaces.length });
      setSearchQuery("");
      setStage("review");
      // New training round begins.
      correctStreakRef.current = 0;
      roundScoredRef.current = false;
      celebrate(award("photo_uploaded"));
      celebrate(award("memory_round_started"));
      celebrate(awardOnce("feature_first_use", "feature:memory_trainer"));
      celebrate(awardOnce("memory_daily_practice", `memory:daily:${new Date().toISOString().slice(0, 10)}`));
      toast.success(
        `${allFaces.length} faces → ${trainingClusters.length} ${
          trainingClusters.length === 1 ? "person" : "people"
        } across ${files.length} photo${files.length > 1 ? "s" : ""}.`,
      );
    } catch (err) {
      console.error("Training scan failed:", err);
      toast.error("Vision models unavailable — try again.");
      setStage("upload");
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
    }
    e.target.value = ""; // allow re-selecting the same files
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  function advance() {
    setSearchQuery("");
    setCurrentIndex((idx) => {
      if (idx + 1 < clusters.length) return idx + 1;
      setStage("done");
      return idx;
    });
  }

  function goPrev() {
    setSearchQuery("");
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  }

  function saveTag(
    cluster: TrainingCluster,
    person: { name: string; type: string; row: number },
    viaSuggestion = false,
  ) {
    const descriptors = cluster.faces.map((f) => f.descriptor);

    setFaceMemory((current) => {
      const prev = current[person.name];
      const prevDescriptors = prev?.descriptors ?? [];
      const next: Record<string, FaceMemoryValue> = {
        ...current,
        [person.name]: {
          count: (prev?.count ?? 0) + descriptors.length,
          row: person.row,
          type: person.type,
          descriptors: [...prevDescriptors, ...descriptors],
        },
      };
      try {
        localStorage.setItem(FACE_MEMORY_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to write face memory:", e);
      }
      return next;
    });

    setClusters((prev) =>
      prev.map((c) => (c.id === cluster.id ? { ...c, taggedName: person.name } : c)),
    );
    celebrate(award("face_tagged"));
    // A confirmed Memory suggestion is a true recall hit → reward + streak bonus.
    if (viaSuggestion) {
      celebrate(award("memory_correct"));
      correctStreakRef.current += 1;
      if (correctStreakRef.current % 3 === 0) celebrate(award("memory_streak_3"));
    } else {
      correctStreakRef.current = 0; // manual tag = model didn't recall; reset streak
    }
    toast.success(
      `Tagged ${person.name} · ${descriptors.length} sample${descriptors.length > 1 ? "s" : ""}`,
    );
    advance();
  }

  function resetToUpload() {
    setClusters([]);
    setCurrentIndex(0);
    setTotals({ photos: 0, faces: 0 });
    setSearchQuery("");
    setStage("upload");
  }

  const currentCluster = clusters[currentIndex] ?? null;

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
        {/* Title */}
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-teal-100">
              BETA · COMPUTER VISION
            </p>
            <h3 className="mt-2 flex items-center gap-3 text-3xl font-bold uppercase tracking-[-0.03em] text-white md:text-5xl">
              <BrainCircuit className="size-7 text-teal-300 md:size-9" />
              MEMORY TRAINING
            </h3>
          </div>
          {stage !== "upload" && (
            <button type="button" className={GHOST_BUTTON} onClick={resetToUpload}>
              <Upload className="size-3.5" />
              New Batch
            </button>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
          {/* Main workspace */}
          <div className="space-y-3">
            {/* UPLOAD */}
            {stage === "upload" && (
              <div
                className={cn(
                  "flex flex-col items-center justify-center border-2 border-dashed border-white/10 bg-white/[0.02] p-12 text-center transition cursor-pointer hover:bg-white/[0.04] hover:border-teal-500/30 rounded-none min-h-[420px]",
                  isDragging && "border-teal-500 bg-teal-500/5",
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                />
                <BrainCircuit className="size-12 text-teal-400/70 mb-4" />
                <p className="text-sm font-bold uppercase tracking-wider text-white">
                  Drag & Drop Training Photos
                </p>
                <p className="mt-2 text-xs text-white/45 uppercase tracking-wide">
                  Upload any group photos — no event needed
                </p>
                <p className="mt-2 max-w-md text-[11px] leading-5 text-white/35 normal-case tracking-normal">
                  We group faces that look like the same person, then walk you through them
                  one at a time so you can tag who&apos;s who. Every tag teaches Face Memory and
                  improves recognition in Photo Check-In.
                </p>
                <p className="mt-6 text-[10px] uppercase tracking-widest text-teal-400/50">
                  Photos stay on this device — POC
                </p>
              </div>
            )}

            {/* PROCESSING */}
            {stage === "processing" && (
              <div className="flex flex-col items-center justify-center border border-white/10 bg-black/40 p-12 text-center rounded-none min-h-[420px]">
                <Loader2 className="size-10 animate-spin text-teal-400 mb-5" />
                <p className="text-xs font-bold uppercase tracking-widest text-teal-100">
                  {progress.label}
                </p>
                {progress.total > 0 && (
                  <div className="mt-4 h-1 w-56 overflow-hidden bg-white/10 rounded-none">
                    <div
                      className="h-full bg-teal-400 transition-all"
                      style={{
                        width: `${Math.round(((progress.current + 1) / progress.total) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* REVIEW CAROUSEL */}
            {stage === "review" && currentCluster && (
              <div className="border border-white/15 bg-black/40 rounded-none p-4 md:p-5">
                {/* Progress header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="border border-teal-500/25 bg-teal-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-teal-200 rounded-none">
                      PERSON {currentIndex + 1} / {clusters.length}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                      {taggedCount} tagged
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-[10px] uppercase tracking-[0.22em] text-white/40 hover:text-white transition"
                    onClick={() => setStage("done")}
                  >
                    Finish ›
                  </button>
                </div>
                <div className="mb-5 h-1 w-full overflow-hidden bg-white/10 rounded-none">
                  <div
                    className="h-full bg-teal-400 transition-all"
                    style={{ width: `${((currentIndex + 1) / clusters.length) * 100}%` }}
                  />
                </div>

                <div className="flex flex-col items-center gap-4">
                  {/* Representative face */}
                  <div className="relative">
                    <img
                      src={currentCluster.faces[0].thumbnailUrl}
                      alt="Detected person"
                      className={cn(
                        "size-44 border-2 object-cover rounded-none",
                        currentCluster.taggedName
                          ? "border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.4)]"
                          : "border-teal-400/60 shadow-[0_0_14px_rgba(45,212,191,0.25)]",
                        !currentCluster.taggedName &&
                          !shouldReduceMotion &&
                          "motion-safe:animate-[pulse_2.4s_ease-in-out_infinite]",
                      )}
                    />
                    {currentCluster.taggedName && (
                      <div className="absolute -bottom-2 -right-2 flex size-8 items-center justify-center border border-emerald-300 bg-emerald-500 text-black rounded-none">
                        <Check className="size-5" />
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
                    {currentCluster.faces.length} photo
                    {currentCluster.faces.length > 1 ? "s" : ""} of this person
                  </p>

                  {/* Thumbnail strip */}
                  {currentCluster.faces.length > 1 && (
                    <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
                      {currentCluster.faces.map((f) => (
                        <img
                          key={f.id}
                          src={f.thumbnailUrl}
                          alt="sample"
                          className="size-11 border border-white/15 object-cover rounded-none"
                        />
                      ))}
                    </div>
                  )}

                  {/* Tagged banner */}
                  {currentCluster.taggedName && (
                    <div className="w-full max-w-sm border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-center rounded-none">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200">
                        Tagged as{" "}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {currentCluster.taggedName}
                      </span>
                    </div>
                  )}

                  {/* Suggestion */}
                  {!currentCluster.taggedName && currentCluster.suggestion && (
                    <div className="w-full max-w-sm border border-teal-500/25 bg-teal-950/30 p-3 rounded-none">
                      <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-teal-400/80">
                        <Sparkles className="size-3" />
                        Memory suggests
                      </p>
                      <p className="mt-1 text-sm font-bold text-white">
                        {currentCluster.suggestion.name}
                        <span className="ml-2 text-[10px] font-normal text-teal-300/70">
                          {currentCluster.suggestion.confidence}% conf
                        </span>
                      </p>
                      <button
                        type="button"
                        className="mt-2 w-full bg-teal-500 hover:bg-teal-600 text-black text-[10px] font-bold py-1.5 uppercase tracking-wider transition rounded-none"
                        onClick={() =>
                          saveTag(
                            currentCluster,
                            {
                              name: currentCluster.suggestion!.name,
                              type: currentCluster.suggestion!.type,
                              row: currentCluster.suggestion!.row,
                            },
                            true,
                          )
                        }
                      >
                        Confirm {currentCluster.suggestion.name}
                      </button>
                    </div>
                  )}

                  {/* Roster search */}
                  <div className="w-full max-w-sm">
                    <div className="relative mb-2">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        className="h-10 w-full border border-white/10 bg-black/70 pl-9 pr-3 text-sm text-white outline-none focus:border-teal-500/50 rounded-none placeholder:text-white/25"
                        placeholder={
                          currentCluster.taggedName ? "Re-tag with another name…" : "Type roster name to tag…"
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto space-y-0.5">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-3 text-xs text-white/40">
                          <Loader2 className="size-3.5 animate-spin mr-1.5 text-teal-400" />
                          Searching roster...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((person) => (
                          <button
                            key={person.row}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm bg-white/[0.03] hover:bg-white/[0.08] transition border border-transparent hover:border-white/10 rounded-none"
                            onClick={() => saveTag(currentCluster, person)}
                          >
                            <span className="truncate pr-2 text-white/90">{person.name}</span>
                            <span
                              className={cn(
                                "text-[8px] border px-1 uppercase tracking-tight",
                                person.type.toLowerCase().includes("guest")
                                  ? "border-amber-200/30 bg-amber-300/10 text-amber-100"
                                  : "border-teal-200/25 bg-teal-300/10 text-teal-100",
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
                      ) : null}
                    </div>

                    {/* Off-roster fallback: remember this person as a New Face (local only, no sheet write) */}
                    {searchQuery.trim().length >= 2 && (
                      <div className="mt-2 border-t border-white/10 pt-2">
                        <p className="mb-1.5 text-[9px] uppercase tracking-widest text-white/35">
                          Not in the directory?
                        </p>
                        <button
                          type="button"
                          className="flex w-full items-center justify-center gap-1.5 border border-teal-200/30 bg-teal-300/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-100 transition hover:bg-teal-300/20 rounded-none"
                          onClick={() =>
                            saveTag(currentCluster, {
                              name: searchQuery.trim(),
                              type: "New",
                              row: 0,
                            })
                          }
                        >
                          <UserPlus className="size-3.5" />
                          Remember “{searchQuery.trim()}” as New Face
                        </button>
                        <p className="mt-1 text-[9px] leading-3 text-white/30 normal-case tracking-normal">
                          Teaches Face Memory now. Add them to the directory later to enable
                          attendance check-in.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Carousel nav */}
                  <div className="mt-2 flex w-full max-w-sm items-center justify-between gap-2">
                    <button
                      type="button"
                      className={GHOST_BUTTON}
                      onClick={goPrev}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="size-4" />
                      Prev
                    </button>
                    <button type="button" className={GHOST_BUTTON} onClick={advance}>
                      <SkipForward className="size-3.5" />
                      {currentCluster.taggedName ? "Next" : "Skip"}
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DONE */}
            {stage === "done" && (
              <div className="flex flex-col items-center justify-center border border-white/10 bg-black/40 p-12 text-center rounded-none min-h-[420px]">
                <div className="mb-5 flex size-16 items-center justify-center border border-emerald-300/40 bg-emerald-500/15 rounded-none">
                  <Check className="size-9 text-emerald-300" />
                </div>
                <h4 className="text-2xl font-bold uppercase tracking-[-0.02em] text-white">
                  Training Complete
                </h4>
                <p className="mt-3 text-sm text-white/55">
                  Tagged{" "}
                  <span className="font-bold text-teal-200">{taggedCount}</span>{" "}
                  {taggedCount === 1 ? "person" : "people"} from{" "}
                  <span className="font-bold text-teal-200">{totals.photos}</span> photo
                  {totals.photos > 1 ? "s" : ""}.
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/35">
                  Face Memory now knows {numKnownFaces}{" "}
                  {numKnownFaces === 1 ? "person" : "people"}
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                  <button type="button" className={ACTION_BUTTON} onClick={resetToUpload}>
                    <Upload className="size-4" />
                    Train More Photos
                  </button>
                  {clusters.length > 0 && (
                    <button
                      type="button"
                      className={GHOST_BUTTON}
                      onClick={() => {
                        setCurrentIndex(0);
                        setStage("review");
                      }}
                    >
                      Review Again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Face Memory sidebar */}
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
                </div>
              ) : (
                <p className="text-xs text-white/30 italic leading-relaxed">
                  No face signatures yet. Upload training photos and tag people to build your
                  recognition database.
                </p>
              )}
            </div>

            <div className="border border-white/10 bg-white/[0.01] p-4 rounded-none">
              <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/40 font-bold">
                How it works
              </p>
              <ol className="space-y-1.5 text-[11px] leading-5 text-white/45">
                <li>1 · Drop in any group photos.</li>
                <li>2 · We group the same face across shots.</li>
                <li>3 · Tag each person once — it saves every sample.</li>
                <li>4 · Photo Check-In recognizes them next time.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
