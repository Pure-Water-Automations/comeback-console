import { describe, it, expect, vi, beforeAll } from "vitest";

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

import { buildFaceMatcher, loadModels } from "./faceApi";

beforeAll(async () => {
  await loadModels();
});

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
    expect(() => buildFaceMatcher(memory)).not.toThrow();
    expect(buildFaceMatcher(memory)).not.toBeNull();
  });
});
