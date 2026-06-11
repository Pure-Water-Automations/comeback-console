import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";

type AsciiFireworksFrame = {
  t: string[];
  c: string[];
};

type AsciiFireworksData = {
  w: number;
  h: number;
  fps: number;
  palette: Record<string, string>;
  frames: AsciiFireworksFrame[];
};

type ColorRun = {
  color: string;
  text: string;
};

let cachedAsciiFireworks: AsciiFireworksData | null = null;
let pendingAsciiFireworks: Promise<AsciiFireworksData> | null = null;

function loadAsciiFireworks() {
  if (cachedAsciiFireworks) return Promise.resolve(cachedAsciiFireworks);

  pendingAsciiFireworks ??= fetch("/fx/ascii_fireworks.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load ASCII fireworks: ${response.status}`);
      }
      return response.json() as Promise<AsciiFireworksData>;
    })
    .then((data) => {
      cachedAsciiFireworks = data;
      return data;
    })
    .catch((error) => {
      pendingAsciiFireworks = null;
      throw error;
    });

  return pendingAsciiFireworks;
}

function frameRows(frame: AsciiFireworksFrame, palette: Record<string, string>) {
  return frame.t.map((rowText, rowIndex) => {
    const rowColors = frame.c[rowIndex] ?? "";
    const runs: ColorRun[] = [];

    for (let column = 0; column < rowText.length; column += 1) {
      const text = rowText[column] ?? " ";
      const paletteKey = rowColors[column] ?? "";
      const color = palette[paletteKey] ?? "rgba(255,255,255,0.72)";
      const previousRun = runs[runs.length - 1];

      if (previousRun?.color === color) {
        previousRun.text += text;
      } else {
        runs.push({ color, text });
      }
    }

    return runs;
  });
}

export function AsciiFireworks({ active }: { active: boolean }) {
  const reducedMotion = useReducedMotion() ?? false;
  const [data, setData] = useState<AsciiFireworksData | null>(() => cachedAsciiFireworks);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!data) {
      void loadAsciiFireworks()
        .then((loadedData) => {
          if (!cancelled) {
            setData(loadedData);
          }
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    if (!data?.frames.length) return undefined;

    if (reducedMotion) {
      setFrameIndex(Math.floor(data.frames.length / 2));
      return undefined;
    }

    if (!active) return undefined;

    const frameDuration = 1000 / Math.max(1, data.fps || 20);
    let animationFrame = 0;
    let previousTime = performance.now();

    const tick = (time: number) => {
      const elapsed = time - previousTime;

      if (elapsed >= frameDuration) {
        const frameStep = Math.max(1, Math.floor(elapsed / frameDuration));
        previousTime += frameStep * frameDuration;
        setFrameIndex((currentFrame) => (currentFrame + frameStep) % data.frames.length);
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [active, data, reducedMotion]);

  const activeFrame = data?.frames[frameIndex % data.frames.length];
  const rows = useMemo(() => {
    if (!activeFrame || !data) return [];
    return frameRows(activeFrame, data.palette);
  }, [activeFrame, data]);

  if (!active || !data || !activeFrame) return null;

  const style = {
    "--ascii-font-size": `min(${162 / data.w}cqw, ${154 / data.h}cqh)`,
  } as CSSProperties;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[5] overflow-hidden opacity-[0.68] mix-blend-screen [container-type:size]"
      aria-hidden="true"
      style={style}
    >
      <pre className="absolute left-1/2 top-1/2 m-0 -translate-x-1/2 -translate-y-1/2 select-none font-mono text-[length:var(--ascii-font-size)] font-bold leading-[0.64] tracking-normal text-white [text-shadow:0_0_10px_currentColor]">
        {rows.map((runs, rowIndex) => (
          <div key={`${frameIndex}-${rowIndex}`}>
            {runs.map((run, runIndex) => (
              <span key={`${rowIndex}-${runIndex}`} style={{ color: run.color }}>
                {run.text}
              </span>
            ))}
          </div>
        ))}
      </pre>
    </div>
  );
}
