import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { findCountry } from "@/lib/countries";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { AvatarSection } from "@/components/profile/avatar-section";
import { ProfileInfoSection } from "@/components/profile/profile-info-section";
import { AccountSnapshotSection } from "@/components/profile/account-snapshot-section";
import { ProfileMoreLinks } from "@/components/profile/profile-more-links";
import { StaggerIn, StaggerItem } from "@/components/dashboard/stagger-in";

export const metadata: Metadata = {
  title: "Profile",
};

// Standalone inner/drill-in page, so it uses InnerPageHeader rather than
// the main-tab TopBar, per design-principles.md's Navigation Chrome
// section.
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("profile_image_url, country, referral_code, created_at")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  // AppLayout already redirects unauthenticated/incomplete profiles before
  // this page renders, so these should always resolve.
  const email = user?.email ?? "";
  const fullName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() || null;
  const country = findCountry(profile?.country ?? "");
  const countryName = country?.name ?? profile?.country ?? "";

  return (
    <>
      <InnerPageHeader title="Profile" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <StaggerIn className="flex flex-col gap-6">
          <StaggerItem>
            <AvatarSection
              user={{
                id: user?.id ?? "",
                email,
                fullName,
                profileImageUrl: profile?.profile_image_url ?? null,
              }}
            />
          </StaggerItem>
          <StaggerItem>
            <ProfileInfoSection
              fullName={fullName}
              email={email}
              referralCode={profile?.referral_code ?? null}
            />
          </StaggerItem>
          <StaggerItem>
            <AccountSnapshotSection
              createdAt={profile?.created_at ?? new Date().toISOString()}
              countryName={countryName}
            />
          </StaggerItem>
          <StaggerItem>
            <ProfileMoreLinks />
          </StaggerItem>
        </StaggerIn>
      </main>
    </>
  );
}
