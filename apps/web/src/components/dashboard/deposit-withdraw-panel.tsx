"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GiftIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PanelIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface PanelOption {
  href: string;
  title: string;
  description: string;
  icon: PanelIcon;
}

// Order matters: Deposit Crypto first, per docs/context.md's Home page
// spec, since it is the quick-access "get my address" utility this button
// exists to surface, ahead of the two full sell flows.
const DEPOSIT_OPTIONS: PanelOption[] = [
  {
    href: "/deposit/crypto",
    title: "Deposit Crypto",
    description: "Get your deposit address and QR code instantly.",
    icon: ArrowDownIcon,
  },
  {
    href: "/sell/gift-card",
    title: "Sell Gift Cards",
    description: "Submit a code or photos and get paid instantly.",
    icon: GiftIcon,
  },
  {
    href: "/sell/crypto",
    title: "Sell Crypto",
    description: "Deposit your crypto and get paid instantly.",
    icon: CurrencyDollarIcon,
  },
];

// Two separate withdrawal routes (docs/context.md), not one page with tabs:
// Send Fiat to External Account goes straight to the bank/PayPal request
// form, Crypto goes to its own asset picker first (/withdraw/crypto), since
// that flow needs an asset, network, and address instead of a saved-account
// pick.
// Both are gated by the same mandatory PIN check at submit time
// (product-rules.md rule 18a), not on entry.
const WITHDRAW_OPTIONS: PanelOption[] = [
  {
    href: "/withdraw/request",
    title: "Send Fiat to External Account",
    description:
      "Withdraw your Fiat balance to a linked bank account or PayPal.",
    icon: BanknotesIcon,
  },
  {
    href: "/withdraw/crypto",
    title: "Crypto",
    description: "Send crypto to an external wallet address.",
    icon: ArrowUpIcon,
  },
];

/**
 * Deposit and Withdraw entry points on the balance card, shared by Home and
 * Assets (docs/context.md). Both open the same list-panel pattern, a full
 * bottom sheet with icon, title, description, and chevron per row, not a
 * small inline dropdown, matching the reference layout this was built
 * from. Deposit's icon is a down arrow (funds coming in), Withdraw's is an
 * up arrow (funds going out).
 */
export function DepositWithdrawButtons() {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="gap-2 rounded-full px-5"
        onClick={() => setDepositOpen(true)}
      >
        <ArrowDownIcon className="size-4" aria-hidden="true" />
        Deposit
      </Button>
      <Button
        size="lg"
        className="gap-2 rounded-full px-5"
        onClick={() => setWithdrawOpen(true)}
      >
        <ArrowUpIcon className="size-4" aria-hidden="true" />
        Withdraw
      </Button>

      <ListPanel
        open={depositOpen}
        onOpenChange={setDepositOpen}
        title="Deposit"
        options={DEPOSIT_OPTIONS}
      />
      <ListPanel
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        title="Withdraw"
        options={WITHDRAW_OPTIONS}
      />
    </>
  );
}

interface ListPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: PanelOption[];
}

function ListPanel({ open, onOpenChange, title, options }: ListPanelProps) {
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
              {title}
            </Dialog.Title>
            <Dialog.Close aria-label="Close" className="text-ink/50">
              <XMarkIcon className="size-5" />
            </Dialog.Close>
          </div>
          <div className="flex flex-col gap-2">
            {options.map((option) => {
              const rowContent = (
                <>
                  <OptionIcon icon={option.icon} />
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block text-sm font-medium">
                      {option.title}
                    </span>
                    <span className="text-ink/50 block text-xs">
                      {option.description}
                    </span>
                  </span>
                  <ChevronRightIcon
                    className="text-ink/30 size-4 shrink-0"
                    aria-hidden="true"
                  />
                </>
              );
              const rowClassName =
                "hover:bg-secondary border-border flex w-full items-center gap-3 rounded-2xl border p-3 text-left";

              return (
                <Dialog.Close key={option.href} asChild>
                  <Link href={option.href} className={rowClassName}>
                    {rowContent}
                  </Link>
                </Dialog.Close>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OptionIcon({ icon: Icon }: { icon: PanelIcon }) {
  return (
    <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full">
      <Icon className="size-4.5" aria-hidden="true" />
    </span>
  );
}
