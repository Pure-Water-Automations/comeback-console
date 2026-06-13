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
