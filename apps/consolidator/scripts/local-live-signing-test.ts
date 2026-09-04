/**
 * *** NOT A DRY RUN once the consolidation wallet is solvent. ***
 * ONE-OFF, MANUAL LIVE SIGNING TEST: exercises the REAL
 * UtxoConsolidatorAdapter (derivation, real Tatum getUtxos/
 * getFeeRateSatsPerByte calls, the pre-signing solvency check) against a
 * real amount, for BTC, LTC, or DOGE - without ever going through
 * ConsolidatorRunner or touching the withdrawals table. This calls
 * adapter.payout() directly, and payout() only refrains from
 * signing/broadcasting when the solvency check FAILS (insufficient
 * balance -> ok:false, returned before any signing) - see
 * UtxoConsolidatorAdapter.payout in ../src/chains/utxo.ts, which has the
 * exact same "insufficient balance is the only early return" shape
 * regardless of which UtxoNetworkParams (BTC/LTC/DOGE) it's constructed
 * with. The moment the wallet holds enough for a given <chain>/<amount>,
 * this script WILL build, sign, and broadcast a real on-chain
 * transaction to <toAddress>. Same pattern applies to the TRON/EVM
 * adapters too (../src/chains/tron.ts, ../src/chains/evm.ts). Never run
 * this against a wallet you believe or are testing to be solvent - use
 * scripts/check-evm-balance.ts (or an equivalent read-only,
 * non-payout()-calling check for the chain in question) for that
 * instead.
 *
 * Run this ONLY on a machine you trust, same discipline as
 * apps/sweeper/scripts/verify-consolidator-derivation.js. The mnemonic is
 * read from an env var, used in-memory for this one process, and never
 * written to disk or logged - only the derived address (public) and the
 * structured PayoutResult are printed.
 *
 * <chain> selects UtxoNetworkParams and the Tatum chain slug from the
 * same UTXO_PARAMS map ../src/chains/registry.ts's buildAdapter() uses
 * for real payouts, so this can't drift from what a real payout would
 * target.
 *
 * Usage:
 *   CONSOLIDATION_MASTER_SEED="word1 word2 ..." \
 *   TATUM_API_KEY="..." \
 *   pnpm --filter consolidator exec ts-node scripts/local-live-signing-test.ts \
 *     <BTC|LTC|DOGE> <expectedFromAddress> <amount> <toAddress>
 */
import { UtxoConsolidatorAdapter } from "../src/chains/utxo";
import { TatumUtxoProvider } from "../src/chains/utxo-tatum-provider";
import { UTXO_PARAMS } from "../src/chains/registry";

const TATUM_CHAIN: Record<keyof typeof UTXO_PARAMS, string> = {
  BTC: "bitcoin",
  LTC: "litecoin",
  DOGE: "dogecoin",
};

async function main() {
  const mnemonic = process.env.CONSOLIDATION_MASTER_SEED;
  if (!mnemonic) {
    console.error("Set CONSOLIDATION_MASTER_SEED in the environment, not as an argument.");
    process.exit(2);
  }
  const tatumApiKey = process.env.TATUM_API_KEY;
  if (!tatumApiKey) {
    console.error("Set TATUM_API_KEY in the environment.");
    process.exit(2);
  }

  const [chainArg, expectedFromAddress, amountArg, toAddress] = process.argv.slice(2);
  const chain = chainArg as keyof typeof UTXO_PARAMS;
  const amount = Number(amountArg);
  if (!UTXO_PARAMS[chain] || !expectedFromAddress || !Number.isFinite(amount) || !toAddress) {
    console.error("Usage: <BTC|LTC|DOGE> <expectedFromAddress> <amount> <toAddress>");
    process.exit(2);
  }

  const provider = new TatumUtxoProvider(TATUM_CHAIN[chain], tatumApiKey);
  const adapter = new UtxoConsolidatorAdapter(UTXO_PARAMS[chain], mnemonic, provider);

  console.log(`Derived fromAddress: ${adapter.fromAddress}`);
  console.log(
    `Matches expected consolidation_wallets.address (${expectedFromAddress}): ${adapter.fromAddress === expectedFromAddress}`,
  );

  console.log(`\nCalling payout("${chain}", ${amount}, "${toAddress}") ...`);
  const result = await adapter.payout(chain, amount, toAddress);
  console.log("\nResult:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("\nUNEXPECTED CRASH (not a clean PayoutResult):", err);
  process.exit(1);
});
