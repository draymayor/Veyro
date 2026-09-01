#!/usr/bin/env node
/**
 * Verifies that the proposed fixed derivation paths for
 * CONSOLIDATION_MASTER_SEED (m/44'/0'/0'/0/0 for BTC/LTC/DOGE,
 * m/44'/60'/0'/0/0 for EVM, m/44'/195'/0'/0/0 for TRON) actually produce
 * the 5 addresses already stored in consolidation_wallets.
 *
 * Run this ONLY on a machine you trust, ideally offline/air-gapped. The
 * mnemonic is read from an env var, used in-memory for this one process,
 * and never written to disk or logged. Do not paste the mnemonic into
 * chat, a ticket, or anywhere else - only the MATCH/MISMATCH output below
 * is safe to share.
 *
 * Usage (all EXPECTED_* are optional - omit any you don't have yet and
 * the script just prints the derived address without a verdict for it):
 *
 *   CONSOLIDATION_MASTER_SEED="word1 word2 ... word12" \
 *   EXPECTED_BTC="bc1q..." \
 *   EXPECTED_LTC="ltc1q..." \
 *   EXPECTED_DOGE="D..." \
 *   EXPECTED_EVM="0x..." \
 *   EXPECTED_TRON="T..." \
 *   node apps/sweeper/scripts/verify-consolidator-derivation.js
 *
 * Pull the EXPECTED_* values yourself from the consolidation_wallets
 * table (select chain, address from public.consolidation_wallets) -
 * this script never queries the database.
 */
const bitcoin = require('bitcoinjs-lib');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const { ethers } = require('ethers');
// tronweb@6's CommonJS export is an object with a named `TronWeb` property,
// not the constructor itself - `const TronWeb = require('tronweb')` gives
// you the module namespace object, and `new` on that throws "not a
// constructor".
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TronWeb } = require('tronweb');

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);

const LITECOIN_PARAMS = {
  network: {
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    bip32: { public: 0x019da462, private: 0x019d9cfe },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0,
  },
  addressType: 'p2wpkh',
};

const DOGECOIN_PARAMS = {
  network: {
    messagePrefix: '\x19Dogecoin Signed Message:\n',
    bech32: '',
    bip32: { public: 0x02facafd, private: 0x02fac398 },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e,
  },
  addressType: 'p2pkh',
};

const BITCOIN_PARAMS = { network: bitcoin.networks.bitcoin, addressType: 'p2wpkh' };

function utxoAddress(seedHexNo0x, params, path) {
  const root = bip32.fromSeed(Buffer.from(seedHexNo0x, 'hex'), params.network);
  const node = root.derivePath(path);
  const payment =
    params.addressType === 'p2pkh'
      ? bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: params.network })
      : bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network: params.network });
  return payment.address;
}

function report(chain, path, derived, expectedEnvVar) {
  const expected = process.env[expectedEnvVar];
  if (!expected) {
    console.log(`${chain} (${path}): derived=${derived}  (no ${expectedEnvVar} set - skipped verdict)`);
    return null;
  }
  const match = derived.toLowerCase() === expected.toLowerCase();
  console.log(
    `${chain} (${path}): derived=${derived} expected=${expected} -> ${match ? 'MATCH' : 'MISMATCH'}`,
  );
  return match;
}

async function main() {
  const phrase = process.env.CONSOLIDATION_MASTER_SEED;
  if (!phrase) {
    console.error('Set CONSOLIDATION_MASTER_SEED (the mnemonic) in the environment, not as an argument.');
    process.exit(2);
  }

  const seedHex = ethers.Mnemonic.fromPhrase(phrase).computeSeed().slice(2);
  const results = [];

  // Round 2: Trust Wallet's actual defaults, not Tatum's coin-type-0-for-
  // everything convention the sweeper uses. Native segwit (bech32, bc1q.../
  // ltc1q...) pairs with BIP-84, not BIP-44; Litecoin and Dogecoin use their
  // own SLIP-44 coin types (2 and 3), not Bitcoin's (0).
  results.push(
    report('BTC', "m/84'/0'/0'/0/0", utxoAddress(seedHex, BITCOIN_PARAMS, "m/84'/0'/0'/0/0"), 'EXPECTED_BTC'),
  );
  results.push(
    report('LTC', "m/84'/2'/0'/0/0", utxoAddress(seedHex, LITECOIN_PARAMS, "m/84'/2'/0'/0/0"), 'EXPECTED_LTC'),
  );
  results.push(
    report('DOGE', "m/44'/3'/0'/0/0", utxoAddress(seedHex, DOGECOIN_PARAMS, "m/44'/3'/0'/0/0"), 'EXPECTED_DOGE'),
  );

  // fromPhrase() already returns the node AT its default path
  // (m/44'/60'/0'/0/0) - do not call derivePath() again on the result,
  // that re-applies the path onto an already-depth-5 node and throws.
  const evmPath = "m/44'/60'/0'/0/0";
  const evmWallet = ethers.HDNodeWallet.fromPhrase(phrase, undefined, evmPath);
  results.push(report('EVM', evmPath, evmWallet.address, 'EXPECTED_EVM'));

  const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });
  const { address: tronAddress } = tronWeb.fromMnemonic(phrase, "m/44'/195'/0'/0/0");
  results.push(report('TRON', "m/44'/195'/0'/0/0", tronAddress, 'EXPECTED_TRON'));

  const verdicts = results.filter((r) => r !== null);
  if (verdicts.length === 0) {
    console.log('\nNo EXPECTED_* values were set - nothing to verify, addresses only printed above.');
    process.exit(0);
  }
  const allMatch = verdicts.every(Boolean);
  console.log(`\nOVERALL: ${allMatch ? 'ALL MATCH' : 'MISMATCH DETECTED'} (${verdicts.length}/5 chains checked)\n`);
  process.exit(allMatch ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(2);
});
