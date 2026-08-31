"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog } from "radix-ui";
import {
  ShareIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { AssetIcon, NetworkBadgeIcon } from "@/components/crypto/asset-icon";
import { CopyButton } from "@/components/dashboard/copy-button";
import { Button } from "@/components/ui/button";
import type { CryptoNetwork, TokenIconKey } from "@/lib/crypto/data";
import { useDepositAddress } from "@/lib/crypto/use-deposit-address";
import { cn } from "@/lib/utils";

interface DepositAddressProps {
  assetIconKey: TokenIconKey;
  assetSymbol: string;
  networks: CryptoNetwork[];
  initialNetworkId: string;
}

/**
 * Screen 3 of the crypto sell flow: the deposit address itself. No block
 * confirmation counts, no arrival time estimates, no minimum deposit
 * figures (docs/product-rules.md rule 16 and the flow spec), since Veyro
 * controls this address directly and V1 confirmation is fully manual, not
 * automated on-chain monitoring. Network can still be switched here, since
 * the user hasn't sent anything yet and may want to pick a different
 * network than the one chosen on the amount screen.
 *
 * The address (and destination tag/memo, where the chain uses one) is
 * always the signed-in user's real one, fetched live from
 * GET /crypto-addresses/:symbol/:network (useDepositAddress) - generated
 * server-side via Tatum on first request, never a placeholder. Refetches
 * whenever the selected network changes.
 *
 * Also reused as-is by the standalone Deposit Crypto flow (docs/context.md),
 * which needs the exact same address/QR/network-switch/share UI.
 */
export function DepositAddress({
  assetIconKey,
  assetSymbol,
  networks,
  initialNetworkId,
}: DepositAddressProps) {
  const [networkId, setNetworkId] = useState(initialNetworkId);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Starts open (not opened via an effect) so it shows as soon as the
  // deposit address is on screen, not only after actively switching
  // networks, since a single-network asset (e.g. BTC) never gives the user
  // a chance to trigger that path at all. tw-animate-css's enter animation
  // still plays on this initial mount, it isn't a transition that depends
  // on a prior "closed" render.
  const [importantOpen, setImportantOpen] = useState(true);
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  const network = networks.find((n) => n.id === networkId) ?? networks[0];
  const { address, destinationTag, error } = useDepositAddress(
    assetSymbol,
    network.assetNetwork,
  );

  // Reset during render (not in the effect below) whenever the address
  // itself changes - including to null while a new one is loading - so the
  // effect never shows a stale QR code for the wrong address, and never
  // needs to call setState synchronously before its async work starts.
  const [qrForAddress, setQrForAddress] = useState(address);
  if (address !== qrForAddress) {
    setQrForAddress(address);
    setQrSvg(null);
  }

  // Rendered client-side once the real address is known, rather than
  // server-side, since the address itself is now only known after the
  // authenticated fetch above resolves.
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    void QRCode.toString(address, {
      type: "svg",
      margin: 0,
      width: 200,
      errorCorrectionLevel: "H",
      color: { dark: "#1C1B29", light: "#00000000" },
    }).then((svg) => {
      if (!cancelled) setQrSvg(svg);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  function handleNetworkChange(id: string) {
    setNetworkId(id);
    setPickerOpen(false);
    // Deliberately after the sheet closes rather than layered on top of
    // it, so the user isn't asked to read a warning while a sheet is still
    // animating away underneath it.
    setImportantOpen(true);
  }

  async function handleShareAddress() {
    if (!address) return;
    const text = destinationTag
      ? `${address}\n${memoLabel(assetSymbol)}: ${destinationTag}`
      : address;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Veyro ${assetSymbol} deposit address`,
          text,
        });
        return;
      } catch {
        // User cancelled the share sheet, or it's unsupported, fall through to copy.
      }
    }
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="border-border bg-card relative flex size-[240px] items-center justify-center rounded-3xl border p-5">
          {qrSvg ? (
            <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
          ) : (
            <div className="bg-secondary/50 size-[200px] animate-pulse rounded-xl" />
          )}
          <span className="bg-card border-border absolute top-1/2 left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border p-1.5">
            <AssetIcon iconKey={assetIconKey} className="size-full" />
          </span>
        </div>
        <p className="text-ink/45 text-xs">For {assetSymbol} deposits only.</p>
      </div>

      <div className="flex w-full flex-col gap-2">
        {networks.length > 1 ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="border-border bg-card hover:bg-secondary/50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors"
          >
            <NetworkBadgeIcon
              iconKey={network.iconKey}
              className="size-5 shrink-0"
            />
            <span className="min-w-0 flex-1">
              <span className="text-ink/50 block text-xs">Network</span>
              <span className="text-ink block text-sm font-medium">
                {network.label}{" "}
                <span className="text-ink/45 font-normal">
                  {network.fullName}
                </span>
              </span>
            </span>
            <ChevronRightIcon
              className="text-ink/30 size-4 shrink-0"
              aria-hidden="true"
            />
          </button>
        ) : (
          <div className="border-border bg-card flex items-center gap-3 rounded-2xl border px-4 py-3">
            <NetworkBadgeIcon
              iconKey={network.iconKey}
              className="size-5 shrink-0"
            />
            <span className="min-w-0">
              <span className="text-ink/50 block text-xs">Network</span>
              <span className="text-ink block text-sm font-medium">
                {network.fullName}
              </span>
            </span>
          </div>
        )}

        <div className="border-border bg-card flex items-center gap-3 rounded-2xl border px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="text-ink/50 block text-xs">Deposit Address</span>
            <span className="text-ink block truncate font-mono text-sm">
              {error ? "Could not load address" : (address ?? "Loading…")}
            </span>
          </span>
          <CopyButton value={address ?? ""} label="Copy address" />
        </div>

        {error ? <p className="text-error text-xs">{error}</p> : null}

        {destinationTag ? (
          <div className="border-primary/30 bg-primary/5 flex items-start gap-3 rounded-2xl border px-4 py-3">
            <ExclamationTriangleIcon
              className="text-primary mt-0.5 size-4.5 shrink-0"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <span className="text-ink/60 block text-xs">
                {memoLabel(assetSymbol)} (required)
              </span>
              <span className="text-ink block truncate font-mono text-sm font-semibold">
                {destinationTag}
              </span>
              <p className="text-ink/60 mt-1 text-xs">
                You must include this {memoLabel(assetSymbol).toLowerCase()}{" "}
                with your deposit. Sending {assetSymbol} without it may result
                in lost or unattributed funds.
              </p>
            </div>
            <CopyButton
              value={destinationTag}
              label={`Copy ${memoLabel(assetSymbol).toLowerCase()}`}
            />
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={() => void handleShareAddress()}
        disabled={!address}
        className="w-full gap-1.5"
      >
        <ShareIcon className="size-4" aria-hidden="true" />
        Share Address
      </Button>

      {networks.length > 1 && (
        <NetworkPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          networks={networks}
          value={networkId}
          onChange={handleNetworkChange}
        />
      )}

      <ImportantNetworkNotice
        open={importantOpen}
        onOpenChange={setImportantOpen}
        assetSymbol={assetSymbol}
        network={network}
      />
    </div>
  );
}

/** XRP calls its shared-address discriminator a "destination tag"; every other shared-address chain (Stellar today) calls it a "memo". */
function memoLabel(assetSymbol: string): string {
  return assetSymbol === "XRP" ? "Destination Tag" : "Memo";
}

interface NetworkPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  networks: CryptoNetwork[];
  value: string;
  onChange: (id: string) => void;
}

// Bottom sheet, not a centered dialog: matches the Deposit/Withdraw list
// panel's sheet (same rounded-t-3xl + drag-handle + slide-in-from-bottom
// pattern, see deposit-withdraw-panel.tsx), since
// this is a mobile-first pick-one-of-a-few-options choice, not a form.
function NetworkPicker({
  open,
  onOpenChange,
  networks,
  value,
  onChange,
}: NetworkPickerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content
          className={cn(
            "bg-background fixed inset-x-0 bottom-0 z-50 rounded-t-3xl p-5 pb-8",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
          )}
        >
          <div className="bg-ink/15 mx-auto mb-4 h-1.5 w-10 rounded-full" />
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="font-heading text-ink text-lg">
              Choose Network
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="text-ink/40 hover:text-ink transition-colors"
            >
              <XMarkIcon className="size-5" />
            </Dialog.Close>
          </div>

          <div className="flex flex-col gap-2">
            {networks.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onChange(n.id)}
                className={cn(
                  "border-border hover:bg-secondary/50 flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  n.id === value && "bg-secondary/60",
                )}
              >
                <NetworkBadgeIcon
                  iconKey={n.iconKey}
                  className="size-5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="text-ink block text-sm font-medium">
                    {n.label}
                  </span>
                  <span className="text-ink/45 block text-xs">
                    {n.fullName}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="text-ink/45 border-border bg-secondary/40 mt-4 rounded-xl border p-3 text-xs">
            Only deposit via the network you select here. Sending via an
            unsupported network may result in permanent loss of funds.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface ImportantNetworkNoticeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetSymbol: string;
  network: CryptoNetwork;
}

// Centered modal (not a sheet): a one-time acknowledgement the user must
// actively dismiss before continuing, not a dismiss-by-swipe sheet, since
// missing this warning risks an unrecoverable on-chain deposit.
function ImportantNetworkNotice({
  open,
  onOpenChange,
  assetSymbol,
  network,
}: ImportantNetworkNoticeProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="bg-background data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 text-center shadow-xl">
          <span className="bg-primary/10 text-primary mx-auto flex size-11 items-center justify-center rounded-full">
            <ExclamationTriangleIcon className="size-5.5" aria-hidden="true" />
          </span>
          <Dialog.Title className="font-heading text-ink mt-3 text-base font-semibold">
            Important
          </Dialog.Title>
          <Dialog.Description className="text-ink/60 mt-2 text-sm">
            Please make sure you are depositing {assetSymbol} via the{" "}
            {network.label} network only. Sending {assetSymbol} through any
            other network may result in permanent loss of funds.
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button size="lg" className="mt-5 w-full">
              Continue
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
