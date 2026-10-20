"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { PersonaAvatar } from "@/components/PersonaAvatar";

/** Placeholder people: an empty archetype lets personaLook pick five different characters by slot. */
const SLOTS = [0, 1, 2, 3, 4].map((i) => ({ archetype: "", viewport: "desktop" as const, name: `Tester ${i + 1}` }));

/**
 * Before the personas exist: five dim lanes, with a calm character fading into each one in turn,
 * as if the testers are walking into the lab. Purely decorative; the status line says what is
 * happening.
 */
export function ArrivingLanes({ recruiting }: { recruiting: boolean }) {
  const reduce = useReducedMotion();
  return (
    <ol aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {SLOTS.map((slot, i) => (
        <motion.li
          key={slot.name}
          className={`min-w-0 ${i >= 2 ? "hidden sm:block" : ""}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.6, delay: 0.15 + i * 0.12, ease: [0.2, 0.7, 0.2, 1] }}
        >
          <div className="relative flex h-full flex-col gap-3.5 overflow-hidden rounded-[22px] border border-dashed border-white/12 bg-night-2/50 p-3.5">
            <div className="flex items-center gap-3">
              <motion.span
                className="shrink-0"
                initial={{ opacity: 0, scale: 0.6, y: 10, filter: "saturate(0) brightness(0.5)" }}
                animate={{
                  opacity: recruiting ? 0.9 : 0.45,
                  scale: 1,
                  y: 0,
                  filter: recruiting ? "saturate(0.75) brightness(0.9)" : "saturate(0.15) brightness(0.6)",
                }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 160, damping: 16, delay: 0.5 + i * 0.45 }}
              >
                <PersonaAvatar persona={slot} index={i} size={52} mood="calm" />
              </motion.span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Bar w="70%" />
                <Bar w="45%" />
              </div>
            </div>
            <Shimmer className="aspect-[4/3] rounded-[14px]" delay={i * 0.2} />
            <Shimmer className="h-16 rounded-[16px]" delay={i * 0.2 + 0.1} />
            <div className="flex flex-col gap-2">
              <Bar w="100%" />
              <Bar w="60%" />
            </div>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

function Bar({ w }: { w: string }) {
  return <span className="block h-2 rounded-full bg-white/[0.07]" style={{ width: w }} />;
}

function Shimmer({ className, delay }: { className: string; delay: number }) {
  return (
    <div className={`relative overflow-hidden bg-white/[0.04] ${className}`}>
      <motion.span
        className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent motion-reduce:hidden"
        initial={{ left: "-50%" }}
        animate={{ left: ["-50%", "120%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay }}
      />
    </div>
  );
}
