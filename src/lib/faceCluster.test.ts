import { describe, it, expect } from "vitest";
import { euclideanDistance, clusterFaces, DEFAULT_CLUSTER_THRESHOLD } from "./faceCluster";

// Build a 128-dim descriptor filled with `v`, optionally perturbing the first element by `delta`.
function descriptor(v: number, delta = 0): number[] {
  const d = new Array(128).fill(v);
  d[0] = v + delta;
  return d;
}

describe("euclideanDistance", () => {
  it("is zero for identical vectors", () => {
    expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it("computes the straight-line distance", () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
  });

  it("throws on length mismatch", () => {
    expect(() => euclideanDistance([1, 2], [1, 2, 3])).toThrow();
  });
});

describe("clusterFaces", () => {
  it("returns no clusters for an empty list", () => {
    expect(clusterFaces([])).toEqual([]);
  });

  it("returns a single cluster for one face", () => {
    const faces = [{ id: "a", descriptor: descriptor(0.1) }];
    const clusters = clusterFaces(faces);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(1);
  });

  it("merges near-identical descriptors into one cluster", () => {
    const faces = [
      { id: "a", descriptor: descriptor(0.1) },
      { id: "b", descriptor: descriptor(0.1, 0.05) }, // distance 0.05 << threshold
    ];
    const clusters = clusterFaces(faces);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].map((f) => f.id).sort()).toEqual(["a", "b"]);
  });

  it("splits clearly different descriptors into separate clusters", () => {
    const faces = [
      { id: "a", descriptor: descriptor(0) },
      { id: "b", descriptor: descriptor(10) }, // distance ~113 >> threshold
    ];
    const clusters = clusterFaces(faces);
    expect(clusters).toHaveLength(2);
  });

  it("groups two of the same person and isolates a third", () => {
    const faces = [
      { id: "a", descriptor: descriptor(0.2) },
      { id: "b", descriptor: descriptor(0.2, 0.04) },
      { id: "c", descriptor: descriptor(9) },
    ];
    const clusters = clusterFaces(faces);
    expect(clusters).toHaveLength(2);
    // Largest cluster first
    expect(clusters[0]).toHaveLength(2);
    expect(clusters[1]).toHaveLength(1);
    expect(clusters[1][0].id).toBe("c");
  });

  it("respects a custom threshold", () => {
    const faces = [
      { id: "a", descriptor: descriptor(0) },
      { id: "b", descriptor: descriptor(0, 0.4) }, // distance 0.4
    ];
    // Below default threshold -> merged
    expect(clusterFaces(faces, DEFAULT_CLUSTER_THRESHOLD)).toHaveLength(1);
    // Tighter threshold -> split
    expect(clusterFaces(faces, 0.2)).toHaveLength(2);
  });
});
