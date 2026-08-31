"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightStartOnRectangleIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/solid";
import { createClient } from "@/lib/supabase/client";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";

/**
 * Subdued, not alarming, per docs/design-principles.md: no red banner or
 * warning iconography, just the last section on the page. Closing an
 * account isn't a one-tap action here: with trade and financial history
 * attached, it needs admin review (docs/product-rules.md's manual-review
 * posture), so this routes to Support rather than deleting anything
 * itself.
 */
export function DangerZone() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogOut() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <SettingsSection title="Account Actions">
      <SettingsRow
        icon={ArrowRightStartOnRectangleIcon}
        label={loggingOut ? "Logging Out..." : "Log Out"}
        onClick={handleLogOut}
        disabled={loggingOut}
      />
      <SettingsRow
        icon={ChatBubbleLeftRightIcon}
        label="Close Account"
        description="Reach out to Support. Accounts with trade or financial history need a quick review before closing."
        onClick={() => router.push("/support")}
      />
    </SettingsSection>
  );
}
