import { adminFetch } from "@/lib/admin/admin-fetch";
import type {
  AdminGiftCardBrand,
  AdminGiftCardRate,
  AdminCryptoAsset,
  AdminPlatformSetting,
} from "@/lib/admin/rates/types";
import { GiftCardRatesSection } from "@/components/admin/rates/gift-card-rates-section";
import { CryptoMarginSection } from "@/components/admin/rates/crypto-margin-section";
import { PlatformSettingsSection } from "@/components/admin/rates/platform-settings-section";
import {
  CryptoSigningModeToggle,
  type CryptoWithdrawalSigningMode,
} from "@/components/admin/rates/crypto-signing-mode-toggle";

interface SigningModeSettings {
  signingMode: CryptoWithdrawalSigningMode;
}

// Rate Management (docs/admin-guide.md): three sections stacked on one
// page rather than tabs, so an admin scanning for one specific rate can
// just Ctrl+F/scroll instead of losing the other two sections' state.
// Every section is backed by real GET /admin/rates/* queries; adminFetch
// returns null on a request failure, rendered as its own empty state per
// section rather than one page-wide error.
export default async function AdminRatesPage() {
  const [brands, rates, cryptoAssets, settings, signingModeSettings] =
    await Promise.all([
      adminFetch<AdminGiftCardBrand[]>("/admin/rates/gift-card-brands"),
      adminFetch<AdminGiftCardRate[]>("/admin/rates/gift-cards"),
      adminFetch<AdminCryptoAsset[]>("/admin/rates/crypto"),
      adminFetch<AdminPlatformSetting[]>("/admin/rates/settings"),
      adminFetch<SigningModeSettings>("/admin/rates/crypto-signing-mode"),
    ]);

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
        Rate Management
      </h1>

      {rates === null || brands === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load gift card rates. Try refreshing the page.
        </p>
      ) : (
        <GiftCardRatesSection rates={rates} brands={brands} />
      )}

      {cryptoAssets === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load crypto assets. Try refreshing the page.
        </p>
      ) : (
        <CryptoMarginSection assets={cryptoAssets} />
      )}

      {settings === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load platform settings. Try refreshing the page.
        </p>
      ) : (
        <PlatformSettingsSection settings={settings} />
      )}

      <CryptoSigningModeToggle
        initialSigningMode={signingModeSettings?.signingMode ?? "manual"}
      />
    </div>
  );
}
