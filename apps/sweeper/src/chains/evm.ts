import { ethers } from "ethers";
import {
  ChainAdapter,
  DepositAddress,
  SweepFeeContext,
  SweepResult,
} from "./types";

// Minimal ERC20 ABI - balanceOf + transfer + decimals, the only calls the
// sweeper needs.
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)",
  "function decimals() view returns (uint8)",
];

export interface EvmTokenContracts {
  /** Contract address per network label per token symbol, e.g. contracts['ERC20']['USDT']. */
  [network: string]: Record<string, string>;
}

/**
 * One adapter instance per EVM network (ERC20, BEP20, Polygon, Arbitrum,
 * ...), all deriving from the SAME master seed (SWEEPER_EVM_SEED) since
 * every EVM chain shares one address space. `derivationPath` MUST match
 * whatever path Tatum's generateAddressFromXpub used to derive the xpub
 * apps/api holds (TATUM_EVM_XPUB) - verify against a real Tatum-derived
 * address on testnet before relying on this in production; if it doesn't
 * match, the sweeper will derive a different address than the one users
 * actually deposited to.
 */
export class EvmAdapter implements ChainAdapter {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly masterSeed: string;
  private readonly network: string;
  private readonly tokenContracts: Record<string, string>;

  constructor(
    rpcUrl: string,
    masterSeedMnemonic: string,
    network: string,
    tokenContracts: Record<string, string>,
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.masterSeed = masterSeedMnemonic;
    this.network = network;
    this.tokenContracts = tokenContracts;
  }

  private deriveWallet(index: number): ethers.HDNodeWallet {
    const root = ethers.HDNodeWallet.fromPhrase(this.masterSeed);
    // BIP44 "external chain" path, index 0/{index} - matches the shape
    // Tatum's own xpub-index derivation documents for EVM chains.
    return root.derivePath(`m/44'/60'/0'/0/${index}`).connect(this.provider);
  }

  async getBalance(address: string, symbol: string): Promise<number> {
    const contract = this.tokenContracts[symbol];
    if (contract) {
      const token = new ethers.Contract(contract, ERC20_ABI, this.provider);
      const [raw, decimals] = await Promise.all([
        token.balanceOf(address) as Promise<bigint>,
        token.decimals() as Promise<number>,
      ]);
      return Number(ethers.formatUnits(raw, decimals));
    }
    const raw = await this.provider.getBalance(address);
    return Number(ethers.formatEther(raw));
  }

  async sweep(
    deposit: DepositAddress,
    symbol: string,
    toAddress: string,
    feeContext?: SweepFeeContext,
  ): Promise<SweepResult | null> {
    if (deposit.derivationIndex === null) {
      throw new Error(
        `EVM sweep requires a derivation index (got null for ${deposit.address})`,
      );
    }
    const wallet = this.deriveWallet(deposit.derivationIndex);
    const feeData = await this.provider.getFeeData();
    const contract = this.tokenContracts[symbol];

    if (contract) {
      return this.sweepToken(wallet, contract, toAddress, feeData, feeContext);
    }
    return this.sweepNative(wallet, toAddress, feeData);
  }

  private async sweepNative(
    wallet: ethers.HDNodeWallet,
    toAddress: string,
    feeData: ethers.FeeData,
  ): Promise<SweepResult | null> {
    const balance = await this.provider.getBalance(wallet.address);
    const gasLimit = 21_000n;
    const gasPrice = feeData.gasPrice ?? 0n;
    const fee = gasLimit * gasPrice;

    if (balance <= fee) return null;

    const amountToSend = balance - fee;
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountToSend,
      gasLimit,
      gasPrice,
    });
    await tx.wait();

    return {
      txHash: tx.hash,
      amountSwept: Number(ethers.formatEther(amountToSend)),
      feeEstimate: Number(ethers.formatEther(fee)),
    };
  }

  private async sweepToken(
    wallet: ethers.HDNodeWallet,
    contractAddress: string,
    toAddress: string,
    feeData: ethers.FeeData,
    feeContext?: SweepFeeContext,
  ): Promise<SweepResult | null> {
    const token = new ethers.Contract(contractAddress, ERC20_ABI, wallet);
    const [raw, decimals] = await Promise.all([
      token.balanceOf(wallet.address) as Promise<bigint>,
      token.decimals() as Promise<number>,
    ]);

    if (raw === 0n) return null;

    // Token transfers need native gas in the deposit address itself; the
    // sweeper is expected to keep each token-bearing address topped up with
    // a small native-gas float separately (not handled by this method) -
    // if that float is missing, this transaction will simply fail on
    // broadcast and get logged as a failed sweep_log row.
    const gasLimit = 65_000n;
    const gasPrice = feeData.gasPrice ?? 0n;
    const fee = gasLimit * gasPrice;
    const feeEstimate = Number(ethers.formatEther(fee));

    // Fee-aware "worth sweeping" check (sweep_fee_multiple_erc20_token,
    // see thresholds.ts). Mandatory, not best-effort: without feeContext
    // there is no gate at all on this path (the balance is a stablecoin,
    // the fee is native gas - they can't be compared directly), so a
    // missing feeContext fails closed rather than silently sweeping every
    // nonzero balance regardless of whether it clears the real fee.
    if (!feeContext) {
      throw new Error(
        "EVM token sweep requires a SweepFeeContext (feeMultiplier + nativeUsdPrice) to decide whether this balance is worth sweeping",
      );
    }
    const balanceUsd = Number(ethers.formatUnits(raw, decimals));
    const feeUsd = feeEstimate * feeContext.nativeUsdPrice;
    if (balanceUsd < feeContext.feeMultiplier * feeUsd) return null;

    if (feeContext.dryRun) {
      return {
        txHash: "dry_run",
        amountSwept: balanceUsd,
        feeEstimate,
      };
    }

    const tx = (await token.transfer(toAddress, raw, {
      gasLimit,
      gasPrice,
    })) as ethers.ContractTransactionResponse;
    await tx.wait();

    return {
      txHash: tx.hash,
      amountSwept: Number(ethers.formatUnits(raw, decimals)),
      feeEstimate,
    };
  }
}
