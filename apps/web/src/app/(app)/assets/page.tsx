import type { Metadata } from "next";
import {
  ArrowsRightLeftIcon,
  UserGroupIcon,
  BanknotesIcon,
  GiftIcon,
  WalletIcon,
} from "@heroicons/react/24/solid";
import { createClient } from "@/lib/supabase/server";
import { findCountry } from "@/lib/countries";
import { getWalletSummary } from "@/lib/dashboard/get-wallet-summary";
import { getTransactionHistory } from "@/lib/dashboard/get-transaction-history";
import {
  getAllCryptoWalletBalances,
  getIncomingCryptoDeposits,
} from "@/lib/dashboard/get-crypto-wallet-balance";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { AssetsBreakdown } from "@/components/dashboard/assets-breakdown";
import { CryptoBreakdown } from "@/components/dashboard/crypto-breakdown";
import { TransactionHistoryList } from "@/components/dashboard/transaction-history-list";
import { ComingSoonWidget } from "@/components/dashboard/widgets/coming-soon-widget";
import { ComingSoonListWidget } from "@/components/dashboard/widgets/coming-soon-list-widget";
import { StaggerIn, StaggerItem } from "@/components/dashboard/stagger-in";

export const metadata: Metadata = {
  title: "Assets",
};

// Main tab page (docs/context.md: one of the 3 mobile bottom nav
// destinations), so it keeps the standard TopBar (wordmark + notification/
// support/profile icons) like Home does, not an InnerPageHeader, per
// design-principles.md's Navigation Chrome section. TopBar already applies
// that per-route (it only renders on MOBILE_NAV_ITEMS paths), so nothing
// extra is needed here.
export default async function AssetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("users")
        .select("country, currency")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  // AppLayout already redirects unauthenticated/incomplete profiles before
  // this page renders, so profile.currency should always be set. The
  // country-derived fallback only guards against that assumption drifting.
  const homeCurrency =
    profile?.currency ?? findCountry(profile?.country ?? "")?.currency ?? "USD";

  const [walletSummary, transactions, cryptoBalances, incomingDeposits] =
    await Promise.all([
      user
        ? getWalletSummary(supabase, user.id, homeCurrency)
        : Promise.resolve({
            balance: 0,
            currency: homeCurrency,
            todayPnl: { amount: 0, percent: 0 },
            history: { "7d": [], "30d": [], "90d": [], "180d": [] },
            asOf: new Date().toISOString(),
          }),
      user
        ? getTransactionHistory(supabase, user.id, homeCurrency)
        : Promise.resolve([]),
      user
        ? getAllCryptoWalletBalances(supabase, user.id)
        : Promise.resolve([]),
      user ? getIncomingCryptoDeposits(supabase, user.id) : Promise.resolve([]),
    ]);

  return (
    <main className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <StaggerIn className="flex min-w-0 flex-col gap-8">
          <StaggerItem>
            <BalanceCard
              homeCurrency={homeCurrency}
              balance={walletSummary.balance}
              cryptoBalances={cryptoBalances}
              todayPnl={walletSummary.todayPnl}
              showChart
              history={walletSummary.history}
              asOf={walletSummary.asOf}
            />
          </StaggerItem>
          <StaggerItem>
            <AssetsBreakdown
              balance={walletSummary.balance}
              currency={homeCurrency}
            />
          </StaggerItem>
          <StaggerItem>
            <CryptoBreakdown
              balances={cryptoBalances}
              incoming={incomingDeposits}
            />
          </StaggerItem>
          <StaggerItem>
            <TransactionHistoryList items={transactions} />
          </StaggerItem>
        </StaggerIn>

        <StaggerIn className="hidden flex-col gap-4 lg:flex">
          <StaggerItem>
            <ComingSoonWidget
              icon={ArrowsRightLeftIcon}
              title="Convert"
              blurb="Swap between wallet currencies instantly, no sell flow needed."
            />
          </StaggerItem>
          <StaggerItem>
            <ComingSoonWidget
              icon={UserGroupIcon}
              title="P2P Trading"
              blurb="Trade directly with other Veyro users at competitive rates."
            />
          </StaggerItem>
          <StaggerItem>
            <ComingSoonListWidget
              title="More Ways to Earn"
              items={[
                { icon: BanknotesIcon, label: "Earn" },
                { icon: GiftIcon, label: "Airdrop" },
                { icon: WalletIcon, label: "Connect Wallet" },
              ]}
            />
          </StaggerItem>
        </StaggerIn>
      </div>
    </main>
  );
}
