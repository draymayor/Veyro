import type { Metadata } from "next";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { CryptoAssetList } from "@/components/crypto/asset-list";

export const metadata: Metadata = {
  title: "Withdraw Crypto",
};

// Crypto Withdrawal (docs/context.md): its own dedicated route, distinct
// from the bank/PayPal withdrawal flow at /withdraw/request, not a shared
// component with tabs. Asset picker first (this screen), then the
// address/network/amount form per asset at /withdraw/crypto/[asset],
// mirroring Deposit Crypto and Sell Crypto's asset-list pattern.
export default function WithdrawCryptoPage() {
  return (
    <>
      <InnerPageHeader title="Withdraw Crypto" backHref="/home" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <CryptoAssetList basePath="/withdraw/crypto" />
      </main>
    </>
  );
}
