import { motion, useScroll, useSpring } from "motion/react";

export function ProgressRail() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  return (
    <>
      {/* top progress bar */}
      <motion.div
        style={{ scaleX }}
        className="fixed left-0 top-0 z-50 h-1 w-full origin-left bg-signal"
      />

      {/* fixed header */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 text-xs uppercase tracking-[0.3em] md:px-16">
        <span className="font-bold text-ink">Rules of the Game</span>
        <span className="text-muted-foreground">Draft</span>
      </header>
    </>
  );
}

export function ScrollHint() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-muted-foreground"
    >
      <motion.span
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="inline-block"
      >
        Scroll ↓
      </motion.span>
    </motion.div>
  );
}
