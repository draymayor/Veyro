import { addressKey } from "./address-map";

describe("addressKey", () => {
  it("lowercases EVM addresses (case-insensitive checksum casing)", () => {
    expect(
      addressKey("ERC20", "0xABCdef1234567890ABCdef1234567890ABCdef12"),
    ).toBe(addressKey("ERC20", "0xabcdef1234567890abcdef1234567890abcdef12"));
  });

  it("preserves case for TRON addresses (base58check is case-sensitive)", () => {
    const address = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
    const lowercased = address.toLowerCase();
    expect(addressKey("TRC20", address)).not.toBe(
      addressKey("TRC20", lowercased),
    );
  });

  it("preserves case for UTXO addresses (base58check is case-sensitive)", () => {
    const address = "bc1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4";
    const lowercased = address.toLowerCase();
    expect(addressKey("Bitcoin", address)).not.toBe(
      addressKey("Bitcoin", lowercased),
    );
  });

  it("scopes keys by network - the same address string on two networks never collides", () => {
    expect(addressKey("ERC20", "0xabc")).not.toBe(addressKey("BEP20", "0xabc"));
  });
});
