"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "motion/react";

const CONTAINER: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const ITEM: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
  },
};

/**
 * One-time fade/slide-in on mount for dashboard cards, deliberately not the
 * scroll-triggered ScrollReveal used on the public site: this is app chrome,
 * not a landing page, so it should settle quickly and stay out of the way.
 */
export function StaggerIn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={CONTAINER}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={ITEM} className={className}>
      {children}
    </motion.div>
  );
}
