/**
 * ONE-OFF, MANUAL, READ-ONLY balance check for an EVM consolidation
 * wallet. Calls ONLY balanceOf()/decimals() (ERC20) and getBalance()
 * (native gas) via a plain ethers.JsonRpcProvider.
 *
 * Deliberately does NOT derive a signing wallet, does NOT touch
 * CONSOLIDATION_MASTER_SEED, and never calls payout()/writeContract() -
 * unlike local-live-signing-test.ts (formerly local-dry-run-check.ts;
 * renamed because it is NOT a dry run once the wallet is solvent - see
 * its header), this one has no code path that can ever sign or broadcast
 * anything, regardless of the balance it finds. Safe to run against a
 * wallet holding real funds.
 *
 * Token contract addresses are read from EVM_TOKEN_CONTRACTS in
 * ../src/chains/registry.ts - the same map buildAdapter() uses for real
 * payouts - so this can't drift from what a real payout would target.
 *
 * Usage:
 *   EVM_RPC_URL_BEP20="https://..." \
 *   pnpm --filter consolidator exec ts-node scripts/check-evm-balance.ts \
 *     <address> [networkCode] [symbol]
 *
 * Defaults: networkCode=BEP20, symbol=USDT.
 * RPC URL env var follows the same convention as buildAdapter():
 * EVM_RPC_URL_<networkCode> (underscores in networkCode map back to
 * spaces there, e.g. "XDC Network" -> EVM_RPC_URL_XDC_Network).
 */
import { ethers } from "ethers";
import { EVM_TOKEN_CONTRACTS } from "../src/chains/registry";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function main() {
  const [address, networkCode = "BEP20", symbol = "USDT"] = process.argv.slice(2);
  if (!address) {
    console.error("Usage: <address> [networkCode=BEP20] [symbol=USDT]");
    process.exit(2);
  }

  const rpcEnvVar = `EVM_RPC_URL_${networkCode}`;
  const rpcUrl = process.env[rpcEnvVar];
  if (!rpcUrl) {
    console.error(`Set ${rpcEnvVar} in the environment.`);
    process.exit(2);
  }

  const contractAddress = EVM_TOKEN_CONTRACTS[networkCode]?.[symbol];
  if (!contractAddress) {
    console.error(
      `No contract configured for ${symbol} on ${networkCode} in src/chains/registry.ts's EVM_TOKEN_CONTRACTS.`,
    );
    process.exit(2);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

  console.log(`Network: ${networkCode}  Token: ${symbol}  Contract: ${contractAddress}`);
  console.log(`Address: ${address}`);

  const [tokenBalanceRaw, decimals, nativeBalance] = await Promise.all([
    contract.balanceOf(address) as Promise<bigint>,
    contract.decimals() as Promise<number>,
    provider.getBalance(address),
  ]);

  console.log(`\n${symbol} balance:      ${ethers.formatUnits(tokenBalanceRaw, decimals)}`);
  console.log(`Native gas balance: ${ethers.formatEther(nativeBalance)}`);
}

main().catch((err) => {
  console.error("\nERROR:", err);
  process.exit(1);
});
