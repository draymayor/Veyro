"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon } from "@heroicons/react/24/solid";
import { createClient } from "@/lib/supabase/client";
import { authFetch } from "@/lib/api-client";
import { UserAvatar } from "@/components/app/user-avatar";
import type { AppUser } from "@/components/app/app-user";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_BYTES = 5 * 1024 * 1024;

interface AvatarSectionProps {
  user: AppUser;
}

/**
 * Uploads always target the same storage path ({user_id}/avatar, no
 * extension) with upsert enabled, so a new photo replaces the previous
 * one in place rather than accumulating orphaned files, per
 * docs/supabase-setup.md's owner-only folder-path policy on the avatars
 * bucket. The DB write (users.profile_image_url) goes through the API
 * rather than a direct client Supabase write, matching the pattern
 * already established for country/currency in UsersController.
 */
export function AvatarSection({ user: initialUser }: AvatarSectionProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState(initialUser);
  const [busy, setBusy] = useState<"uploading" | "removing" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("That photo is too large. Please choose one under 5MB.");
      return;
    }

    setBusy("uploading");
    try {
      const supabase = createClient();
      const path = `${user.id}/avatar`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);

      // The storage path never changes on re-upload (that's what makes it
      // an overwrite instead of an accumulating file), so without a
      // cache-busting query param the browser would keep serving the
      // previous cached bytes at the same URL.
      const freshUrl = `${publicUrl}?v=${Date.now()}`;

      await authFetch("/users/me/avatar", {
        method: "PATCH",
        body: JSON.stringify({ profileImageUrl: freshUrl }),
      });

      setUser((u) => ({ ...u, profileImageUrl: freshUrl }));
      router.refresh();
    } catch {
      setError("Couldn't upload your photo. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove() {
    setError(null);
    setBusy("removing");
    try {
      await authFetch("/users/me/avatar", {
        method: "PATCH",
        body: JSON.stringify({ profileImageUrl: null }),
      });
      setUser((u) => ({ ...u, profileImageUrl: null }));
      router.refresh();
    } catch {
      setError("Couldn't remove your photo. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <UserAvatar user={user} size={96} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          aria-label="Change photo"
          className="bg-primary text-primary-foreground absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full shadow-sm transition-transform active:scale-95 disabled:opacity-60"
        >
          <CameraIcon className="size-4" aria-hidden="true" />
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          void handleFileSelected(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy !== null}
          className="text-primary disabled:opacity-60"
        >
          {busy === "uploading" ? "Uploading..." : "Change photo"}
        </button>
        {user.profileImageUrl ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy !== null}
            className="text-destructive disabled:opacity-60"
          >
            {busy === "removing" ? "Removing..." : "Remove photo"}
          </button>
        ) : null}
      </div>

      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
