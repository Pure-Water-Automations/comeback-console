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
