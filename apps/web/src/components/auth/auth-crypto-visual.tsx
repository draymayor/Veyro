import { OrbitRings } from "@/components/home/orbit-rings";
import { AssetIcon } from "@/components/crypto/asset-icon";
import type { TokenIconKey } from "@/lib/crypto/data";

const FLOATING_ASSETS: { iconKey: TokenIconKey; className: string }[] = [
  { iconKey: "BTC", className: "top-[10%] left-[18%] size-12" },
  { iconKey: "ETH", className: "top-[22%] right-[14%] size-10" },
  { iconKey: "USDT", className: "bottom-[30%] left-[10%] size-11" },
  { iconKey: "SOL", className: "right-[20%] bottom-[16%] size-10" },
  { iconKey: "BNB", className: "top-[46%] left-[42%] size-14" },
];

/**
 * Login panel's crypto-themed counterpart to the signup panel's gift card
 * fan. Reuses the homepage's orbit-rings backdrop and the crypto page's
 * real token icons rather than sourcing new artwork.
 */
export function AuthCryptoVisual() {
  return (
    <div className="relative flex h-[22rem] w-full items-center justify-center sm:h-[26rem]">
      <OrbitRings
        stroke="#FAF7F2"
        dot="#FAF7F2"
        className="absolute inset-0 m-auto size-[26rem] opacity-40"
      />
      {FLOATING_ASSETS.map((asset) => (
        <span
          key={asset.iconKey}
          className={`bg-background/10 absolute flex items-center justify-center rounded-full p-2.5 backdrop-blur-sm ${asset.className}`}
        >
          <AssetIcon iconKey={asset.iconKey} className="size-full" />
        </span>
      ))}
    </div>
  );
}
