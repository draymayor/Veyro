import { EnvelopeIcon, FlagIcon } from "@heroicons/react/24/solid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";
import { DisplayCurrencyRow } from "@/components/settings/display-currency-row";

interface AccountSectionProps {
  email: string;
  countryName: string;
  homeCurrency: string;
}

/**
 * Email and country are read directly from real signup data (passed in by
 * the page), never placeholders. Country is shown as genuinely locked,
 * with a calm explanation rather than just a disabled-looking field, per
 * docs/product-rules.md rule 13: country is set once at signup and
 * determines the user's wallet currency, so changing it later would mean
 * changing the currency their existing balance and trade history are
 * denominated in.
 */
export function AccountSection({
  email,
  countryName,
  homeCurrency,
}: AccountSectionProps) {
  return (
    <SettingsSection title="Account">
      <SettingsRow
        icon={EnvelopeIcon}
        label="Email"
        right={<span className="text-ink/60 text-sm">{email}</span>}
      />
      <SettingsRow
        icon={FlagIcon}
        label="Country"
        right={<span className="text-ink/60 text-sm">{countryName}</span>}
      />
      <DisplayCurrencyRow homeCurrency={homeCurrency} />
    </SettingsSection>
  );
}
