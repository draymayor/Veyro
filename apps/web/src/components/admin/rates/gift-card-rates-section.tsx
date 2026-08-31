"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";
import {
  CARD_TYPE_OPTIONS,
  type AdminGiftCardBrand,
  type AdminGiftCardRate,
} from "@/lib/admin/rates/types";

const INPUT_CLASS =
  "border-border bg-card text-ink h-9 w-full min-w-0 rounded-lg border px-2 text-sm outline-none focus-visible:border-ring";

interface GiftCardRatesSectionProps {
  rates: AdminGiftCardRate[];
  brands: AdminGiftCardBrand[];
}

/**
 * Gift Card Rates (docs/admin-guide.md's Rate Management section): Brand ->
 * Country -> Type -> Denomination Range -> Rate. Every edit here (including
 * toggling is_active) only ever changes what a *new* trade quotes against
 * (TradesService.findRate reads a fresh row at submission time and
 * snapshots the result immediately) - it never touches rate_value on an
 * already-submitted trade, so historical trades keep their locked rate.
 */
export function GiftCardRatesSection({
  rates,
  brands,
}: GiftCardRatesSectionProps) {
  const [addingOpen, setAddingOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-ink text-base font-semibold">
            Gift Card Rates
          </h2>
          <p className="text-ink/50 text-xs">
            Platform Rate, not live market data. Changes only apply to new
            trades; already-submitted trades keep their locked rate.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddingOpen((v) => !v)}>
          {addingOpen ? "Cancel" : "Add rate"}
        </Button>
      </div>

      {addingOpen && (
        <AddRateForm brands={brands} onDone={() => setAddingOpen(false)} />
      )}

      {rates.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No gift card rates yet.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-border text-ink/45 border-b text-xs font-medium">
                <th className="px-3 py-2 font-medium">Brand</th>
                <th className="px-3 py-2 font-medium">Country</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Min</th>
                <th className="px-3 py-2 font-medium">Max</th>
                <th className="px-3 py-2 font-medium">Rate</th>
                <th className="px-3 py-2 font-medium">Currency</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <RateRow key={rate.id} rate={rate} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RateRow({ rate }: { rate: AdminGiftCardRate }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    country: rate.country,
    cardType: rate.card_type,
    minDenomination: String(rate.min_denomination),
    maxDenomination: String(rate.max_denomination),
    rate: String(rate.rate),
    currency: rate.currency,
  });

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await authFetch(`/admin/rates/gift-cards/${rate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          country: form.country,
          cardType: form.cardType,
          minDenomination: Number(form.minDenomination),
          maxDenomination: Number(form.maxDenomination),
          rate: Number(form.rate),
          currency: form.currency,
        }),
      });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this rate.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    setError(null);
    setSaving(true);
    try {
      await authFetch(`/admin/rates/gift-cards/${rate.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !rate.is_active }),
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update this rate.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <tr className="border-border/60 border-b last:border-0">
        <td className="text-ink px-3 py-2 font-medium">{rate.brand_name}</td>
        <td className="text-ink/70 px-3 py-2">{rate.country}</td>
        <td className="text-ink/70 px-3 py-2">{rate.card_type}</td>
        <td className="text-ink/70 px-3 py-2">{rate.min_denomination}</td>
        <td className="text-ink/70 px-3 py-2">{rate.max_denomination}</td>
        <td className="text-ink/70 px-3 py-2">{rate.rate}</td>
        <td className="text-ink/70 px-3 py-2">{rate.currency}</td>
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={toggleActive}
            disabled={saving}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium disabled:opacity-50 ${
              rate.is_active
                ? "bg-success/15 text-success"
                : "bg-secondary text-ink/50"
            }`}
          >
            {rate.is_active ? "Active" : "Inactive"}
          </button>
        </td>
        <td className="px-3 py-2 text-right">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-border/60 border-b align-top last:border-0">
      <td className="text-ink px-3 py-2 font-medium">{rate.brand_name}</td>
      <td className="px-3 py-2">
        <input
          className={INPUT_CLASS}
          value={form.country}
          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
        />
      </td>
      <td className="px-3 py-2">
        <select
          className={INPUT_CLASS}
          value={form.cardType}
          onChange={(e) => setForm((f) => ({ ...f, cardType: e.target.value }))}
        >
          {CARD_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          className={INPUT_CLASS}
          value={form.minDenomination}
          onChange={(e) =>
            setForm((f) => ({ ...f, minDenomination: e.target.value }))
          }
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          className={INPUT_CLASS}
          value={form.maxDenomination}
          onChange={(e) =>
            setForm((f) => ({ ...f, maxDenomination: e.target.value }))
          }
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          className={INPUT_CLASS}
          value={form.rate}
          onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
        />
      </td>
      <td className="px-3 py-2">
        <input
          className={INPUT_CLASS}
          value={form.currency}
          onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
        />
      </td>
      <td className="text-ink/50 px-3 py-2 text-xs">
        {rate.is_active ? "Active" : "Inactive"}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
          {error ? <p className="text-error text-xs">{error}</p> : null}
        </div>
      </td>
    </tr>
  );
}

function AddRateForm({
  brands,
  onDone,
}: {
  brands: AdminGiftCardBrand[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    brandId: brands[0]?.id ?? "",
    country: "",
    cardType: "e-code",
    minDenomination: "",
    maxDenomination: "",
    rate: "",
    currency: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.brandId || !form.country || !form.currency) {
      setError("Fill in brand, country, and currency.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await authFetch("/admin/rates/gift-cards", {
        method: "POST",
        body: JSON.stringify({
          brandId: form.brandId,
          country: form.country,
          cardType: form.cardType,
          minDenomination: Number(form.minDenomination),
          maxDenomination: Number(form.maxDenomination),
          rate: Number(form.rate),
          currency: form.currency,
        }),
      });
      onDone();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create this rate.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-card grid grid-cols-2 gap-3 rounded-2xl border p-4 sm:grid-cols-4"
    >
      <label className="flex flex-col gap-1 text-xs font-medium">
        Brand
        <select
          className={INPUT_CLASS}
          value={form.brandId}
          onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}
        >
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Country
        <input
          className={INPUT_CLASS}
          placeholder="US"
          value={form.country}
          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Type
        <select
          className={INPUT_CLASS}
          value={form.cardType}
          onChange={(e) => setForm((f) => ({ ...f, cardType: e.target.value }))}
        >
          {CARD_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Currency
        <input
          className={INPUT_CLASS}
          placeholder="NGN"
          value={form.currency}
          onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Min denomination
        <input
          type="number"
          className={INPUT_CLASS}
          value={form.minDenomination}
          onChange={(e) =>
            setForm((f) => ({ ...f, minDenomination: e.target.value }))
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Max denomination
        <input
          type="number"
          className={INPUT_CLASS}
          value={form.maxDenomination}
          onChange={(e) =>
            setForm((f) => ({ ...f, maxDenomination: e.target.value }))
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Rate
        <input
          type="number"
          className={INPUT_CLASS}
          value={form.rate}
          onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
        />
      </label>
      <div className="flex items-end gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Adding..." : "Add rate"}
        </Button>
      </div>
      {error ? (
        <p className="text-error col-span-full text-xs">{error}</p>
      ) : null}
    </form>
  );
}
