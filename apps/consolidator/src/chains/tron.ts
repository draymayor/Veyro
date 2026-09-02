import { PayoutAdapter, PayoutResult } from "./types";

// tronweb@6's CommonJS export is an object with a named `TronWeb` property,
// not the constructor itself (same caveat apps/sweeper/src/chains/tron.ts
// documents).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TronWeb } = require("tronweb");

const TRC20_CONTRACTS: Record<string, string> = {
  USDT: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
};

// CONFIRMED (2026-09-01) fixed derivation path for the single TRON
// consolidation wallet address - verified against consolidation_wallets by
// scripts/verify-consolidator-derivation.js. Do not re-derive or guess.
const TRON_DERIVATION_PATH = "m/44'/195'/0'/0/0";

// Same conservative bandwidth/energy buffer apps/sweeper uses for a plain
// TRX transfer, and the minimum native float this job requires to be
// present before attempting a TRC20 transfer (whose actual energy cost is
// not estimated here - see the payoutToken() comment).
const TRX_FEE_BUFFER_SUN = 1_100_000;

export class TronConsolidatorAdapter implements PayoutAdapter {
  private readonly tronWeb: any;
  private readonly privateKey: string;
  readonly fromAddress: string;

  constructor(fullHost: string, masterSeedMnemonic: string) {
    this.tronWeb = new TronWeb({ fullHost });
    const { privateKey, address } = this.tronWeb.fromMnemonic(
      masterSeedMnemonic,
      TRON_DERIVATION_PATH,
    );
    this.privateKey = privateKey;
    this.fromAddress = address;
  }

  async payout(
    symbol: string,
    amount: number,
    toAddress: string,
  ): Promise<PayoutResult> {
    return symbol === "TRX"
      ? this.payoutNative(amount, toAddress)
      : this.payoutToken(symbol, amount, toAddress);
  }

  private async payoutNative(
    amount: number,
    toAddress: string,
  ): Promise<PayoutResult> {
    const sunAmount = Math.round(amount * 1e6);
    const balanceSun = (await this.tronWeb.trx.getBalance(
      this.fromAddress,
    )) as number;

    if (balanceSun < sunAmount + TRX_FEE_BUFFER_SUN) {
      return {
        ok: false,
        reason: "insufficient_consolidation_balance",
        message: `Consolidation wallet ${this.fromAddress} holds ${balanceSun} sun, needs ${sunAmount + TRX_FEE_BUFFER_SUN} (amount ${sunAmount} + fee buffer ${TRX_FEE_BUFFER_SUN}).`,
        feeEstimate: TRX_FEE_BUFFER_SUN / 1e6,
      };
    }

    const tx = await this.tronWeb.transactionBuilder.sendTrx(
      toAddress,
      sunAmount,
      this.fromAddress,
    );
    const signed = await this.tronWeb.trx.sign(tx, this.privateKey);
    const result: { txid: string } =
      await this.tronWeb.trx.sendRawTransaction(signed);

    return {
      ok: true,
      txHash: result.txid,
      feeEstimate: TRX_FEE_BUFFER_SUN / 1e6,
    };
  }

  private async payoutToken(
    symbol: string,
    amount: number,
    toAddress: string,
  ): Promise<PayoutResult> {
    const contractAddress = TRC20_CONTRACTS[symbol];
    if (!contractAddress) {
      throw new Error(`Unknown TRC20 token ${symbol}`);
    }

    const contract = await this.tronWeb.contract().at(contractAddress);
    const amountRaw = Math.round(amount * 1e6); // USDT-TRC20 uses 6 decimals, same as apps/sweeper assumes.

    const [tokenBalanceRaw, nativeBalanceSun] = await Promise.all([
      contract.balanceOf(this.fromAddress).call() as Promise<{
        toNumber: () => number;
      }>,
      this.tronWeb.trx.getBalance(this.fromAddress) as Promise<number>,
    ]);

    if (tokenBalanceRaw.toNumber() < amountRaw) {
      return {
        ok: false,
        reason: "insufficient_consolidation_balance",
        message: `Consolidation wallet ${this.fromAddress} holds ${tokenBalanceRaw.toNumber()} raw units of ${symbol}, needs ${amountRaw}.`,
      };
    }

    // TRC20 transfers consume energy/bandwidth paid from the sending
    // address's own TRX (same as apps/sweeper's tron.ts) - this only
    // checks a fixed float is present, it does not estimate the actual
    // energy cost for this specific transfer. If the float is
    // insufficient, the transaction will fail on broadcast and this
    // withdrawal correctly ends up 'sign_failed' via the runner's error
    // path (not the pre-flight check below) - a known, documented
    // limitation, matching apps/sweeper's own TRC20 comment.
    if (nativeBalanceSun < TRX_FEE_BUFFER_SUN) {
      return {
        ok: false,
        reason: "insufficient_consolidation_balance",
        message: `Consolidation wallet ${this.fromAddress} has insufficient native TRX float (${nativeBalanceSun} sun) to cover energy/bandwidth for a TRC20 transfer.`,
        feeEstimate: TRX_FEE_BUFFER_SUN / 1e6,
      };
    }

    const tx = await contract
      .transfer(toAddress, amountRaw)
      .send({ from: this.fromAddress, privateKey: this.privateKey });

    return { ok: true, txHash: tx as string, feeEstimate: 0 };
  }
}
