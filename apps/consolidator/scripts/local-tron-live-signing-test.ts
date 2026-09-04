/**
 * *** NOT A DRY RUN once the consolidation wallet is solvent. ***
 * ONE-OFF, MANUAL, LIVE SIGNING TEST for TRON: exercises the REAL
 * TronConsolidatorAdapter (derivation via TronWeb.fromMnemonic, real
 * trongrid.io getBalance/getBalance-of calls, the pre-signing solvency
 * check) against a real amount - without ever going through
 * ConsolidatorRunner or touching the withdrawals table. This calls
 * adapter.payout() directly, and payout() only refrains from
 * signing/broadcasting when the solvency check FAILS (insufficient
 * balance -> ok:false, returned before any signing) - see
 * TronConsolidatorAdapter.payout in ../src/chains/tron.ts.
 *
 * TRON is not parameterized into local-live-signing-test.ts because it
 * goes through a different adapter with a different constructor shape
 * (fullHost, mnemonic) - no UtxoNetworkParams, no UtxoProvider - so it
 * gets its own invocation, matching how registry.ts's buildAdapter()
 * branches TRON out from the shared UTXO_PARAMS case.
 *
 * The moment the wallet holds enough for the given <symbol>/<amount>,
 * this script WILL build, sign, and broadcast a real on-chain
 * transaction to <toAddress>.
 *
 * Run this ONLY on a machine you trust, same discipline as
 * apps/sweeper/scripts/verify-consolidator-derivation.js. The mnemonic is
 * read from an env var, used in-memory for this one process, and never
 * written to disk or logged - only the derived address (public) and the
 * structured PayoutResult are printed.
 *
 * Usage (native TRX):
 *   CONSOLIDATION_MASTER_SEED="word1 word2 ..." \
 *   pnpm --filter consolidator exec ts-node scripts/local-tron-live-signing-test.ts \
 *     TRX <expectedFromAddress> <amount> <toAddress>
 *
 * Usage (TRC20, e.g. USDT):
 *   CONSOLIDATION_MASTER_SEED="word1 word2 ..." \
 *   pnpm --filter consolidator exec ts-node scripts/local-tron-live-signing-test.ts \
 *     USDT <expectedFromAddress> <amount> <toAddress>
 */
import { TronConsolidatorAdapter } from "../src/chains/tron";

const TRONGRID_FULL_HOST = "https://api.trongrid.io";

async function main() {
  const mnemonic = process.env.CONSOLIDATION_MASTER_SEED;
  if (!mnemonic) {
    console.error("Set CONSOLIDATION_MASTER_SEED in the environment, not as an argument.");
    process.exit(2);
  }

  const [symbol, expectedFromAddress, amountArg, toAddress] = process.argv.slice(2);
  const amount = Number(amountArg);
  if (!symbol || !expectedFromAddress || !Number.isFinite(amount) || !toAddress) {
    console.error("Usage: <TRX|USDT> <expectedFromAddress> <amount> <toAddress>");
    process.exit(2);
  }

  const adapter = new TronConsolidatorAdapter(TRONGRID_FULL_HOST, mnemonic);

  console.log(`Derived fromAddress: ${adapter.fromAddress}`);
  console.log(
    `Matches expected consolidation_wallets.address (${expectedFromAddress}): ${adapter.fromAddress === expectedFromAddress}`,
  );

  console.log(`\nCalling payout("${symbol}", ${amount}, "${toAddress}") ...`);
  const result = await adapter.payout(symbol, amount, toAddress);
  console.log("\nResult:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("\nUNEXPECTED CRASH (not a clean PayoutResult):", err);
  process.exit(1);
});
