# Photo Roll Call — Real Face Detection Design

**Date:** 2026-06-13  
**Scope:** Replace mock face detection in `PhotoRollCall.tsx` with real client-side detection + recognition using face-api.js. Recognition learns from manual tagging and improves over time. Photo stays on device.

---

## Architecture

Three files involved:

- **`src/lib/faceApi.ts`** (new) — lazy-loads face-api.js models, exposes `detectFaces(imgElement)` and `getFaceMatcher(descriptors)`. Isolates all TensorFlow/face-api concerns.
- **`src/components/game/nj/PhotoRollCall.tsx`** (modified) — replaces `generateMockFaces()` with `detectFaces()`, extends Face Memory to store descriptor arrays, swaps suggestion logic to use `FaceMatcher`.
- **`public/models/`** (new static assets) — three model weight files served statically and browser-cached (~12MB total).

New npm dependency: `@vladmandic/face-api` (actively maintained fork, same API as the original face-api.js).

### Models required

| Model | Purpose | Size |
|---|---|---|
| `ssd_mobilenetv1` | Face detection (bounding boxes) | ~5.4MB |
| `face_landmark_68` | Landmark detection (required pre-step for recognition) | ~350KB |
| `face_recognition` | 128-dim face embeddings | ~6.2MB |

All served from `/public/models/`, loaded once, cached by the browser.

---

## Data Model

### `FaceMemoryValue` (localStorage `nj-face-memory-v1`)

```typescript
interface FaceMemoryValue {
  count: number;
  row: number;
  type: string;
  descriptors?: number[][];  // one 128-dim array per tagging event; absent on existing entries
}
```

No key migration needed. Existing entries without `descriptors` remain valid — those people skip recognition suggestions but still appear in manual roster search.

### `FaceBox`

```typescript
interface FaceBox {
  id: string;
  x: number;
  y: number;
  width: number;
  name: string | null;
  type: string | null;
  row: number | null;
  isManual: boolean;
  descriptor: number[] | null;  // null for manually-placed boxes before tagging
}
```

---

## Detection Flow

1. User uploads photo → **"Scanning for faces..."** overlay appears on image container
2. First visit: models download (~12MB) → overlay text updates to **"Loading vision models..."**
3. `detectFaces(imgEl)` runs — returns real bounding boxes with a pre-computed 128-dim descriptor per detected face
4. For each detected face: if any person in Face Memory has stored descriptors, run `FaceMatcher` (threshold 0.5) — closest match becomes the box's auto-suggestion
5. Overlay clears, boxes appear at real face positions

### On `handleConfirmTag`
- Box's `descriptor` (already computed during detection) is appended to `faceMemory[person.name].descriptors`
- Saves to `nj-face-memory-v1` in localStorage
- Recognition improves with each additional tagging event per person

---

## Recognition Suggestion Logic

Replaces the current "most-tagged untagged person" heuristic:

- Build a `LabeledFaceDescriptors[]` from all Face Memory entries that have at least one stored descriptor
- Instantiate `FaceMatcher` with threshold 0.5
- For each detected face box: call `findBestMatch(box.descriptor)` → if not `'unknown'`, that person is the suggestion
- Confidence displayed as `Math.round((1 - distance) * 100)%` (replaces the fake `50 + count * 10` formula)

---

## Edge Cases

| Situation | Behaviour |
|---|---|
| 0 faces detected | Show "No faces detected — click to add manually" message inside image area; manual box placement still works |
| Manually placed box | No descriptor at placement; descriptor computed when user confirms a tag from that crop region |
| Model load failure | Fall back to manual-only mode; toast: "Vision models unavailable — add faces manually" |
| Existing Face Memory with no descriptors | Entries preserved; people appear in roster search but not recognition suggestions until at least one photo is tagged |
| Face too small / occluded | face-api.js may not detect it; user can click to add manual box |

---

## UX States

| State | What user sees |
|---|---|
| No photo | Existing drag-and-drop upload zone (unchanged) |
| Photo loading + first model download | Full-image overlay: spinner + "Loading vision models..." |
| Photo loaded, detecting | Overlay: spinner + "Scanning for faces..." |
| Detection complete | Real face boxes at correct positions; suggestions populated from FaceMatcher |
| 0 faces detected | Subtle message inside image: "No faces detected — click to add manually" |
| Model load failed | Toast + manual-only mode |

---

## Out of Scope

- Cross-device Face Memory sync (per-device is sufficient for now)
- Server-side detection or recognition
- Automatic check-in without manual confirmation
- Training on more than one reference photo source (tagging is the only input)
