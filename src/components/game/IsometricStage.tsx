import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  type MotionValue,
} from "motion/react";

import terrain from "@/assets/iso/terrain.jpg";
import hero from "@/assets/sprites/adventurer/adventurer_walking.png";
import creature from "@/assets/sprites/npc/npc_confused.png";
import temple from "@/assets/sprites/mentor/mentor_chair.png";
import volcano from "@/assets/sprites/smart_guy/smart_guy_books.png";
import forest from "@/assets/sprites/mentor/mentor_cheer.png";
import icepeak from "@/assets/sprites/spirit/spirit_calendar.png";
import crystal from "@/assets/sprites/spirit/spirit_glow.png";

/**
 * Fixed full-viewport isometric "stage".
 * A walking hero + companion traverse the field while settings (temple,
 * volcano, forest, ice peak, crystal) parallax in and out — all choreographed
 * by the page's global scroll progress, like a side-scrolling game level.
 */
export function IsometricStage() {
  const { scrollYProgress } = useScroll();
  const p = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.4,
  });

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <TerrainBackdrop p={p} />

      {/* settings drift through at different depths */}
      <Setting
        p={p}
        src={temple}
        alt=""
        size="34vmin"
        topPct={14}
        from={[-30, 0]}
        to={[40, -10]}
        window={[0.0, 0.05, 0.3, 0.42]}
        depth={0.5}
      />
      <Setting
        p={p}
        src={forest}
        alt=""
        size="30vmin"
        topPct={52}
        from={[60, 8]}
        to={[-25, -4]}
        window={[0.12, 0.22, 0.42, 0.55]}
        depth={0.8}
      />
      <Setting
        p={p}
        src={icepeak}
        alt=""
        size="36vmin"
        topPct={10}
        from={[-50, 4]}
        to={[30, -8]}
        window={[0.3, 0.42, 0.6, 0.72]}
        depth={0.45}
      />
      <Setting
        p={p}
        src={volcano}
        alt=""
        size="38vmin"
        topPct={46}
        from={[55, 6]}
        to={[-20, -6]}
        window={[0.5, 0.62, 0.8, 0.92]}
        depth={0.7}
      />
      <Setting
        p={p}
        src={crystal}
        alt=""
        size="24vmin"
        topPct={28}
        from={[40, -6]}
        to={[-10, 6]}
        window={[0.72, 0.84, 0.98, 1.0]}
        depth={1}
      />

      {/* the travelling party */}
      <Companion p={p} />
      <HeroSprite p={p} />
    </div>
  );
}

function TerrainBackdrop({ p }: { p: MotionValue<number> }) {
  const x = useTransform(p, [0, 1], ["-6vw", "6vw"]);
  const y = useTransform(p, [0, 1], ["-3vh", "3vh"]);
  const scale = useTransform(p, [0, 1], [1.15, 1.3]);
  return (
    <motion.img
      src={terrain}
      alt=""
      aria-hidden
      style={{ x, y, scale }}
      className="absolute inset-0 h-full w-full object-cover opacity-[0.22] mix-blend-multiply"
    />
  );
}

/** A setting that slides across the field with a parallax depth + fade window. */
function Setting({
  p,
  src,
  alt,
  size,
  topPct,
  from,
  to,
  window: win,
  depth,
}: {
  p: MotionValue<number>;
  src: string;
  alt: string;
  size: string;
  topPct: number;
  from: [number, number]; // [xVw, yVh] entry
  to: [number, number]; // [xVw, yVh] exit
  window: [number, number, number, number]; // fade in start/full, out full/end
  depth: number; // 0..1 — closer = bigger/sharper
}) {
  const x = useTransform(p, [win[0], win[3]], [`${from[0]}vw`, `${to[0]}vw`]);
  const y = useTransform(p, [win[0], win[3]], [`${from[1]}vh`, `${to[1]}vh`]);
  const opacity = useTransform(
    p,
    [win[0], win[1], win[2], win[3]],
    [0, 0.6 + depth * 0.4, 0.6 + depth * 0.4, 0],
  );
  const scale = 0.7 + depth * 0.5;
  return (
    <motion.img
      src={src}
      alt={alt}
      aria-hidden
      loading="lazy"
      style={{ x, y, opacity, width: size, top: `${topPct}%`, scale }}
      className="absolute left-1/2 -translate-x-1/2 select-none drop-shadow-2xl"
    />
  );
}

/** The hero walks across the level with a continuous bob. */
function HeroSprite({ p }: { p: MotionValue<number> }) {
  const x = useTransform(
    p,
    [0, 0.25, 0.5, 0.75, 1],
    ["-12vw", "18vw", "-8vw", "22vw", "-6vw"],
  );
  const y = useTransform(p, [0, 0.5, 1], ["6vh", "0vh", "8vh"]);
  const flip = useTransform(
    p,
    [0, 0.25, 0.5, 0.75, 1],
    [1, 1, -1, 1, -1],
  );
  return (
    <motion.div
      style={{ x, y }}
      className="absolute left-1/2 top-[42%] z-10 -translate-x-1/2"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.img
          src={hero}
          alt=""
          aria-hidden
          style={{ scaleX: flip }}
          className="w-[22vmin] select-none drop-shadow-2xl"
        />
      </motion.div>
    </motion.div>
  );
}

/** The companion trails the hero a beat behind. */
function Companion({ p }: { p: MotionValue<number> }) {
  const x = useTransform(
    p,
    [0, 0.25, 0.5, 0.75, 1],
    ["-22vw", "8vw", "-18vw", "12vw", "-16vw"],
  );
  const y = useTransform(p, [0, 0.5, 1], ["12vh", "5vh", "13vh"]);
  return (
    <motion.div
      style={{ x, y }}
      className="absolute left-1/2 top-[42%] z-10 -translate-x-1/2"
    >
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{
          duration: 0.7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.15,
        }}
      >
        <img
          src={creature}
          alt=""
          aria-hidden
          loading="lazy"
          className="w-[12vmin] select-none drop-shadow-xl"
        />
      </motion.div>
    </motion.div>
  );
}
