import type { SupabaseClient } from "@supabase/supabase-js";
import { EVM_CHAINS } from "./chain-config";

export interface TrackedAddress {
  userId: string;
  symbol: string;
}

const EVM_NETWORKS = new Set(EVM_CHAINS.map((c) => c.network));

/**
 * EVM addresses are case-insensitive (checksum casing is cosmetic) so keys
 * are lowercased for those networks; every other supported network (BTC/LTC/
 * DOGE base58check, TRON base58check) is case-sensitive - lowercasing those
 * would map a real address to a key nothing will ever match.
 */
function normalizeAddress(network: string, address: string): string {
  return EVM_NETWORKS.has(network) ? address.toLowerCase() : address;
}

export function addressKey(network: string, address: string): string {
  return `${network}:${normalizeAddress(network, address)}`;
}

/**
 * In-memory Map<"<network>:<normalized-address>", TrackedAddress[]> - an
 * array per key because one address can carry several symbols on the same
 * network (e.g. an EVM address holds ETH, USDT-ERC20 and USDC-ERC20
 * simultaneously; user_crypto_addresses has one row per symbol, all sharing
 * that address). Refreshed wholesale on an interval (see main.ts) rather
 * than incrementally - user_crypto_addresses grows slowly relative to block
 * frequency, so a full re-read every ADDRESS_MAP_REFRESH_MS is simpler than
 * tracking inserts and cheap enough at this data volume (see the Strategy 3
 * design writeup's point 2 on scaling this lookup).
 */
export class AddressMap {
  private map = new Map<string, TrackedAddress[]>();
  private size = 0;

  constructor(private readonly supabase: SupabaseClient) {}

  async refresh(): Promise<void> {
    const { data, error } = await this.supabase
      .from("user_crypto_addresses")
      .select("user_id, symbol, network, address");

    if (error) {
      throw new Error(`Failed to refresh address map: ${error.message}`);
    }

    const next = new Map<string, TrackedAddress[]>();
    for (const row of data ?? []) {
      const key = addressKey(row.network as string, row.address as string);
      const entry: TrackedAddress = {
        userId: row.user_id as string,
        symbol: row.symbol as string,
      };
      const existing = next.get(key);
      if (existing) existing.push(entry);
      else next.set(key, [entry]);
    }

    this.map = next;
    this.size = data?.length ?? 0;
  }

  lookup(network: string, address: string): TrackedAddress[] | undefined {
    return this.map.get(addressKey(network, address));
  }

  get trackedAddressCount(): number {
    return this.size;
  }
}
