/**
 * ONE-OFF, MANUAL local verification: exercises the REAL UtxoConsolidatorAdapter
 * (derivation, real Tatum getUtxos/getFeeRateSatsPerByte calls, the
 * pre-signing solvency check) against a real amount, without ever going
 * through ConsolidatorRunner or touching the withdrawals table - purely a
 * signing-capability check, side-effect-free as long as the consolidation
 * wallet's real balance is insufficient (in which case payout() returns
 * ok:false BEFORE ever building/signing/broadcasting a transaction).
 *
 * Run this ONLY on a machine you trust, same discipline as
 * apps/sweeper/scripts/verify-consolidator-derivation.js. The mnemonic is
 * read from an env var, used in-memory for this one process, and never
 * written to disk or logged - only the derived address (public) and the
 * structured PayoutResult are printed.
 *
 * Usage:
 *   CONSOLIDATION_MASTER_SEED="word1 word2 ..." \
 *   TATUM_API_KEY="..." \
 *   pnpm --filter consolidator exec ts-node scripts/local-dry-run-check.ts \
 *     <expectedFromAddress> <amount> <toAddress>
 */
import { UtxoConsolidatorAdapter, BITCOIN_PARAMS } from "../src/chains/utxo";
import { TatumUtxoProvider } from "../src/chains/utxo-tatum-provider";

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

  const [expectedFromAddress, amountArg, toAddress] = process.argv.slice(2);
  const amount = Number(amountArg);
  if (!expectedFromAddress || !Number.isFinite(amount) || !toAddress) {
    console.error("Usage: <expectedFromAddress> <amount> <toAddress>");
    process.exit(2);
  }

  const provider = new TatumUtxoProvider("bitcoin", tatumApiKey);
  const adapter = new UtxoConsolidatorAdapter(BITCOIN_PARAMS, mnemonic, provider);

  console.log(`Derived fromAddress: ${adapter.fromAddress}`);
  console.log(
    `Matches expected consolidation_wallets.address (${expectedFromAddress}): ${adapter.fromAddress === expectedFromAddress}`,
  );

  console.log(`\nCalling payout("BTC", ${amount}, "${toAddress}") ...`);
  const result = await adapter.payout("BTC", amount, toAddress);
  console.log("\nResult:", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("\nUNEXPECTED CRASH (not a clean PayoutResult):", err);
  process.exit(1);
});
