import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import type { AdminNetworkAvailability } from "@/lib/admin/dashboard-metrics";

interface ProviderHealthPanelProps {
  rows: AdminNetworkAvailability[];
}

function formatReason(reason: string | null): string {
  if (!reason) return "";
  return reason.replace(/_/g, " ");
}

function formatTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Real-time capacity/rate-limit safety mechanism (docs/planning-history.md,
 * 2026-09-07): every network+provider pair the automation has ever recorded
 * a result for, sourced from network_availability via GET /admin/dashboard.
 * Numbers here are Veyro's own request-outcome tracking, not a mirror of
 * the provider's own usage counter - none of Tatum/Alchemy/Blockchair/
 * TronGrid expose a live "X used of Y" endpoint (confirmed against each's
 * own docs/dashboard). A row only shows once a real call has been recorded
 * for it - an empty panel means nothing has tripped yet, not that nothing
 * is being watched.
 */
export function ProviderHealthPanel({ rows }: ProviderHealthPanelProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-card border-border rounded-2xl border p-4 sm:p-5">
        <h2 className="font-heading text-ink text-base font-semibold">
          Detection capacity
        </h2>
        <p className="text-ink/40 mt-3 text-sm">
          No provider calls recorded yet.
        </p>
      </div>
    );
  }

  const unavailableCount = rows.filter(
    (r) => r.status === "unavailable",
  ).length;

  return (
    <div className="bg-card border-border rounded-2xl border p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-ink text-base font-semibold">
          Detection capacity
        </h2>
        {unavailableCount > 0 ? (
          <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
            {unavailableCount}
          </span>
        ) : null}
      </div>
      <p className="text-ink/40 mt-1 text-[11px] leading-snug">
        Self-tracked call outcomes per provider/network - no provider here
        exposes a live usage endpoint. An unavailable network is hidden as a
        deposit option until it recovers automatically.
      </p>
      <div className="mt-3 flex flex-col">
        {rows.map((row) => {
          const isDown = row.status === "unavailable";
          const timestamp = isDown
            ? formatTimestamp(row.disabledAt)
            : formatTimestamp(row.lastSuccessAt);
          const recoveryEstimate = isDown
            ? formatTimestamp(row.autoRecoveryAt)
            : null;

          return (
            <div
              key={`${row.provider}/${row.networkCode}`}
              className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5"
            >
              <span
                className={
                  isDown
                    ? "bg-error/10 text-error flex size-8 shrink-0 items-center justify-center rounded-full"
                    : "bg-success/10 text-success flex size-8 shrink-0 items-center justify-center rounded-full"
                }
              >
                {isDown ? (
                  <ExclamationTriangleIcon
                    className="size-4"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircleIcon className="size-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-ink truncate text-sm font-medium">
                  {row.networkCode}{" "}
                  <span className="text-ink/40 font-normal">
                    via {row.provider}
                  </span>
                </p>
                <p className="text-ink/40 truncate text-[11px]">
                  {isDown
                    ? `Unavailable (${formatReason(row.reason)})${timestamp ? ` since ${timestamp}` : ""}${recoveryEstimate ? ` - next check ~${recoveryEstimate}` : ""}`
                    : timestamp
                      ? `Available - last confirmed ${timestamp}`
                      : "Available"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
