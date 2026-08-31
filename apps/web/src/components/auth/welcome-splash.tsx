"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { SplashSequence } from "./splash-sequence";

/**
 * Wires the splash animation to navigation. Kept separate from
 * SplashSequence so a later automated-testing bypass (skip straight to
 * onComplete) only has to change this file, not the animation itself.
 */
export function WelcomeSplash() {
  const router = useRouter();

  const handleComplete = useCallback(() => {
    router.replace("/home");
  }, [router]);

  return <SplashSequence onComplete={handleComplete} />;
}
