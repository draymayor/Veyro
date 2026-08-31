"use client";

import { AssetIcon } from "@/components/crypto/asset-icon";
import { assetBySymbol } from "@/lib/crypto/data";
import { useBalanceVisibility } from "@/lib/dashboard/use-balance-visibility";

const HIDDEN_AMOUNT_PLACEHOLDER = "******";

export interface CryptoWalletBalance {
  symbol: string;
  balance: number;
}

interface CryptoBreakdownProps {
  balances: CryptoWalletBalance[];
}

function formatCryptoAmount(amount: number): string {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

/**
 * "Your Crypto" section on the Assets page, shown below the fiat "Your
 * Assets" section (docs/context.md: "Assets page crypto section shows REAL
 * held balances from crypto_wallets per symbol, not a historical rollup").
 * One row per symbol with a nonzero balance - these are genuinely
 * spendable/withdrawable/sellable, same as the fiat row above, just a
 * different asset. Renders nothing when the user holds no crypto, rather
 * than an empty section header.
 */
export function CryptoBreakdown({ balances }: CryptoBreakdownProps) {
  const [hidden] = useBalanceVisibility();

  if (balances.length === 0) return null;

  return (
    <section>
      <h2 className="text-ink font-heading mb-2 text-base font-medium">
        Your Crypto
      </h2>
      <div className="flex flex-col">
        {balances.map(({ symbol, balance }) => {
          const asset = assetBySymbol(symbol);
          return (
            <div
              key={symbol}
              className="flex items-center gap-4 rounded-2xl px-1 py-4 sm:px-2"
            >
              <span className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-full p-2">
                {asset ? (
                  <AssetIcon iconKey={asset.iconKey} className="size-full" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-ink block text-sm font-medium">
                  {asset?.name ?? symbol}
                </span>
                <span className="text-ink/45 block text-xs">{symbol}</span>
              </span>
              <span className="text-ink shrink-0 text-sm font-medium tabular-nums">
                {hidden
                  ? HIDDEN_AMOUNT_PLACEHOLDER
                  : `${formatCryptoAmount(balance)} ${symbol}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
