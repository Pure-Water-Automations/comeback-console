# Photo Roll Call — Real Face Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock face detection with real client-side detection + recognition using face-api.js, where recognition learns from manual tagging and improves with each confirmed photo.

**Architecture:** face-api.js runs entirely in the browser (photo never leaves device). `src/lib/faceApi.ts` handles lazy model loading and exposes `detectFaces()` (returns real bounding boxes with 128-dim embeddings) and `buildFaceMatcher()` (compares new embeddings against stored ones). `PhotoRollCall.tsx` replaces `generateMockFaces()` with these calls, extends the localStorage Face Memory schema to persist descriptors, and computes per-box recognition suggestions during detection rather than using a single global suggestion heuristic.

**Tech Stack:** `@vladmandic/face-api` (maintained face-api.js fork), TensorFlow.js (bundled), vitest for utility tests

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/faceApi.ts` | Create | Lazy model loading, `detectFaces`, `buildFaceMatcher` |
| `src/lib/faceApi.test.ts` | Create | Unit tests for `buildFaceMatcher` logic |
| `src/components/game/nj/PhotoRollCall.tsx` | Modify | Types, state, detection call, descriptor storage, per-box suggestions |
| `public/models/` | Create (binary) | face-api.js model weights served as static assets |
| `package.json` | Modify | Add `@vladmandic/face-api` |

---

### Task 1: Install @vladmandic/face-api and copy model files

**Files:**
- Modify: `package.json`
- Create: `public/models/` (binary model weights)

- [ ] **Step 1: Install the package**

```bash
cd /Users/justinokamoto/appscript_projects/Scroll-and-Learn-Operation-COMEBACK-transparent-sprites
npm install @vladmandic/face-api
```

Expected: package installs cleanly; `node_modules/@vladmandic/face-api/model/` directory exists.

- [ ] **Step 2: Copy model weights to public/models/**

```bash
mkdir -p public/models
cp node_modules/@vladmandic/face-api/model/ssd_mobilenetv1_model-weights_manifest.json public/models/
cp node_modules/@vladmandic/face-api/model/ssd_mobilenetv1_model-shard1 public/models/
cp node_modules/@vladmandic/face-api/model/face_landmark_68_model-weights_manifest.json public/models/
cp node_modules/@vladmandic/face-api/model/face_landmark_68_model-shard1 public/models/
cp node_modules/@vladmandic/face-api/model/face_recognition_model-weights_manifest.json public/models/
cp node_modules/@vladmandic/face-api/model/face_recognition_model-shard1 public/models/
cp node_modules/@vladmandic/face-api/model/face_recognition_model-shard2 public/models/
```

If shard filenames differ (check with `ls node_modules/@vladmandic/face-api/model/`), copy the actual filenames present for each model prefix.

- [ ] **Step 3: Verify models are accessible in dev server**

```bash
npm run dev -- --port 5175
# In another terminal:
curl -s -o /dev/null -w "%{http_code}" http://localhost:5175/models/ssd_mobilenetv1_model-weights_manifest.json
```

Expected: `200`

- [ ] **Step 4: Add public/models/ to .gitignore (model files are large binaries)**

Append to `.gitignore`:
```
public/models/
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "feat: add @vladmandic/face-api dependency"
```

---

### Task 2: Create src/lib/faceApi.ts — model loading and detectFaces

**Files:**
- Create: `src/lib/faceApi.ts`

- [ ] **Step 1: Create the file with types and loadModels**

Create `src/lib/faceApi.ts`:

```typescript
import * as faceapi from "@vladmandic/face-api";

export interface DetectedFace {
  x: number;      // percentage left (0-100)
  y: number;      // percentage top (0-100)
  width: number;  // percentage width (0-100), box is square
  descriptor: number[];  // 128-dim embedding
}

const MODEL_URL = "/models";
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    modelsLoaded = true;
  })();

  return loadingPromise;
}
```

- [ ] **Step 2: Add detectFaces**

Append to `src/lib/faceApi.ts`:

```typescript
export async function detectFaces(img: HTMLImageElement): Promise<DetectedFace[]> {
  await loadModels();

  const detections = await faceapi
    .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d) => {
    const box = d.detection.box;
    return {
      x: (box.x / img.naturalWidth) * 100,
      y: (box.y / img.naturalHeight) * 100,
      width: (box.width / img.naturalWidth) * 100,
      descriptor: Array.from(d.descriptor),
    };
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/faceApi.ts
git commit -m "feat: add faceApi module with loadModels and detectFaces"
```

---

### Task 3: Add buildFaceMatcher to faceApi.ts and write unit tests

**Files:**
- Modify: `src/lib/faceApi.ts`
- Create: `src/lib/faceApi.test.ts`

- [ ] **Step 1: Check if vitest is installed**

```bash
cat package.json | grep vitest
```

If not present, install it:

```bash
npm install --save-dev vitest
```

Then add to `package.json` scripts (edit the file):
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write the failing test for buildFaceMatcher**

Create `src/lib/faceApi.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@vladmandic/face-api", () => ({
  nets: {
    ssdMobilenetv1: { loadFromUri: vi.fn() },
    faceLandmark68Net: { loadFromUri: vi.fn() },
    faceRecognitionNet: { loadFromUri: vi.fn() },
  },
  SsdMobilenetv1Options: class {},
  LabeledFaceDescriptors: class {
    constructor(
      public label: string,
      public descriptors: Float32Array[]
    ) {}
  },
  FaceMatcher: class {
    distanceThreshold: number;
    constructor(_labeled: unknown, threshold: number) {
      this.distanceThreshold = threshold;
    }
  },
}));

import { buildFaceMatcher } from "./faceApi";

describe("buildFaceMatcher", () => {
  it("returns null for empty memory", () => {
    expect(buildFaceMatcher({})).toBeNull();
  });

  it("returns null when no entries have descriptors", () => {
    const memory = {
      "Person A": { count: 3, row: 4, type: "Member" },
    };
    expect(buildFaceMatcher(memory)).toBeNull();
  });

  it("returns null when descriptors array is empty", () => {
    const memory = {
      "Person A": { count: 1, row: 4, type: "Member", descriptors: [] },
    };
    expect(buildFaceMatcher(memory)).toBeNull();
  });

  it("returns a FaceMatcher when at least one person has descriptors", () => {
    const descriptor = Array.from({ length: 128 }, (_, i) => i * 0.001);
    const memory = {
      "Person A": { count: 2, row: 4, type: "Member", descriptors: [descriptor] },
    };
    const matcher = buildFaceMatcher(memory);
    expect(matcher).not.toBeNull();
  });

  it("uses threshold 0.5", () => {
    const descriptor = Array.from({ length: 128 }, () => 0);
    const memory = {
      "Person A": { count: 1, row: 4, type: "Member", descriptors: [descriptor] },
    };
    const matcher = buildFaceMatcher(memory);
    expect((matcher as any).distanceThreshold).toBe(0.5);
  });

  it("skips entries without descriptors when building matcher", () => {
    const descriptor = Array.from({ length: 128 }, () => 0);
    const memory = {
      "Person A": { count: 1, row: 4, type: "Member", descriptors: [descriptor] },
      "Person B": { count: 3, row: 5, type: "Member" }, // no descriptors
    };
    // Should not throw — Person B is filtered out
    expect(() => buildFaceMatcher(memory)).not.toThrow();
    expect(buildFaceMatcher(memory)).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test
```

Expected: `buildFaceMatcher` not found / import error.

- [ ] **Step 4: Add buildFaceMatcher to faceApi.ts**

Append to `src/lib/faceApi.ts`:

```typescript
export interface FaceMemoryEntry {
  count: number;
  row: number;
  type: string;
  descriptors?: number[][];
}

export function buildFaceMatcher(
  memory: Record<string, FaceMemoryEntry>
): faceapi.FaceMatcher | null {
  const labeled = Object.entries(memory)
    .filter(([, val]) => val.descriptors && val.descriptors.length > 0)
    .map(([name, val]) => {
      const floatDescriptors = val.descriptors!.map((d) => new Float32Array(d));
      return new faceapi.LabeledFaceDescriptors(name, floatDescriptors);
    });

  if (labeled.length === 0) return null;
  return new faceapi.FaceMatcher(labeled, 0.5);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/faceApi.ts src/lib/faceApi.test.ts package.json package-lock.json
git commit -m "feat: add buildFaceMatcher with unit tests"
```

---

### Task 4: Extend FaceBox and FaceMemoryValue types in PhotoRollCall.tsx

**Files:**
- Modify: `src/components/game/nj/PhotoRollCall.tsx:24-39`

- [ ] **Step 1: Replace FaceBox and FaceMemoryValue interfaces**

In `PhotoRollCall.tsx`, replace the existing `FaceBox` and `FaceMemoryValue` interfaces (lines 24–38) with:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/game/nj/PhotoRollCall.tsx
git commit -m "feat: extend FaceBox and FaceMemoryValue types for real descriptors"
```

---

### Task 5: Add imgRef, modelState, and make processFile async

**Files:**
- Modify: `src/components/game/nj/PhotoRollCall.tsx`

- [ ] **Step 1: Add imports at the top of PhotoRollCall.tsx**

Add to the import block at the top of the file (after existing imports):

```typescript
import { detectFaces, buildFaceMatcher, type FaceMemoryEntry } from "@/lib/faceApi";
```

- [ ] **Step 2: Add imgRef and modelState state inside the component**

Inside `PhotoRollCall()`, after the existing `useRef` for `fileInputRef`, add:

```typescript
const imgRef = useRef<HTMLImageElement>(null);
```

After the existing state declarations (around line 125), add:

```typescript
type ModelState = "idle" | "loading-models" | "detecting" | "done" | "error";
const [modelState, setModelState] = useState<ModelState>("idle");
```

- [ ] **Step 3: Attach imgRef to the rendered img element**

Find the `<img>` element in the JSX (around line 500–505):

```tsx
<img
  src={photoUrl}
  alt="Roll Call Preview"
  className="w-full h-auto block"
  draggable={false}
/>
```

Replace with:

```tsx
<img
  ref={imgRef}
  src={photoUrl}
  alt="Roll Call Preview"
  className="w-full h-auto block"
  draggable={false}
/>
```

- [ ] **Step 4: Replace processFile with async version**

Remove the entire `const processFile = (file: File) => { ... }` function (lines ~249–268) and replace with:

```typescript
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
    // Load image element so face-api.js can process it
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image failed to load"));
    });

    setModelState("detecting");
    const detected = await detectFaces(img);

    // Build matcher from current face memory
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
```

- [ ] **Step 5: Update handleFileChange and handleDrop call sites**

`handleFileChange` (find it, ~line 270):
```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    void processFile(file);
  }
};
```

`handleDrop` (find it, ~line 286):
```typescript
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
  const file = e.dataTransfer.files?.[0];
  if (file) {
    void processFile(file);
  }
};
```

- [ ] **Step 6: Reset modelState in handleReset**

Find `handleReset` and add `setModelState("idle")` to the body:

```typescript
const handleReset = () => {
  setPhotoUrl(null);
  setPhotoFile(null);
  setFaces([]);
  setActiveBoxId(null);
  setSearchQuery("");
  setModelState("idle");
};
```

- [ ] **Step 7: Commit**

```bash
git add src/components/game/nj/PhotoRollCall.tsx
git commit -m "feat: async processFile with real face detection"
```

---

### Task 6: Add loading overlay and 0-faces message to the JSX

**Files:**
- Modify: `src/components/game/nj/PhotoRollCall.tsx` (image workspace JSX)

- [ ] **Step 1: Add loading overlay inside the image workspace**

Find the image workspace div (the one with `className="relative w-full h-auto cursor-crosshair ..."`). Add a loading overlay as the first child:

```tsx
{/* Detection loading overlay */}
{(modelState === "loading-models" || modelState === "detecting") && (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
    <Loader2 className="size-8 animate-spin text-teal-400 mb-3" />
    <p className="text-xs font-bold uppercase tracking-widest text-teal-100">
      {modelState === "loading-models" ? "Loading vision models…" : "Scanning for faces…"}
    </p>
  </div>
)}
```

- [ ] **Step 2: Add 0-faces message after face boxes loop**

After the `{faces.map((box) => { ... })}` block and before the closing `</div>` of the image container, add:

```tsx
{/* No-faces-detected message */}
{modelState === "done" && faces.length === 0 && (
  <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
    <p className="bg-black/80 border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/50">
      No faces detected — click to add manually
    </p>
  </div>
)}
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev -- --port 5175`, open the attendance → Photo Check-In tab, upload a photo with visible faces. Expected:
- "Loading vision models…" overlay appears (~3–5s first visit)
- "Scanning for faces…" appears briefly
- Real face boxes appear at correct positions on faces
- Uploading a non-face photo shows the "No faces detected" message

- [ ] **Step 4: Commit**

```bash
git add src/components/game/nj/PhotoRollCall.tsx
git commit -m "feat: add detection loading overlay and 0-faces message"
```

---

### Task 7: Update handleConfirmTag to store descriptor in Face Memory

**Files:**
- Modify: `src/components/game/nj/PhotoRollCall.tsx`

- [ ] **Step 1: Add computeDescriptorFromCrop helper inside the component**

After the `handlePhotoClick` function, add:

```typescript
// Compute a face descriptor from a manually-placed or missed-detection box.
// Returns null if no face is found in the crop.
const computeDescriptorFromCrop = async (box: FaceBox): Promise<number[] | null> => {
  const img = imgRef.current;
  if (!img) return null;

  const canvas = document.createElement("canvas");
  const pxW = (box.width / 100) * img.naturalWidth;
  const pxH = pxW; // square box
  const pxX = (box.x / 100) * img.naturalWidth;
  const pxY = (box.y / 100) * img.naturalHeight;
  canvas.width = pxW;
  canvas.height = pxH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, pxX, pxY, pxW, pxH, 0, 0, pxW, pxH);

  try {
    const { detectFaces: _d, ...faceapi } = await import("@vladmandic/face-api");
    const result = await (faceapi as any).detectSingleFace(
      canvas,
      new (faceapi as any).SsdMobilenetv1Options({ minConfidence: 0.3 })
    ).withFaceLandmarks().withFaceDescriptor();
    return result ? Array.from(result.descriptor as Float32Array) : null;
  } catch {
    return null;
  }
};
```

Wait, that import pattern is messy. Let me use a cleaner approach — export `computeDescriptorFromCanvas` from `faceApi.ts` instead.

- [ ] **Step 1 (revised): Add computeDescriptorFromCanvas to faceApi.ts**

Append to `src/lib/faceApi.ts`:

```typescript
/**
 * Attempt to compute a face descriptor from a canvas element containing a face crop.
 * Used for manually-placed boxes where auto-detection didn't find the face.
 * Returns null if no face is found within the crop.
 */
export async function computeDescriptorFromCanvas(
  canvas: HTMLCanvasElement
): Promise<number[] | null> {
  await loadModels();
  const result = await faceapi
    .detectSingleFace(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result ? Array.from(result.descriptor) : null;
}
```

- [ ] **Step 2: Update the import in PhotoRollCall.tsx to include computeDescriptorFromCanvas**

```typescript
import { detectFaces, buildFaceMatcher, computeDescriptorFromCanvas, type FaceMemoryEntry } from "@/lib/faceApi";
```

- [ ] **Step 3: Replace handleConfirmTag with async version**

Find the existing `handleConfirmTag` function and replace entirely:

```typescript
const handleConfirmTag = async (
  boxId: string,
  person: { name: string; type: string; row: number }
) => {
  const box = faces.find((f) => f.id === boxId);
  if (!box) return;

  // Resolve descriptor: use pre-computed one, or derive from crop for manual boxes
  let descriptor = box.descriptor;
  if (!descriptor && imgRef.current) {
    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    const pxW = (box.width / 100) * img.naturalWidth;
    const pxH = pxW;
    const pxX = (box.x / 100) * img.naturalWidth;
    const pxY = (box.y / 100) * img.naturalHeight;
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, pxX, pxY, pxW, pxH, 0, 0, pxW, pxH);
      descriptor = await computeDescriptorFromCanvas(canvas);
    }
  }

  // Update face boxes
  setFaces((prev) =>
    prev.map((f) =>
      f.id === boxId
        ? { ...f, name: person.name, type: person.type, row: person.row }
        : f
    )
  );

  // Save to Face Memory including descriptor
  setFaceMemory((current) => {
    const prevEntry = current[person.name];
    const prevDescriptors = prevEntry?.descriptors ?? [];
    const nextDescriptors = descriptor
      ? [...prevDescriptors, descriptor]
      : prevDescriptors;

    const nextMemory: Record<string, FaceMemoryValue> = {
      ...current,
      [person.name]: {
        count: (prevEntry?.count ?? 0) + 1,
        row: person.row,
        type: person.type,
        descriptors: nextDescriptors,
      },
    };
    try {
      localStorage.setItem("nj-face-memory-v1", JSON.stringify(nextMemory));
    } catch (e) {
      console.error("Failed to write to localStorage:", e);
    }
    return nextMemory;
  });

  celebrate(award("face_tagged"));
  setActiveBoxId(null);
  setSearchQuery("");
};
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/faceApi.ts src/components/game/nj/PhotoRollCall.tsx
git commit -m "feat: store face descriptor in Face Memory on tag confirm"
```

---

### Task 8: Replace global suggestion with per-box recognitionSuggestion in JSX

**Files:**
- Modify: `src/components/game/nj/PhotoRollCall.tsx`

- [ ] **Step 1: Remove the suggestion useMemo**

Find and delete the entire `suggestion` useMemo block (~lines 217–238):

```typescript
// DELETE this entire block:
const suggestion = useMemo(() => {
  ...
}, [faceMemory, faces]);
```

- [ ] **Step 2: Remove the generateMockFaces function and getSeed/createRandom helpers**

Delete:
- `getSeed` function (~lines 41–48)
- `createRandom` function (~lines 50–56)
- `generateMockFaces` function (~lines 58–82)

These are all replaced by `detectFaces` from `faceApi.ts`.

- [ ] **Step 3: Update the popover JSX to use box.recognitionSuggestion**

Find the popover section inside the face boxes map (~lines 594–619):

```tsx
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
```

Replace with:

```tsx
{/* One-Click Recognition Suggestion */}
{!isConfirmed && box.recognitionSuggestion && (
  <div className="mb-2.5 border border-teal-500/25 bg-teal-950/30 p-2 rounded-none">
    <p className="text-[9px] text-teal-400/70 uppercase tracking-widest">
      Suggested Tag
    </p>
    <p className="mt-0.5 text-xs font-bold text-white">
      {box.recognitionSuggestion.name}
    </p>
    <p className="text-[9px] text-teal-300/70">
      Confidence: {box.recognitionSuggestion.confidence}%
    </p>
    <button
      type="button"
      className="mt-1.5 w-full bg-teal-500 hover:bg-teal-600 text-black text-[9px] font-bold py-1 uppercase tracking-wider transition rounded-none"
      onClick={() => {
        void handleConfirmTag(box.id, {
          name: box.recognitionSuggestion!.name,
          type: box.recognitionSuggestion!.type,
          row: box.recognitionSuggestion!.row,
        });
      }}
    >
      Accept Suggestion
    </button>
  </div>
)}
```

- [ ] **Step 4: Update Accept Suggestion button in the other call site (if any)**

Search the file for any remaining `suggestion.name` or `suggestion.confidence` references and replace them with `box.recognitionSuggestion?.name` etc. There should be none after step 3, but verify:

```bash
grep -n "suggestion\." src/components/game/nj/PhotoRollCall.tsx
```

Expected: no output (all references removed).

- [ ] **Step 5: Check TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/game/nj/PhotoRollCall.tsx
git commit -m "feat: per-box recognition suggestions from FaceMatcher"
```

---

### Task 9: End-to-end browser verification

**Files:** None (verification only)

- [ ] **Step 1: Run the dev server**

```bash
npm run dev -- --port 5175
```

- [ ] **Step 2: Test first-time model loading**

Open `http://localhost:5175/nj?tab=attendance`, click "Photo Check-In". Upload a group photo. Verify:
- "Loading vision models…" overlay appears (~3–8s depending on network/cache)
- "Scanning for faces…" appears briefly after models load
- Face boxes appear at real face positions (not random scatter)
- Toast shows correct count: "X face(s) detected!"

- [ ] **Step 3: Test recognition learning**

1. Click an unknown face box → popover opens with no suggestion (Face Memory empty)
2. Search roster → select a person → confirm tag
3. Remove photo (X button) → upload the same photo again
4. The same face box should now show a recognition suggestion for that person
5. Confidence % should be a real distance-based value (e.g. 78%), not the fake formula

- [ ] **Step 4: Test manual box + descriptor capture**

1. Upload a photo → click on a face that was NOT auto-detected → manual box appears
2. Tag that box with a roster person
3. Re-upload the photo → the manually-placed face's descriptor is now in Face Memory → recognition suggestion appears for that face location

- [ ] **Step 5: Test 0-faces scenario**

Upload an image with no faces (e.g. a landscape photo). Expected:
- "No faces detected — click to add manually" message appears inside the image
- Manual box placement still works

- [ ] **Step 6: Test model failure fallback**

Temporarily rename `public/models/ssd_mobilenetv1_model-weights_manifest.json` to break loading:
```bash
mv public/models/ssd_mobilenetv1_model-weights_manifest.json public/models/ssd_mobilenetv1_model-weights_manifest.json.bak
```
Upload a photo. Expected: error toast "Vision models unavailable — add faces manually." Manual box placement works.

Restore:
```bash
mv public/models/ssd_mobilenetv1_model-weights_manifest.json.bak public/models/ssd_mobilenetv1_model-weights_manifest.json
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: photo roll call — real face detection and recognition complete"
```
