"use client";

import Image from "next/image";
import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { lorelei } from "@dicebear/collection";
import { cn } from "@/lib/utils";
import type { AppUser } from "./app-user";

interface UserAvatarProps {
  user: AppUser;
  size?: number;
  className?: string;
}

/**
 * Lorelei is the locked-in default style, not a placeholder. Background
 * and hair sit on Veyro's own palette (warm secondary background,
 * terracotta/ink/muted hair tones) instead of DiceBear's default
 * randomized colors, so a generated avatar reads as "Veyro," not as a
 * generic identicon. Skin tone is left to Lorelei's own diverse default
 * set rather than forced onto brand hex values.
 */
const BACKGROUND_COLOR = ["f0eae1"];
const HAIR_COLOR = ["e8674a", "1c1b29", "6b6875"];

/**
 * Single avatar component used everywhere a user's picture appears
 * (sidebar profile card, mobile top bar, and future spots like Profile).
 * Renders the user's uploaded photo once profileImageUrl is set; until
 * then, generates a deterministic DiceBear avatar from the user's id, so
 * the same user always gets the same avatar and different users get
 * visibly different ones, no backfill needed since it's derived on read.
 */
export function UserAvatar({ user, size = 36, className }: UserAvatarProps) {
  const generatedSrc = useMemo(
    () =>
      createAvatar(lorelei, {
        seed: user.id,
        backgroundColor: BACKGROUND_COLOR,
        hairColor: HAIR_COLOR,
      }).toDataUri(),
    [user.id],
  );

  return (
    <Image
      src={user.profileImageUrl ?? generatedSrc}
      alt=""
      width={size}
      height={size}
      unoptimized={!user.profileImageUrl}
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}
