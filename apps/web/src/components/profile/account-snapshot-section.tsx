import { CalendarIcon, FlagIcon } from "@heroicons/react/24/solid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";
import { formatRelativeTime } from "@/lib/format-relative-time";

interface AccountSnapshotSectionProps {
  createdAt: string;
  countryName: string;
}

/**
 * Read-only quick reference, not editable here. Country carries the same
 * "locked at signup" explanation as Settings' AccountSection, per
 * docs/product-rules.md rule 13, since it determines the user's wallet
 * currency.
 */
export function AccountSnapshotSection({
  createdAt,
  countryName,
}: AccountSnapshotSectionProps) {
  return (
    <SettingsSection title="Account snapshot">
      <SettingsRow
        icon={CalendarIcon}
        label="Member since"
        right={
          <span className="text-ink/60 text-sm">
            {formatRelativeTime(createdAt)}
          </span>
        }
      />
      <SettingsRow
        icon={FlagIcon}
        label="Country"
        right={<span className="text-ink/60 text-sm">{countryName}</span>}
      />
    </SettingsSection>
  );
}
