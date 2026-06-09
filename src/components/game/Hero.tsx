import { motion } from "motion/react";
import crystal from "@/assets/sprites/spirit/spirit_glow.png";

export function Hero() {
  const word = "RULES";
  return (
    <section className="relative z-10 flex min-h-screen flex-col justify-center px-6 md:px-16">
      <p className="mb-6 text-sm uppercase tracking-[0.4em] text-signal">
        How to play
      </p>
      <h1 className="display text-[22vw] text-ink md:text-[15vw]">
        <span className="block overflow-hidden">
          {word.split("").map((c, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ y: "120%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.06 }}
            >
              {c}
            </motion.span>
          ))}
        </span>
        <span className="block overflow-hidden">
          <motion.span
            className="inline-block text-muted-foreground"
            initial={{ y: "120%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          >
            of the game
          </motion.span>
        </span>
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="mt-10 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg"
      >
        Five rules, told as a quest. Scroll to send the party across the
        field — copy is placeholder until you drop in the real rules.
      </motion.p>
    </section>
  );
}

export function Outro() {
  return (
    <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <motion.img
        src={crystal}
        alt=""
        aria-hidden
        loading="lazy"
        initial={{ scale: 0, rotate: -8 }}
        whileInView={{ scale: 1, rotate: 0 }}
        viewport={{ once: false, amount: 0.6 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 w-[26vmin] select-none drop-shadow-2xl"
      />
      <h2 className="display text-[14vw] text-ink md:text-[8vw]">
        Now play.
      </h2>
      <p className="mt-6 max-w-sm text-sm uppercase tracking-[0.3em] text-muted-foreground">
        End of draft
      </p>
    </section>
  );
}
