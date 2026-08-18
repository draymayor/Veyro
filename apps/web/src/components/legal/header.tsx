"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LegalHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-500 ease-out",
        mounted ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
        {eyebrow}
      </span>
      <h1 className="font-heading text-ink mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="text-ink/70 mt-4 max-w-2xl text-base leading-relaxed text-pretty">
        {intro}
      </p>
    </div>
  );
}
