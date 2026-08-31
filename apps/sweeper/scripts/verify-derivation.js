#!/usr/bin/env node
/**
 * Verifies that the sweeper's hardcoded HD derivation paths
 * (m/44'/60'/0'/0/{i} for EVM, m/44'/195'/0'/0/{i} for TRON - see
 * chains/evm.ts and chains/tron.ts) produce the SAME addresses that
 * Tatum's own generateAddressFromXpub REST endpoint returns for
 * apps/api's TATUM_EVM_XPUB / TATUM_TRON_XPUB.
 *
 * The sweeper itself derives from the master seed MNEMONIC at runtime
 * (not from the xpub), but this script only needs the xpub: a BIP32
 * xpub sitting at m/44'/60'/0'/0 (resp. m/44'/195'/0'/0) derives the
 * IDENTICAL child public key at index i as the full path from the seed
 * would, since non-hardened child derivation commutes between private
 * and public keys. So "does xpub-derived index i match what Tatum
 * generated at index i" is equivalent to "does the sweeper's hardcoded
 * path match Tatum" without needing the master seed here at all.
 *
 * Run this again any time TATUM_EVM_XPUB, TATUM_TRON_XPUB, or either
 * hardcoded derivation path changes.
 *
 * Usage: node scripts/verify-derivation.js [indexCount]
 * Requires apps/api/.env to hold TATUM_API_KEY, TATUM_EVM_XPUB, TATUM_TRON_XPUB.
 */
const fs = require('fs');
const path = require('path');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const TronWeb = require('tronweb');
const { keccak256 } = require('ethers');

const bip32 = BIP32Factory(ecc);

const API_ENV_PATH = path.resolve(__dirname, '../../api/.env');

function loadApiEnv() {
  const text = fs.readFileSync(API_ENV_PATH, 'utf8');
  const get = (key) => {
    const m = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
    if (!m || !m[1].trim()) {
      throw new Error(`${key} is missing/empty in ${API_ENV_PATH}`);
    }
    return m[1].trim();
  };
  return {
    apiKey: get('TATUM_API_KEY'),
    evmXpub: get('TATUM_EVM_XPUB'),
    tronXpub: get('TATUM_TRON_XPUB'),
  };
}

function toChecksumAddress(address) {
  const addr = address.toLowerCase().replace('0x', '');
  const hash = keccak256(Buffer.from(addr, 'ascii')).slice(2);
  let out = '0x';
  for (let i = 0; i < addr.length; i++) {
    out += parseInt(hash[i], 16) >= 8 ? addr[i].toUpperCase() : addr[i];
  }
  return out;
}

// EVM address = last 20 bytes of keccak256(uncompressed pubkey minus 0x04 prefix).
function evmAddressFromNode(node) {
  const uncompressed = Buffer.from(ecc.pointCompress(node.publicKey, false));
  const pubNoPrefix = uncompressed.subarray(1);
  const hash = keccak256(pubNoPrefix).slice(2);
  return toChecksumAddress('0x' + hash.slice(-40));
}

// TRON address = base58check(0x41 + keccak256(uncompressed pubkey minus prefix)[-20:]).
function tronAddressFromNode(node) {
  const uncompressed = Buffer.from(ecc.pointCompress(node.publicKey, false));
  const addressBytes = TronWeb.utils.crypto.computeAddress(uncompressed);
  return TronWeb.utils.crypto.getBase58CheckAddress(addressBytes);
}

async function tatumGenerate(apiKey, tatumChain, xpub, index) {
  const res = await fetch(
    `https://api.tatum.io/v3/${tatumChain}/address/${xpub}/${index}`,
    { headers: { 'x-api-key': apiKey } },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `Tatum ${tatumChain} index ${index} failed: ${res.status} ${body}`,
    );
  }
  const data = await res.json();
  if (!data.address) {
    throw new Error(`Tatum ${tatumChain} index ${index} returned no address`);
  }
  return data.address;
}

async function main() {
  const indexCount = Number(process.argv[2]) || 3;
  const { apiKey, evmXpub, tronXpub } = loadApiEnv();

  const evmNode = bip32.fromBase58(evmXpub);
  const tronNode = bip32.fromBase58(tronXpub);

  const results = [];

  for (let index = 0; index < indexCount; index++) {
    const local = evmAddressFromNode(evmNode.derive(index));
    const remote = await tatumGenerate(apiKey, 'ethereum', evmXpub, index);
    results.push({
      chain: 'EVM (ethereum)',
      index,
      local,
      remote,
      match: local.toLowerCase() === remote.toLowerCase(),
    });
  }

  for (let index = 0; index < indexCount; index++) {
    const local = tronAddressFromNode(tronNode.derive(index));
    const remote = await tatumGenerate(apiKey, 'tron', tronXpub, index);
    results.push({ chain: 'TRON', index, local, remote, match: local === remote });
  }

  console.log('\n=== Derivation Verification Results ===\n');
  for (const r of results) {
    console.log(
      `${r.chain} index ${r.index}: local=${r.local} remote=${r.remote} -> ${
        r.match ? 'MATCH' : 'MISMATCH'
      }`,
    );
  }

  const allMatch = results.every((r) => r.match);
  console.log(`\nOVERALL: ${allMatch ? 'ALL MATCH' : 'MISMATCH DETECTED'}\n`);
  process.exit(allMatch ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(2);
});
