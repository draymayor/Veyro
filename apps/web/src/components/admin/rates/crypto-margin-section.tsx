"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";
import type { AdminCryptoAsset } from "@/lib/admin/rates/types";

const INPUT_CLASS =
  "border-border bg-card text-ink h-9 w-24 rounded-lg border px-2 text-sm outline-none focus-visible:border-ring";
const FORM_INPUT_CLASS =
  "border-border bg-card text-ink h-9 w-full min-w-0 rounded-lg border px-2 text-sm outline-none focus-visible:border-ring";

function formatUsd(value: number | null): string {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

/**
 * Crypto Margin (docs/admin-guide.md's Rate Management section): admin
 * edits crypto_assets.margin_percentage per asset/network, with the live
 * CoinGecko price shown alongside so admin isn't setting a margin blind.
 * The payout formula (docs/database-schema.md) is (live price * (1 -
 * margin/100)) * FX rate, computed fresh at quote/trade time - editing the
 * margin here never touches an already-submitted trade's locked rate_value.
 */
export function CryptoMarginSection({
  assets,
}: {
  assets: AdminCryptoAsset[];
}) {
  const [addingOpen, setAddingOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-ink text-base font-semibold">
            Crypto Margin
          </h2>
          <p className="text-ink/50 text-xs">
            Payout = live price x (1 - margin%), converted to the user&apos;s
            wallet currency at trade time. Live price is shown for context only.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddingOpen((v) => !v)}>
          {addingOpen ? "Cancel" : "Add asset"}
        </Button>
      </div>

      {addingOpen && <AddAssetForm onDone={() => setAddingOpen(false)} />}

      {assets.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No crypto assets configured.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-border text-ink/45 border-b text-xs font-medium">
                <th className="px-3 py-2 font-medium">Asset</th>
                <th className="px-3 py-2 font-medium">Network</th>
                <th className="px-3 py-2 font-medium">Deposit address</th>
                <th className="px-3 py-2 font-medium">Live price (USD)</th>
                <th className="px-3 py-2 font-medium">Margin %</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <AssetRow key={asset.id} asset={asset} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AssetRow({ asset }: { asset: AdminCryptoAsset }) {
  const router = useRouter();
  const [margin, setMargin] = useState(String(asset.margin_percentage));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = margin !== String(asset.margin_percentage);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await authFetch(`/admin/rates/crypto/${asset.id}`, {
        method: "PATCH",
        body: JSON.stringify({ marginPercentage: Number(margin) }),
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this margin.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-border/60 border-b last:border-0">
      <td className="text-ink px-3 py-2 font-medium">{asset.symbol}</td>
      <td className="text-ink/70 px-3 py-2">{asset.network}</td>
      <td
        className="text-ink/70 max-w-[180px] truncate px-3 py-2 font-mono text-xs"
        title={asset.deposit_address}
      >
        {asset.deposit_address}
      </td>
      <td className="text-ink/70 px-3 py-2 tabular-nums">
        {formatUsd(asset.live_price_usd)}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.1"
            min="0"
            max="99"
            className={INPUT_CLASS}
            value={margin}
            onChange={(e) => setMargin(e.target.value)}
          />
          <span className="text-ink/50 text-xs">%</span>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col items-end gap-1">
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving..." : "Save"}
          </Button>
          {error ? <p className="text-error text-xs">{error}</p> : null}
        </div>
      </td>
    </tr>
  );
}

// Deposit address is genuinely required and never defaulted or
// pre-filled here, admin must enter the real published address for this
// asset/network before it goes live, there is no placeholder value.
function AddAssetForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [network, setNetwork] = useState("");
  const [depositAddress, setDepositAddress] = useState("");
  const [margin, setMargin] = useState("3.0");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol.trim()) {
      setError("Enter a symbol, e.g. USDT.");
      return;
    }
    if (!network.trim()) {
      setError("Enter a network, e.g. TRC20.");
      return;
    }
    if (!depositAddress.trim()) {
      setError("Enter the real deposit address for this asset and network.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await authFetch("/admin/rates/crypto", {
        method: "POST",
        body: JSON.stringify({
          symbol: symbol.trim(),
          network: network.trim(),
          depositAddress: depositAddress.trim(),
          marginPercentage: Number(margin),
          isActive,
        }),
      });
      onDone();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create this asset.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-card grid grid-cols-1 gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <label className="flex flex-col gap-1 text-xs font-medium">
        Symbol
        <input
          className={FORM_INPUT_CLASS}
          placeholder="e.g. USDT"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Network
        <input
          className={FORM_INPUT_CLASS}
          placeholder="e.g. TRC20"
          value={network}
          onChange={(e) => setNetwork(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium lg:col-span-2">
        Deposit address
        <input
          className={FORM_INPUT_CLASS}
          placeholder="Real published address, no placeholder"
          value={depositAddress}
          onChange={(e) => setDepositAddress(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Margin %
        <input
          type="number"
          step="0.1"
          min="0"
          max="99"
          className={FORM_INPUT_CLASS}
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Active
      </label>
      <div className="flex items-end gap-2 lg:col-span-5">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Adding..." : "Add asset"}
        </Button>
      </div>
      {error ? (
        <p className="text-error col-span-full text-xs">{error}</p>
      ) : null}
    </form>
  );
}
