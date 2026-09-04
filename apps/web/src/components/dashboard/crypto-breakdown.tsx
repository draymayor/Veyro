"use client";

import { AssetIcon } from "@/components/crypto/asset-icon";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { assetBySymbol } from "@/lib/crypto/data";
import { useBalanceVisibility } from "@/lib/dashboard/use-balance-visibility";

const HIDDEN_AMOUNT_PLACEHOLDER = "******";

export interface CryptoWalletBalance {
  symbol: string;
  balance: number;
}

export interface CryptoIncomingDeposit {
  symbol: string;
  amount: number;
}

interface CryptoBreakdownProps {
  balances: CryptoWalletBalance[];
  incoming?: CryptoIncomingDeposit[];
}

function formatCryptoAmount(amount: number): string {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 8 });
}

/**
 * "Your Crypto" section on the Assets page, shown below the fiat "Your
 * Assets" section (docs/context.md: "Assets page crypto section shows REAL
 * held balances from crypto_wallets per symbol, not a historical rollup").
 * One row per symbol with a nonzero balance OR an incoming (detected but
 * not yet credited) deposit - a symbol with only an incoming deposit and
 * no held balance yet still needs a row, so the user can see it's on the
 * way. The "Incoming" badge is a separate, clearly-labeled figure next to
 * the real spendable balance - it can't be acted on (sold/withdrawn) until
 * the confirmation-depth poller actually credits it. Renders nothing when
 * the user holds no crypto and has nothing incoming, rather than an empty
 * section header.
 */
export function CryptoBreakdown({
  balances,
  incoming = [],
}: CryptoBreakdownProps) {
  const [hidden] = useBalanceVisibility();

  const incomingBySymbol = new Map(
    incoming.map(({ symbol, amount }) => [symbol, amount]),
  );
  const symbols = new Set([
    ...balances.map((b) => b.symbol),
    ...incoming.map((i) => i.symbol),
  ]);
  const balanceBySymbol = new Map(
    balances.map(({ symbol, balance }) => [symbol, balance]),
  );

  if (symbols.size === 0) return null;

  return (
    <section>
      <h2 className="text-ink font-heading mb-2 text-base font-medium">
        Your Crypto
      </h2>
      <div className="flex flex-col">
        {Array.from(symbols)
          .sort()
          .map((symbol) => {
            const asset = assetBySymbol(symbol);
            const balance = balanceBySymbol.get(symbol) ?? 0;
            const incomingAmount = incomingBySymbol.get(symbol);
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
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-ink text-sm font-medium tabular-nums">
                    {hidden
                      ? HIDDEN_AMOUNT_PLACEHOLDER
                      : `${formatCryptoAmount(balance)} ${symbol}`}
                  </span>
                  {incomingAmount ? (
                    <StatusBadge
                      tone="neutral"
                      label={
                        hidden
                          ? `Incoming ${HIDDEN_AMOUNT_PLACEHOLDER}`
                          : `Incoming ${formatCryptoAmount(incomingAmount)} ${symbol}`
                      }
                    />
                  ) : null}
                </span>
              </div>
            );
          })}
      </div>
    </section>
  );
}
