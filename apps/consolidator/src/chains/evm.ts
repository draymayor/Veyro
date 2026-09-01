import { ethers } from "ethers";
import { PayoutAdapter, PayoutResult } from "./types";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)",
  "function decimals() view returns (uint8)",
];

// CONFIRMED (2026-09-01) fixed derivation path for the single EVM
// consolidation wallet address, shared across every EVM network (one
// address space) - verified against consolidation_wallets by
// scripts/verify-consolidator-derivation.js. Do not re-derive or guess.
const EVM_DERIVATION_PATH = "m/44'/60'/0'/0/0";

/**
 * One adapter instance per EVM network (ERC20, BEP20, Polygon, ...), all
 * signing from the SAME address (CONSOLIDATION_MASTER_SEED's one EVM path)
 * since every EVM chain shares one address space - only the RPC endpoint
 * and, for tokens, the contract address differ per network.
 */
export class EvmConsolidatorAdapter implements PayoutAdapter {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly wallet: ethers.HDNodeWallet;
  readonly fromAddress: string;

  constructor(
    rpcUrl: string,
    masterSeedMnemonic: string,
    private readonly tokenContracts: Record<string, string>,
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    // fromPhrase() already returns the node AT its default path
    // (m/44'/60'/0'/0/0) - do not call derivePath() again on the result,
    // that re-applies the path onto an already-depth-5 node and throws
    // (same caveat verify-consolidator-derivation.js documents).
    this.wallet = ethers.HDNodeWallet.fromPhrase(
      masterSeedMnemonic,
      undefined,
      EVM_DERIVATION_PATH,
    ).connect(this.provider);
    this.fromAddress = this.wallet.address;
  }

  async payout(
    symbol: string,
    amount: number,
    toAddress: string,
  ): Promise<PayoutResult> {
    const contractAddress = this.tokenContracts[symbol];
    return contractAddress
      ? this.payoutToken(contractAddress, amount, toAddress)
      : this.payoutNative(amount, toAddress);
  }

  private async payoutNative(
    amount: number,
    toAddress: string,
  ): Promise<PayoutResult> {
    const gasLimit = 21_000n;
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;
    const fee = gasLimit * gasPrice;
    const amountWei = ethers.parseEther(amount.toString());

    const balance = await this.provider.getBalance(this.fromAddress);
    if (balance < amountWei + fee) {
      return {
        ok: false,
        reason: "insufficient_consolidation_balance",
        message: `Consolidation wallet ${this.fromAddress} holds ${ethers.formatEther(balance)}, needs ${ethers.formatEther(amountWei + fee)} (amount ${amount} + estimated gas fee ${ethers.formatEther(fee)}).`,
        feeEstimate: Number(ethers.formatEther(fee)),
      };
    }

    // Deliberately not awaiting tx.wait() here: broadcast (the node
    // accepting this request and returning a hash) is what marks a
    // withdrawal 'signed' in this design, not confirmation depth -
    // consistent across all 3 chain families (UTXO/TRON broadcast calls
    // below don't wait for confirmations either), and it avoids a
    // confirmation-wait timeout being mistaken for "nothing was sent" when
    // a real transaction is already sitting in the mempool.
    const tx = await this.wallet.sendTransaction({
      to: toAddress,
      value: amountWei,
      gasLimit,
      gasPrice,
    });

    return {
      ok: true,
      txHash: tx.hash,
      feeEstimate: Number(ethers.formatEther(fee)),
    };
  }

  private async payoutToken(
    contractAddress: string,
    amount: number,
    toAddress: string,
  ): Promise<PayoutResult> {
    const readContract = new ethers.Contract(
      contractAddress,
      ERC20_ABI,
      this.provider,
    );
    const decimals = (await readContract.decimals()) as number;
    const amountRaw = ethers.parseUnits(amount.toString(), decimals);

    const [tokenBalance, nativeBalance, feeData] = await Promise.all([
      readContract.balanceOf(this.fromAddress) as Promise<bigint>,
      this.provider.getBalance(this.fromAddress),
      this.provider.getFeeData(),
    ]);

    const gasLimit = 65_000n;
    const gasPrice = feeData.gasPrice ?? 0n;
    const fee = gasLimit * gasPrice;

    if (tokenBalance < amountRaw) {
      return {
        ok: false,
        reason: "insufficient_consolidation_balance",
        message: `Consolidation wallet ${this.fromAddress} holds ${ethers.formatUnits(tokenBalance, decimals)} of this token, needs ${amount}.`,
        feeEstimate: Number(ethers.formatEther(fee)),
      };
    }
    if (nativeBalance < fee) {
      return {
        ok: false,
        reason: "insufficient_consolidation_balance",
        message: `Consolidation wallet ${this.fromAddress} has insufficient native gas balance (${ethers.formatEther(nativeBalance)}) to cover the estimated fee (${ethers.formatEther(fee)}) for this token transfer.`,
        feeEstimate: Number(ethers.formatEther(fee)),
      };
    }

    const writeContract = new ethers.Contract(
      contractAddress,
      ERC20_ABI,
      this.wallet,
    );
    const tx = (await writeContract.transfer(toAddress, amountRaw, {
      gasLimit,
      gasPrice,
    })) as ethers.ContractTransactionResponse;

    return {
      ok: true,
      txHash: tx.hash,
      feeEstimate: Number(ethers.formatEther(fee)),
    };
  }
}
