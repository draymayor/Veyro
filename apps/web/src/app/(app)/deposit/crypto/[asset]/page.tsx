import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { DepositAddress } from "@/components/sell/crypto/deposit-address";
import { assetById } from "@/lib/crypto/data";

interface PageProps {
  params: Promise<{ asset: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { asset: assetId } = await params;
  const asset = assetById(assetId);
  return { title: asset ? `Deposit ${asset.name}` : "Deposit Crypto" };
}

// Deposit Crypto (docs/context.md): the quick-access "get my address"
// utility, distinct from the Sell Crypto flow. No amount entry, no rate
// lock, no proof-of-deposit step, just the address and QR code. Reuses the
// same DepositAddress component the Sell Crypto deposit screen uses, since
// the address/QR/network-switch/share UI is identical - DepositAddress
// itself fetches the signed-in user's real address from
// GET /crypto-addresses/:symbol/:network.
export default async function DepositCryptoAssetPage({ params }: PageProps) {
  const { asset: assetId } = await params;
  const asset = assetById(assetId);
  if (!asset) notFound();

  return (
    <>
      <InnerPageHeader
        title={`Deposit ${asset.name}`}
        backHref="/deposit/crypto"
      />
      <main className="mx-auto max-w-md px-4 pt-4 pb-16 sm:px-6">
        <DepositAddress
          assetIconKey={asset.iconKey}
          assetSymbol={asset.symbol}
          networks={asset.networks}
          initialNetworkId={asset.networks[0].id}
        />
      </main>
    </>
  );
}
