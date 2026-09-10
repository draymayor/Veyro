// Gift card Offer schema is deliberately withheld entirely while Sell Gift
// Cards is locked platform-wide (the gift card API isn't integrated yet):
// schema.org's Offer type requires a price, and there is no real one to
// publish right now. Emitting a placeholder/stale rate here would be false
// advertising in search results even though the on-page UI correctly shows
// "Coming Soon". Re-add once real rates exist again.
export function giftCardOffersSchema(): { name: string }[] {
  return [];
}
