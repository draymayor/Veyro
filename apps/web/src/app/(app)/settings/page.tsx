import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { findCountry } from "@/lib/countries";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { AccountSection } from "@/components/settings/account-section";
import { SecuritySection } from "@/components/settings/security-section";
import { WithdrawalPinSection } from "@/components/settings/withdrawal-pin-section";
import { PaymentMethodsSection } from "@/components/settings/payment-methods-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { DangerZone } from "@/components/settings/danger-zone";
import { StaggerIn, StaggerItem } from "@/components/dashboard/stagger-in";

export const metadata: Metadata = {
  title: "Settings",
};

// Standalone inner/drill-in page, so it uses InnerPageHeader rather than
// the main-tab TopBar, per design-principles.md's Navigation Chrome
// section. Support and Profile are their own standalone pages (docs/context.md),
// reached via the sidebar/mobile icons directly, not linked from here.
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("country, currency, withdrawal_pin_set_at")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  // AppLayout already redirects unauthenticated/incomplete profiles before
  // this page renders, so these should always resolve.
  const email = user?.email ?? "";
  const country = findCountry(profile?.country ?? "");
  const countryName = country?.name ?? profile?.country ?? "";
  const homeCurrency = profile?.currency ?? country?.currency ?? "USD";
  const provider = user?.app_metadata?.provider ?? "email";

  return (
    <>
      <InnerPageHeader title="Settings" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <StaggerIn className="flex flex-col gap-6">
          <StaggerItem>
            <AccountSection
              email={email}
              countryName={countryName}
              homeCurrency={homeCurrency}
            />
          </StaggerItem>
          <StaggerItem>
            <SecuritySection provider={provider} />
          </StaggerItem>
          <StaggerItem>
            <WithdrawalPinSection
              initialIsSet={!!profile?.withdrawal_pin_set_at}
            />
          </StaggerItem>
          <StaggerItem>
            <PaymentMethodsSection />
          </StaggerItem>
          <StaggerItem>
            <NotificationsSection />
          </StaggerItem>
          <StaggerItem>
            <DangerZone />
          </StaggerItem>
        </StaggerIn>
      </main>
    </>
  );
}
