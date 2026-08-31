"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface SplashWord {
  text: string;
  from: { x: number; y: number };
}

// Stacked top to bottom, each entering from a different direction so the
// three don't read as one repeated motion.
const WORDS: SplashWord[] = [
  { text: "Gift Card", from: { x: -60, y: 0 } },
  { text: "Crypto", from: { x: 60, y: 0 } },
  { text: "Trade", from: { x: 0, y: 60 } },
];

// Matches the spring already used across the auth flow's own page
// transitions (login, signup, verify-email, select-country), so this
// splash feels like a continuation of that flow, not a different toolkit.
const SPRING = { type: "spring" as const, stiffness: 300, damping: 24 };

const WORD_STAGGER_MS = 200;
const WORD_ENTER_MS = 500;
const HOLD_AFTER_WORDS_MS = 1000;
const WORDS_EXIT_MS = 350;
const LOGO_ENTER_MS = 500;
const LOGO_HOLD_MS = 1250;

// Time at which the last word has visually settled, so the reader gets a
// beat with all three in place before they fade.
const WORDS_SETTLE_MS = WORD_STAGGER_MS * (WORDS.length - 1) + WORD_ENTER_MS;
// Time at which the words start fading out together.
const PHASE_CHANGE_MS = WORDS_SETTLE_MS + HOLD_AFTER_WORDS_MS;
// Total sequence length, first word to handoff. Tuned to the 4-second
// budget so every part is fully readable without feeling like a stuck
// loading screen.
const NAVIGATE_AT_MS =
  PHASE_CHANGE_MS + WORDS_EXIT_MS + LOGO_ENTER_MS + LOGO_HOLD_MS;

// Reduced-motion viewers get a brief static brand moment instead of the
// full sequence: this is decorative, not functional, so it can be
// shortened rather than transformed into an equivalent motion-free
// animation.
const REDUCED_MOTION_HOLD_MS = 500;

interface SplashSequenceProps {
  /** Called once the sequence has finished; the caller decides what happens next (e.g. navigate to /home). */
  onComplete: () => void;
}

export function SplashSequence({ onComplete }: SplashSequenceProps) {
  const [phase, setPhase] = useState<"words" | "logo">("words");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      const timer = setTimeout(onComplete, REDUCED_MOTION_HOLD_MS);
      return () => clearTimeout(timer);
    }

    const toLogo = setTimeout(() => setPhase("logo"), PHASE_CHANGE_MS);
    const toHome = setTimeout(onComplete, NAVIGATE_AT_MS);
    return () => {
      clearTimeout(toLogo);
      clearTimeout(toHome);
    };
  }, [reduceMotion, onComplete]);

  if (reduceMotion) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <Image
          src="/veyro_logos/veyro-mark.png"
          alt="Veyro"
          width={160}
          height={160}
          className="h-24 w-24"
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white">
      <AnimatePresence mode="wait">
        {phase === "words" ? (
          <motion.div
            key="words"
            className="flex flex-col items-center gap-2 sm:gap-3"
            exit={{ opacity: 0 }}
            transition={{ duration: WORDS_EXIT_MS / 1000 }}
          >
            {WORDS.map((word, index) => (
              <motion.span
                key={word.text}
                initial={{ opacity: 0, x: word.from.x, y: word.from.y }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{
                  ...SPRING,
                  delay: (index * WORD_STAGGER_MS) / 1000,
                }}
                className="font-heading text-ink text-5xl font-medium tracking-tight sm:text-6xl md:text-7xl"
              >
                {word.text}
              </motion.span>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="logo"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={SPRING}
          >
            <Image
              src="/veyro_logos/veyro-mark.png"
              alt="Veyro"
              width={160}
              height={160}
              className="h-28 w-28 sm:h-36 sm:w-36 md:h-40 md:w-40"
              priority
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
