"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CryptoPriceCard } from "@/components/crypto/crypto-price-card";
import { NetworkSelector } from "@/components/crypto/network-selector";
import { type CryptoAsset } from "@/lib/crypto/data";
import type { CryptoRate } from "@/lib/crypto/use-crypto-rates";
import { useCryptoPayout } from "@/lib/crypto/use-crypto-payout";
import { useDisplayCurrency } from "@/lib/display-currency/context";
import { formatDisplayAmount } from "@/lib/display-currency/format";

interface AssetCardProps {
  asset: CryptoAsset;
  rate: CryptoRate | undefined;
  loading: boolean;
  error: boolean;
}

export function AssetCard({ asset, rate, loading, error }: AssetCardProps) {
  const [networkId, setNetworkId] = useState(asset.networks[0].id);
  const network =
    asset.networks.find((n) => n.id === networkId) ?? asset.networks[0];
  const displayCurrency = useDisplayCurrency();

  // Payout per 1 unit of the asset, Veyro's actual marked-down and
  // FX-converted quote (docs/product-rules.md), not the raw price shown
  // above by CryptoPriceCard.
  const { quote } = useCryptoPayout(
    asset.symbol,
    network.label,
    1,
    displayCurrency,
  );

  return (
    <CryptoPriceCard
      flipId={asset.id}
      iconKey={asset.iconKey}
      name={asset.name}
      symbol={asset.symbol}
      rate={rate}
      loading={loading}
      error={error}
      className="group transition-[border-color,box-shadow] duration-300 ease-out hover:border-white/20 hover:shadow-[0_24px_50px_rgba(0,0,0,0.4)]"
      headerRight={
        <NetworkSelector
          networks={asset.networks}
          value={networkId}
          onChange={setNetworkId}
        />
      }
    >
      <div className="flex items-end justify-between">
        <div>
          <p className="text-background/40 text-[11px] tracking-wide uppercase">
            You&apos;ll receive
          </p>
          <p className="font-heading text-primary text-xl font-semibold tabular-nums">
            {formatDisplayAmount(quote?.payout ?? 0, displayCurrency)}{" "}
            <span className="text-background/40 text-sm font-normal">
              / {asset.symbol}
            </span>
          </p>
        </div>
        <Link
          href={`/sell/crypto/${asset.id}?network=${network.id}`}
          aria-label={`Sell ${asset.symbol} on ${network.fullName}`}
          className="text-background/30 group-hover:text-primary group-hover:border-primary/40 flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 transition-colors duration-300"
        >
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </CryptoPriceCard>
  );
}
