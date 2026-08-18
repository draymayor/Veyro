"use client";

import { useRef } from "react";

interface OtpInputProps {
  length?: number;
  digits: string[];
  onChange: (digits: string[]) => void;
  disabled?: boolean;
}

export function emptyOtp(length = 6): string[] {
  return Array(length).fill("");
}

/**
 * Shared 6-digit code entry grid used by both /verify-email (signup) and
 * /reset-password, so the OTP interaction (auto-advance, backspace-to-prev,
 * paste-to-fill) and styling stay identical across both flows.
 */
export function OtpInput({ length = 6, digits, onChange, disabled }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    onChange(next);
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    const next = emptyOtp(length);
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    onChange(next);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(e) => handleDigitChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="focus:border-primary focus:ring-primary size-11 rounded-lg border border-neutral-200 bg-white text-center text-lg font-medium text-neutral-900 focus:ring-1 focus:outline-none disabled:opacity-50 sm:size-12"
        />
      ))}
    </div>
  );
}
