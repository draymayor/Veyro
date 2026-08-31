import type { Metadata } from "next";
import { InnerPageHeader } from "@/components/app/inner-page-header";
import { CryptoAssetList } from "@/components/crypto/asset-list";

export const metadata: Metadata = {
  title: "Sell Crypto",
};

export default function SellCryptoPage() {
  return (
    <>
      <InnerPageHeader title="Sell Crypto" backHref="/home" />
      <main className="mx-auto max-w-2xl px-4 pt-4 pb-16 sm:px-6">
        <CryptoAssetList basePath="/sell/crypto" />
      </main>
    </>
  );
}
