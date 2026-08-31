import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminCryptoAsset } from "@/lib/admin/rates/types";
import { ManualDepositForm } from "@/components/admin/deposits/manual-deposit-form";

// Manual Deposit (docs/admin-guide.md): a standalone credit form for
// correcting an issue or crediting a deposit automated detection missed.
// Crypto assets are fetched here (not client-side) so the asset/network
// dropdown is populated on first paint, same as every other admin list
// page.
export default async function AdminManualDepositPage() {
  const cryptoAssets = await adminFetch<AdminCryptoAsset[]>(
    "/admin/rates/crypto",
  );

  return (
    <div className="mx-auto flex max-w-xl min-w-0 flex-col gap-4">
      <div>
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          Manual Deposit
        </h1>
        <p className="text-ink/50 text-sm">
          Credit fiat or crypto directly to a user&apos;s wallet, for correcting
          an issue or crediting a deposit caught outside automated detection.
        </p>
      </div>

      <ManualDepositForm
        cryptoAssets={(cryptoAssets ?? []).filter((asset) => asset.is_active)}
      />
    </div>
  );
}
