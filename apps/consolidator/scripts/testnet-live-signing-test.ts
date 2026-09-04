/**
 * REAL SIGNING TEST, ZERO REAL VALUE: exercises the exact same
 * EvmConsolidatorAdapter code path as production (../src/chains/evm.ts -
 * HDNodeWallet.fromPhrase derivation from the real
 * CONSOLIDATION_MASTER_SEED, the pre-signing solvency check, then
 * wallet.sendTransaction / Contract.transfer signing + broadcast), but
 * pointed at BNB Smart Chain TESTNET (chainId 97) instead of mainnet.
 *
 * Because the EVM derivation path (m/44'/60'/0'/0/0) is fixed and EVM
 * addresses are chain-agnostic, the fromAddress this derives is the SAME
 * address as the real mainnet consolidation wallet - that's intentional:
 * it's what proves this is the real signing mechanics, not a stand-in.
 * Only the chain state is different: testnet tBNB/test tokens have no
 * market value, so an actual signed + broadcast transfer here has zero
 * real-value consequence, unlike local-live-signing-test.ts or an EVM
 * equivalent pointed at mainnet.
 *
 * Same discipline as local-live-signing-test.ts: run only on a machine
 * you trust, mnemonic read from an env var, used in-memory for this one
 * process, never written to disk or logged - only the derived address
 * (public) and the structured PayoutResult are printed.
 *
 * Default mode tests the NATIVE-asset path (payoutNative: fee
 * estimation, balance check, wallet.sendTransaction, broadcast) since
 * that needs no token contract address and so nothing to get wrong.
 *
 * To additionally exercise the ERC20/BEP20 path (payoutToken:
 * Contract.transfer ABI encoding), pass a *testnet* token contract
 * address you have independently verified on testnet.bscscan.com (e.g.
 * from https://www.bnbchain.org/en/testnet-faucet) as TESTNET_TOKEN_CONTRACT
 * - this script does NOT hardcode one, deliberately: a wrong contract
 * address is exactly the kind of mistake registry.ts's
 * EVM_TOKEN_CONTRACTS header warns about, and unlike mainnet the
 * consequence here is just a failed/no-op test rather than lost funds,
 * but it's still worth getting right to actually prove anything.
 *
 * Usage (native tBNB test - default, get some from the faucet first):
 *   CONSOLIDATION_MASTER_SEED="word1 word2 ..." \
 *   pnpm --filter consolidator exec ts-node scripts/testnet-live-signing-test.ts \
 *     tBNB 0.001 <yourTestnetReceivingAddress>
 *
 * Usage (ERC20/BEP20 test token path, once you've verified a contract
 * and funded the derived address with it via the faucet):
 *   CONSOLIDATION_MASTER_SEED="word1 word2 ..." \
 *   TESTNET_TOKEN_CONTRACT="0x..." \
 *   pnpm --filter consolidator exec ts-node scripts/testnet-live-signing-test.ts \
 *     USDT 0.001 <yourTestnetReceivingAddress>
 *
 * BSC Testnet RPC (public, no key needed): https://data-seed-prebsc-1-s1.bnbchain.org:8545
 * Explorer: https://testnet.bscscan.com/
 * Faucet: https://www.bnbchain.org/en/testnet-faucet
 */
import { EvmConsolidatorAdapter } from "../src/chains/evm";

const BSC_TESTNET_RPC = "https://data-seed-prebsc-1-s1.bnbchain.org:8545";

async function main() {
  const mnemonic = process.env.CONSOLIDATION_MASTER_SEED;
  if (!mnemonic) {
    console.error("Set CONSOLIDATION_MASTER_SEED in the environment, not as an argument.");
    process.exit(2);
  }

  const [symbol, amountArg, toAddress] = process.argv.slice(2);
  const amount = Number(amountArg);
  if (!symbol || !Number.isFinite(amount) || !toAddress) {
    console.error("Usage: <symbol> <amount> <toAddress>");
    process.exit(2);
  }

  const testnetTokenContract = process.env.TESTNET_TOKEN_CONTRACT;
  const tokenContracts = testnetTokenContract ? { [symbol]: testnetTokenContract } : {};

  const adapter = new EvmConsolidatorAdapter(BSC_TESTNET_RPC, mnemonic, tokenContracts);

  console.log(`Derived fromAddress: ${adapter.fromAddress}`);
  console.log("(Same address as the real mainnet consolidation wallet - expected, see header.)");
  console.log(`\nChain: BNB Smart Chain TESTNET (chainId 97) - https://testnet.bscscan.com/address/${adapter.fromAddress}`);
  console.log(
    testnetTokenContract
      ? `Testing ERC20/BEP20 path via contract ${testnetTokenContract}`
      : `Testing native-asset path (payoutNative) - no token contract configured`,
  );

  console.log(`\nCalling payout("${symbol}", ${amount}, "${toAddress}") ...`);
  const result = await adapter.payout(symbol, amount, toAddress);
  console.log("\nResult:", JSON.stringify(result, null, 2));

  if (result.ok) {
    console.log(`\nBroadcast. View on testnet explorer: https://testnet.bscscan.com/tx/${result.txHash}`);
  }
}

main().catch((err) => {
  console.error("\nUNEXPECTED CRASH (not a clean PayoutResult):", err);
  process.exit(1);
});
