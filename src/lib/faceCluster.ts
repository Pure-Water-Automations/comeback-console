// Pure clustering helpers for MEMORY TRAINING. Groups detected faces that look like
// the same person (Photos-style) so a trainer can tag once per person instead of per face.
// The euclideanDistance + clusterFaces functions are pure and unit-tested; cropFaceToDataUrl
// touches canvas/DOM and is exercised in the browser.

export interface ClusterableFace {
  id: string;
  descriptor: number[];
}

/** Euclidean distance between two equal-length face descriptors. */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Descriptor length mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// face-api descriptor distance for the same person is typically < 0.5; different people > 0.6.
// A slightly loose threshold groups the same person across angles/lighting without over-merging.
export const DEFAULT_CLUSTER_THRESHOLD = 0.56;

/**
 * Greedy single-pass clustering. Each face joins the first existing cluster whose
 * representative (first member) is within `threshold`; otherwise it seeds a new cluster.
 * Order-dependent but fast and good enough for a POC training pass.
 */
export function clusterFaces<T extends ClusterableFace>(
  faces: T[],
  threshold: number = DEFAULT_CLUSTER_THRESHOLD,
): T[][] {
  const clusters: T[][] = [];

  for (const face of faces) {
    let placed = false;
    for (const cluster of clusters) {
      if (euclideanDistance(cluster[0].descriptor, face.descriptor) <= threshold) {
        cluster.push(face);
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push([face]);
    }
  }

  // Largest groups first — the trainer tags the most-photographed people up front.
  return clusters.sort((a, b) => b.length - a.length);
}

export interface CropBox {
  x: number;       // percent left
  y: number;       // percent top
  width: number;   // percent width
  height?: number; // percent height (falls back to width when absent)
}

/**
 * Crop a padded square thumbnail of a face out of a loaded image and return a JPEG data URL.
 * Keeping thumbnails as data URLs lets us revoke the (potentially many) full-photo object URLs
 * immediately after processing.
 */
export function cropFaceToDataUrl(
  img: HTMLImageElement,
  box: CropBox,
  size = 160,
  pad = 0.35,
): string {
  const naturalW = img.naturalWidth;
  const naturalH = img.naturalHeight;

  const bw = (box.width / 100) * naturalW;
  const bh = ((box.height ?? box.width) / 100) * naturalH;
  const cx = (box.x / 100) * naturalW + bw / 2;
  const cy = (box.y / 100) * naturalH + bh / 2;

  // Square crop region centered on the face, padded, clamped to image bounds.
  const side = Math.max(bw, bh) * (1 + pad * 2);
  let sx = cx - side / 2;
  let sy = cy - side / 2;
  let s = side;
  sx = Math.max(0, Math.min(sx, naturalW - 1));
  sy = Math.max(0, Math.min(sy, naturalH - 1));
  s = Math.min(s, naturalW - sx, naturalH - sy);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
  }
  return canvas.toDataURL("image/jpeg", 0.82);
}
