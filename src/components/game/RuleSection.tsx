import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import type { Rule } from "./rulesData";

export function RuleSection({ rule, align }: { rule: Rule; align: "left" | "right" }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // text drifts as the section passes through the viewport
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);
  const lineScale = useTransform(scrollYProgress, [0.1, 0.5], [0, 1]);
  const accentX = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);

  const lines = rule.title.split("\n");

  return (
    <section
      ref={ref}
      className="relative z-10 flex min-h-screen items-center px-6 py-24 md:px-16"
    >
      <motion.div
        style={{ y, opacity }}
        className={
          align === "right"
            ? "ml-auto max-w-2xl text-right"
            : "mr-auto max-w-2xl text-left"
        }
      >
        <div
          className={
            align === "right"
              ? "flex items-center justify-end gap-4"
              : "flex items-center gap-4"
          }
        >
          <span className="text-sm font-bold tracking-[0.3em] text-signal">
            {rule.index}
          </span>
          <span className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            {rule.kicker}
          </span>
        </div>

        <motion.div
          style={{ scaleX: lineScale }}
          className={
            align === "right"
              ? "mt-5 ml-auto h-[3px] w-32 origin-right bg-ink"
              : "mt-5 h-[3px] w-32 origin-left bg-ink"
          }
        />

        <h2 className="display mt-6 text-[13vw] text-ink md:text-[6.5vw]">
          {lines.map((ln, i) => (
            <span key={i} className="block overflow-hidden">
              <motion.span
                className="block"
                initial={{ y: "110%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: false, amount: 0.6 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
              >
                {ln}
              </motion.span>
            </span>
          ))}
        </h2>

        <div
          className={
            align === "right" ? "mt-8 flex justify-end" : "mt-8 flex"
          }
        >
          <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            {rule.body}
          </p>
        </div>

        <motion.div
          style={{ x: accentX }}
          className={
            align === "right"
              ? "mt-10 ml-auto h-4 w-4 rounded-full bg-signal"
              : "mt-10 h-4 w-4 rounded-full bg-signal"
          }
        />
      </motion.div>
    </section>
  );
}
