import { motion, useScroll, useTransform, useSpring, type MotionValue } from "motion/react";

/**
 * Fixed full-viewport "stage" of abstract circles.
 * Their position / scale / color are driven by the page's global scroll
 * progress, so scrolling choreographs the whole composition.
 */
export function CircleStage() {
  const { scrollYProgress } = useScroll();
  const p = useSpring(scrollYProgress, { stiffness: 80, damping: 24, mass: 0.4 });

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* faint grid baseline */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-ink) 1px, transparent 1px), linear-gradient(90deg, var(--color-ink) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <BigCircle p={p} />
      <OrbitCircle p={p} />
      <SignalDot p={p} />
      <RingOutline p={p} />
      <SmallSwarm p={p} />
    </div>
  );
}

function BigCircle({ p }: { p: MotionValue<number> }) {
  const x = useTransform(p, [0, 0.5, 1], ["-10vw", "30vw", "8vw"]);
  const y = useTransform(p, [0, 0.5, 1], ["20vh", "0vh", "30vh"]);
  const scale = useTransform(p, [0, 0.35, 0.7, 1], [0.5, 1.15, 0.7, 1.4]);
  const opacity = useTransform(p, [0, 0.05, 0.95, 1], [0, 1, 1, 0.6]);
  return (
    <motion.div
      style={{ x, y, scale, opacity }}
      className="absolute left-1/2 top-1/2 h-[44vmin] w-[44vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
    />
  );
}

function OrbitCircle({ p }: { p: MotionValue<number> }) {
  const x = useTransform(p, [0, 0.5, 1], ["40vw", "-25vw", "20vw"]);
  const y = useTransform(p, [0, 0.5, 1], ["-25vh", "20vh", "-10vh"]);
  const scale = useTransform(p, [0, 1], [0.3, 1.1]);
  return (
    <motion.div
      style={{ x, y, scale }}
      className="absolute left-1/2 top-1/2 h-[22vmin] w-[22vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink"
    />
  );
}

function SignalDot({ p }: { p: MotionValue<number> }) {
  const x = useTransform(p, [0, 0.5, 1], ["-30vw", "25vw", "-15vw"]);
  const y = useTransform(p, [0, 0.5, 1], ["30vh", "-20vh", "25vh"]);
  const scale = useTransform(p, [0, 0.5, 1], [1, 3.2, 1.6]);
  return (
    <motion.div
      style={{ x, y, scale }}
      className="absolute left-1/2 top-1/2 h-[6vmin] w-[6vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal"
    />
  );
}

function RingOutline({ p }: { p: MotionValue<number> }) {
  const rotate = useTransform(p, [0, 1], [0, 220]);
  const scale = useTransform(p, [0, 0.5, 1], [1.6, 0.9, 1.8]);
  const opacity = useTransform(p, [0, 0.2, 0.8, 1], [0, 0.5, 0.5, 0]);
  return (
    <motion.div
      style={{ rotate, scale, opacity }}
      className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-ink"
    />
  );
}

function SmallSwarm({ p }: { p: MotionValue<number> }) {
  const items = [
    { a: "-38vw", b: "-18vh", s: 0.6 },
    { a: "36vw", b: "28vh", s: 0.9 },
    { a: "12vw", b: "-34vh", s: 0.5 },
    { a: "-22vw", b: "8vh", s: 0.7 },
  ];
  return (
    <>
      {items.map((it, i) => (
        <SwarmDot key={i} p={p} a={it.a} b={it.b} s={it.s} i={i} />
      ))}
    </>
  );
}

function SwarmDot({
  p,
  a,
  b,
  s,
  i,
}: {
  p: MotionValue<number>;
  a: string;
  b: string;
  s: number;
  i: number;
}) {
  const x = useTransform(p, [0, 1], [a, i % 2 ? "0vw" : "0vw"]);
  const y = useTransform(p, [0, 1], [b, "0vh"]);
  const scale = useTransform(p, [0, 0.5, 1], [s, s * 1.8, s * 0.4]);
  const opacity = useTransform(p, [0, 0.1, 0.9, 1], [0, 0.85, 0.85, 0]);
  return (
    <motion.div
      style={{ x, y, scale, opacity }}
      className="absolute left-1/2 top-1/2 h-[4vmin] w-[4vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
    />
  );
}
