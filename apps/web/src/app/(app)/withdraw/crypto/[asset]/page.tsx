import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { CryptoWithdrawForm } from "@/components/withdraw/crypto-withdraw-form";
import { assetById } from "@/lib/crypto/data";
import { createClient } from "@/lib/supabase/server";
import { getCryptoWalletBalance } from "@/lib/dashboard/get-crypto-wallet-balance";

interface PageProps {
  params: Promise<{ asset: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { asset: assetId } = await params;
  const asset = assetById(assetId);
  return { title: asset ? `Withdraw ${asset.name}` : "Withdraw Crypto" };
}

// Crypto Withdrawal (docs/context.md): the form screen, reached after
// picking an asset on /withdraw/crypto. Its own dedicated page, separate
// from the bank/PayPal withdrawal flow at /withdraw/request. Title reflects
// the selected asset, matching the Binance/MEXC "Withdraw" / "Send DOGE"
// reference pattern this was built from (remapped to Veyro's light palette,
// and to the app's existing "Deposit {asset.name}" title convention, not
// the reference images' dark theme or symbol-only titling).
export default async function WithdrawCryptoAssetPage({ params }: PageProps) {
  const { asset: assetId } = await params;
  const asset = assetById(assetId);
  if (!asset) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Real held crypto_wallets balance for this symbol (docs/product-rules.md
  // rules 6a/16) - what's actually available to withdraw, not a
  // fiat-to-crypto conversion.
  const availableBalance = user
    ? await getCryptoWalletBalance(supabase, user.id, asset.symbol)
    : 0;

  return (
    <>
      <InnerPageHeader
        title={`Withdraw ${asset.name}`}
        backHref="/withdraw/crypto"
      />
      <main className="mx-auto max-w-md px-4 pt-4 pb-16 sm:px-6">
        <CryptoWithdrawForm asset={asset} availableBalance={availableBalance} />
      </main>
    </>
  );
}
