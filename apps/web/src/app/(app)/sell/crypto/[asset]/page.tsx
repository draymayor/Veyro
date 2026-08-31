import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { CryptoAmountForm } from "@/components/sell/crypto/amount-form";
import { createClient } from "@/lib/supabase/server";
import { findCountry } from "@/lib/countries";
import { assetById } from "@/lib/crypto/data";
import { getCryptoWalletBalance } from "@/lib/dashboard/get-crypto-wallet-balance";

interface PageProps {
  params: Promise<{ asset: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { asset: assetId } = await params;
  const asset = assetById(assetId);
  return { title: asset ? `Sell ${asset.name}` : "Sell Crypto" };
}

export default async function CryptoAssetAmountPage({ params }: PageProps) {
  const { asset: assetId } = await params;
  const asset = assetById(assetId);
  if (!asset) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("country, currency")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  // AppLayout already redirects unauthenticated/incomplete profiles before
  // this page renders, so profile.currency should always be set. The
  // country-derived fallback only guards against that assumption drifting.
  // This is the user's actual wallet currency (docs/product-rules.md rule
  // 13), never the display-only preference used on public pages.
  const walletCurrency =
    profile?.currency ?? findCountry(profile?.country ?? "")?.currency ?? "USD";

  const availableBalance = user
    ? await getCryptoWalletBalance(supabase, user.id, asset.symbol)
    : 0;

  return (
    <>
      <InnerPageHeader title={`Sell ${asset.name}`} backHref="/sell/crypto" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <CryptoAmountForm
          asset={asset}
          walletCurrency={walletCurrency}
          availableBalance={availableBalance}
        />
      </main>
    </>
  );
}
