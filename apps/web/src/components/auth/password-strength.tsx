"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

const STRENGTH_LABELS = ["Empty", "Weak", "Fair", "Good", "Strong"];

function getRequirements(password: string): Requirement[] {
  return [
    { label: "8 characters or more", met: password.length >= 8 },
    {
      label: "Upper and lower case",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    { label: "A number", met: /\d/.test(password) },
    { label: "A symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getBarClass(score: number, index: number) {
  const filled = index < score;
  if (!filled) return "bg-neutral-200";
  if (score === 1) return "bg-destructive";
  if (score === 4) return "bg-success";
  return "bg-primary";
}

function getLabelClass(score: number) {
  if (score === 0) return "text-neutral-400";
  if (score === 1) return "text-destructive";
  if (score === 4) return "text-success";
  return "text-ink";
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const requirements = useMemo(() => getRequirements(password), [password]);
  const score = requirements.filter((r) => r.met).length;
  const label = password.length === 0 ? STRENGTH_LABELS[0] : STRENGTH_LABELS[score];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {requirements.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-200",
                getBarClass(password.length === 0 ? 0 : score, i),
              )}
            />
          ))}
        </div>
        <p
          className={cn(
            "text-xs font-medium transition-colors duration-200",
            getLabelClass(password.length === 0 ? 0 : score),
          )}
        >
          {label}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {requirements.map((req) => (
          <li key={req.label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
                req.met
                  ? "bg-success border-success"
                  : "border-neutral-300 bg-transparent",
              )}
            >
              {req.met && (
                <Check className="size-2.5 text-white" strokeWidth={3} />
              )}
            </span>
            <span
              className={cn(
                "text-xs transition-colors duration-200",
                req.met ? "text-ink" : "text-neutral-400",
              )}
            >
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
