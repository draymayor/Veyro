"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";
import {
  labelForSettingKey,
  settingValueKind,
  SETTINGS_WITH_DEDICATED_UI,
} from "@/lib/admin/rates/types";
import type { AdminPlatformSetting } from "@/lib/admin/rates/types";
import { ToggleSwitch } from "@/components/settings/toggle-switch";

const INPUT_CLASS =
  "border-border bg-card text-ink h-9 w-full min-w-0 rounded-lg border px-2 text-sm outline-none focus-visible:border-ring";

/**
 * Platform Settings (docs/admin-guide.md's Rate Management section): a
 * simple key/value editor over whatever rows actually exist in
 * platform_settings (referral_bonus_usd, and anything a future migration
 * adds), never a hardcoded field list - listPlatformSettings() on the API
 * side reads the table directly, so a new key shows up here with no code
 * change. A key already given a dedicated, purpose-built control
 * elsewhere in the admin UI (SETTINGS_WITH_DEDICATED_UI, currently
 * crypto_withdrawal_requires_approval on the Withdrawals page) is left
 * out of this generic table entirely, so a given setting is never
 * editable from two different controls at once.
 */
export function PlatformSettingsSection({
  settings,
}: {
  settings: AdminPlatformSetting[];
}) {
  const [addingOpen, setAddingOpen] = useState(false);

  const dedicatedElsewhere = settings.filter(
    (s) => s.key in SETTINGS_WITH_DEDICATED_UI,
  );
  const genericSettings = settings.filter(
    (s) => !(s.key in SETTINGS_WITH_DEDICATED_UI),
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-ink text-base font-semibold">
            Platform Settings
          </h2>
          <p className="text-ink/50 text-xs">
            General admin-tunable key/value settings, read live from the table,
            not a fixed list.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddingOpen((v) => !v)}>
          {addingOpen ? "Cancel" : "Add setting"}
        </Button>
      </div>

      {addingOpen && <AddSettingForm onDone={() => setAddingOpen(false)} />}

      {dedicatedElsewhere.length > 0 ? (
        <p className="text-ink/40 text-xs">
          {dedicatedElsewhere
            .map(
              (s) =>
                `${labelForSettingKey(s.key)} is managed from ${SETTINGS_WITH_DEDICATED_UI[s.key]}`,
            )
            .join(", ")}
          , not listed below to avoid a second control for the same setting.
        </p>
      ) : null}

      {genericSettings.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No platform settings yet.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-border text-ink/45 border-b text-xs font-medium">
                <th className="px-3 py-2 font-medium">Setting</th>
                <th className="px-3 py-2 font-medium">Value</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {genericSettings.map((setting) => (
                <SettingRow key={setting.key} setting={setting} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SettingRow({ setting }: { setting: AdminPlatformSetting }) {
  const router = useRouter();
  const [value, setValue] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== setting.value;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await authFetch("/admin/rates/settings", {
        method: "POST",
        body: JSON.stringify({ key: setting.key, value }),
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save this setting.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-border/60 border-b last:border-0">
      <td className="px-3 py-2">
        <span className="text-ink block font-medium">
          {labelForSettingKey(setting.key)}
        </span>
        <span className="text-ink/40 block font-mono text-[11px]">
          {setting.key}
        </span>
      </td>
      <td className="px-3 py-2">
        <SettingValueInput
          value={value}
          onChange={setValue}
          label={labelForSettingKey(setting.key)}
        />
      </td>
      <td className="text-ink/50 px-3 py-2 text-xs">
        {new Date(setting.updated_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
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

// Renders the input type that matches what the value actually is, not a
// hardcoded check for one specific key, so any future boolean or numeric
// setting gets the right control automatically. A toggle always writes
// back the literal string "true"/"false", keeping the column's text type
// unchanged, and reuses the exact same ToggleSwitch the consumer Settings
// page's Notifications section renders through, not a separately-styled
// lookalike.
function SettingValueInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const kind = settingValueKind(value);

  if (kind === "boolean") {
    const isTrue = value.trim() === "true";
    return (
      <ToggleSwitch
        checked={isTrue}
        onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        label={label}
      />
    );
  }

  if (kind === "number") {
    return (
      <input
        type="number"
        className={INPUT_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <input
      className={INPUT_CLASS}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function AddSettingForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) {
      setError("Enter a setting key.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await authFetch("/admin/rates/settings", {
        method: "POST",
        body: JSON.stringify({ key: key.trim(), value }),
      });
      onDone();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not add this setting.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-card grid grid-cols-1 gap-3 rounded-2xl border p-4 sm:grid-cols-3"
    >
      <label className="flex flex-col gap-1 text-xs font-medium">
        Key
        <input
          className={INPUT_CLASS}
          placeholder="e.g. referral_bonus_usd"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Value
        <input
          className={INPUT_CLASS}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <div className="flex items-end gap-2">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Adding..." : "Add setting"}
        </Button>
      </div>
      {error ? (
        <p className="text-error col-span-full text-xs">{error}</p>
      ) : null}
    </form>
  );
}
