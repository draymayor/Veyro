import { ChainAdapter, DepositAddress, SweepResult } from "./types";

// tronweb ships without first-party types for this constructor shape in
// some versions - kept as a require + minimal surface typing to avoid
// pulling in a mismatched @types package.
// tronweb@6's CommonJS export is an object with a named `TronWeb` property,
// not the constructor itself - `const TronWeb = require("tronweb")` gives
// the module namespace object, and `new TronWeb(...)` throws "TronWeb is
// not a constructor".
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TronWeb } = require("tronweb");

// Verified 2026-08-30 against Tronscan's own API (apilist.tronscanapi.com):
// name "Tether USD", symbol USDT, ~$40B/24h volume, 76M holders - genuine.
// (USDC-TRC20 was dropped entirely: the address this map used to hold for
// it, TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8, turned out to be tagged "USD
// Coin Old"/USDCOLD by Tronscan, not current USDC - Circle discontinued
// USDC on TRON in 2024/2025. See docs/planning-history.md's Sweeper
// section. USDC remains supported on ERC20/Arbitrum/Optimism/Base.)
const TRC20_CONTRACTS: Record<string, string> = {
  USDT: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
};

export interface TronConfig {
  fullHost: string;
}

/**
 * Derives TRON private keys from the master seed using TRON's own BIP44
 * coin type (195) - MUST match whatever path Tatum's generateAddressFromXpub
 * used for TATUM_TRON_XPUB; verify on testnet (Shasta/Nile) before relying
 * on this in production.
 */
export class TronAdapter implements ChainAdapter {
  private readonly tronWeb: any;
  private readonly masterSeed: string;

  constructor(config: TronConfig, masterSeedMnemonic: string) {
    this.tronWeb = new TronWeb({ fullHost: config.fullHost });
    this.masterSeed = masterSeedMnemonic;
  }

  private privateKeyFor(index: number): string {
    // TronWeb's fromMnemonic helper derives m/44'/195'/0'/0/{index} and
    // returns { privateKey, address }.
    const { privateKey } = this.tronWeb.fromMnemonic(
      this.masterSeed,
      `m/44'/195'/0'/0/${index}`,
    );
    return privateKey;
  }

  async getBalance(address: string, symbol: string): Promise<number> {
    if (symbol === "TRX") {
      const sun = await this.tronWeb.trx.getBalance(address);
      return sun / 1e6;
    }
    const contractAddress = TRC20_CONTRACTS[symbol];
    if (!contractAddress) throw new Error(`Unknown TRC20 token ${symbol}`);
    const contract = await this.tronWeb.contract().at(contractAddress);
    const raw: { toNumber: () => number } = await contract
      .balanceOf(address)
      .call();
    return raw.toNumber() / 1e6;
  }

  async sweep(
    deposit: DepositAddress,
    symbol: string,
    toAddress: string,
  ): Promise<SweepResult | null> {
    if (deposit.derivationIndex === null) {
      throw new Error(
        `TRON sweep requires a derivation index (got null for ${deposit.address})`,
      );
    }
    const privateKey = this.privateKeyFor(deposit.derivationIndex);

    if (symbol === "TRX") {
      const sunBalance = await this.tronWeb.trx.getBalance(deposit.address);
      const feeEstimate = 1_100_000; // ~1.1 TRX bandwidth/energy buffer for a plain transfer
      if (sunBalance <= feeEstimate) return null;

      const sendAmount = sunBalance - feeEstimate;
      const tx = await this.tronWeb.transactionBuilder.sendTrx(
        toAddress,
        sendAmount,
        deposit.address,
      );
      const signed = await this.tronWeb.trx.sign(tx, privateKey);
      const result: { txid: string } =
        await this.tronWeb.trx.sendRawTransaction(signed);

      return {
        txHash: result.txid,
        amountSwept: sendAmount / 1e6,
        feeEstimate: feeEstimate / 1e6,
      };
    }

    const contractAddress = TRC20_CONTRACTS[symbol];
    if (!contractAddress) throw new Error(`Unknown TRC20 token ${symbol}`);
    const contract = await this.tronWeb.contract().at(contractAddress);
    const raw: { toNumber: () => number } = await contract
      .balanceOf(deposit.address)
      .call();
    const balance = raw.toNumber();
    if (balance === 0) return null;

    // TRC20 transfers consume energy, paid from the sending address's TRX
    // (or bandwidth/energy delegation) - like the EVM token path, the
    // deposit address needs a small pre-funded TRX float for gas, handled
    // separately from this method.
    const tx = await contract
      .transfer(toAddress, balance)
      .send({ from: deposit.address, privateKey });

    return {
      txHash: tx,
      amountSwept: balance / 1e6,
      feeEstimate: 0,
    };
  }
}
