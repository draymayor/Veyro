import { UserIcon, EnvelopeIcon, TicketIcon } from "@heroicons/react/24/solid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";
import { CopyButton } from "@/components/dashboard/copy-button";
import { SITE_URL } from "@/lib/seo/public-pages";

interface ProfileInfoSectionProps {
  fullName: string | null;
  email: string;
  referralCode: string | null;
}

/**
 * Name is shown read-only on purpose: docs/database-schema.md has no name
 * column on `users`, only `user_metadata.full_name`, set once at signup
 * (Google OAuth's own name claim, or the signup form) with no update path
 * wired anywhere in the app today. Editing it here would mean inventing a
 * persistence mechanism that doesn't exist in the schema, so this flags
 * the gap in the description instead.
 */
export function ProfileInfoSection({
  fullName,
  email,
  referralCode,
}: ProfileInfoSectionProps) {
  // Same `${SITE_URL}/signup?ref=${code}` link and CopyButton used by
  // ReferralHeroCard and ReferralTeaserCard on the Referrals/Leaderboard
  // pages, so the copy interaction here matches exactly rather than
  // rebuilding it.
  const referralLink = referralCode
    ? `${SITE_URL}/signup?ref=${referralCode}`
    : null;

  return (
    <SettingsSection title="Profile info">
      <SettingsRow
        icon={UserIcon}
        label="Name"
        description="Not editable yet: there's no name field on your account record to save changes to."
        right={
          <span className="text-ink/60 text-sm">{fullName ?? "Not set"}</span>
        }
      />
      <SettingsRow
        icon={EnvelopeIcon}
        label="Email"
        right={<span className="text-ink/60 text-sm">{email}</span>}
      />
      {referralLink ? (
        <SettingsRow
          icon={TicketIcon}
          label="Referral link"
          right={
            <span className="flex items-center gap-1">
              <span className="text-ink/60 max-w-40 truncate text-sm sm:max-w-56">
                {referralLink}
              </span>
              <CopyButton value={referralLink} label="Copy referral link" />
            </span>
          }
        />
      ) : null}
    </SettingsSection>
  );
}
