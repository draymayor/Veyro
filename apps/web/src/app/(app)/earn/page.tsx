import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getEarnStatus } from "@/lib/earn/get-status";
import { EarnOptionsCard } from "@/components/earn/earn-options-card";
import { EarnClaimedCard } from "@/components/earn/earn-claimed-card";
import { StaggerIn, StaggerItem } from "@/components/dashboard/stagger-in";

export const metadata: Metadata = {
  title: "Earn",
};

// Main tab page (Home, Leaderboard, Assets, Earn), so it keeps the
// standard TopBar/BottomNav like the others do, not an InnerPageHeader -
// see nav-items.ts. Real bonus money only ever moves once a claim's
// required_trade_volume_usd is met in real trades, see
// docs/database-schema.md's earn_bonus_claims section.
export default async function EarnPage() {
  const supabase = await createClient();
  const status = await getEarnStatus(supabase);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-3 pb-16 sm:px-6">
      <StaggerIn className="flex flex-col gap-6">
        <StaggerItem>
          <h2 className="font-heading text-ink text-xl font-semibold sm:text-2xl">
            Claim a bonus, unlock it by trading.
          </h2>
        </StaggerItem>

        {status.claim ? (
          <StaggerItem>
            <EarnClaimedCard
              claim={status.claim}
              tradeVolumeUsd={status.tradeVolumeUsd}
            />
          </StaggerItem>
        ) : (
          <>
            <StaggerItem>
              <EarnOptionsCard tiers={status.tiers} alreadyClaimed={false} />
            </StaggerItem>
            <StaggerItem>
              <p className="text-ink/50 text-center text-xs">
                One claim per account. Your bonus unlocks once you sell that
                much in gift cards or crypto on Veyro within 3 days of claiming,
                deposits don&apos;t count.
              </p>
            </StaggerItem>
          </>
        )}
      </StaggerIn>
    </main>
  );
}
