"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { ArrowUpRight } from "lucide-react";
import { AssetIcon } from "@/components/crypto/asset-icon";
import { CRYPTO_ASSETS } from "@/lib/crypto/data";

interface CryptoAssetListProps {
  /** Route prefix each asset links to, e.g. "/sell/crypto" or "/deposit/crypto". */
  basePath: string;
}

/**
 * List + search for picking a crypto asset. Shared by the Sell Crypto
 * flow's asset picker (Screen 1) and the Deposit Crypto quick-access flow,
 * since both start with "pick an asset" and differ only in where the row
 * links to. Mirrors GiftCardBrandList's inline search pattern and List/Row
 * Styling rule (docs/design-principles.md): flat rows, no shadow, no
 * dividing lines, generous vertical padding instead of a boxed card.
 */
export function CryptoAssetList({ basePath }: CryptoAssetListProps) {
  const [query, setQuery] = useState("");

  const visibleAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CRYPTO_ASSETS;
    return CRYPTO_ASSETS.filter(
      (asset) =>
        asset.name.toLowerCase().includes(q) ||
        asset.symbol.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-6">
      <label className="border-border bg-card focus-within:ring-ring/40 flex h-11 items-center gap-2 rounded-full border px-4 transition-shadow focus-within:ring-3">
        <MagnifyingGlassIcon
          className="text-ink/35 size-4 shrink-0"
          aria-hidden="true"
        />
        <span className="sr-only">Search assets</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets..."
          className="text-ink placeholder:text-ink/35 w-full bg-transparent text-sm outline-none"
        />
      </label>

      {visibleAssets.length > 0 ? (
        <div className="flex flex-col">
          {visibleAssets.map((asset) => (
            <Link
              key={asset.id}
              href={`${basePath}/${asset.id}`}
              className="hover:bg-secondary/50 flex items-center gap-4 rounded-2xl px-4 py-5 transition-colors sm:px-5"
            >
              <span className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-full p-2">
                <AssetIcon iconKey={asset.iconKey} className="size-full" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-ink font-heading block text-sm font-medium sm:text-base">
                  {asset.name}
                </span>
                <span className="text-ink/45 block text-xs tracking-wide uppercase">
                  {asset.symbol}
                </span>
              </span>
              <ArrowUpRight
                className="text-ink/30 size-4 shrink-0"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      ) : (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No assets match &quot;{query}&quot;. Try a different symbol or name.
        </p>
      )}
    </div>
  );
}
