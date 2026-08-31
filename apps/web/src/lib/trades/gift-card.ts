import { authFetch } from "@/lib/api-client";
import type { CardType } from "@/lib/gift-cards/data";

export interface CreateGiftCardTradeInput {
  brandSlug: string;
  country: string;
  cardType: CardType;
  amount: number;
  cardCode?: string;
  cardPin?: string;
}

export interface GiftCardTrade {
  id: string;
  status: string;
  asset_type: string;
  quoted_payout: number;
  currency: string;
  created_at: string;
}

export interface TradeFile {
  id: string;
  file_type: string;
  storage_path: string;
  created_at: string;
}

/** POST /trades/gift-card - locks the rate and creates the trade (docs/api-spec.md). */
export function createGiftCardTrade(
  input: CreateGiftCardTradeInput,
): Promise<GiftCardTrade> {
  return authFetch<GiftCardTrade>("/trades/gift-card", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * POST /trades/:tradeId/files - multipart upload of a card photo or
 * receipt. Runs server-side perceptual-hash duplicate detection for
 * card_image uploads (docs/admin-guide.md's Fraud Review section).
 */
export function uploadTradeFile(
  tradeId: string,
  fileType: "card_image" | "receipt",
  file: File,
): Promise<TradeFile> {
  const formData = new FormData();
  formData.append("fileType", fileType);
  formData.append("file", file);

  return authFetch<TradeFile>(`/trades/${tradeId}/files`, {
    method: "POST",
    body: formData,
  });
}
