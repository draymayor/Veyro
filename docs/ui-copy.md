# Veyro — UI Copy

Reference copy for consistent tone across the app. Tone: warm, clear, confidence-building — never jargon-heavy, never alarming.

## Nav

- Dropdown trigger label: "Menu"
- Dropdown items (card tiles, label plus short blurb):
  - Gift Cards: "Sell gift cards for cash"
  - Crypto: "Sell crypto for cash"
  - FAQ: "Answers to common questions"
  - Contact Us: "Get in touch with our team"
- Auth actions (outside dropdown): "Log In" / "Get Started"

## Homepage / Hero

- Headline: "Turn gift cards and crypto into cash."
- Subhead: "See your rate instantly. Get paid the moment we confirm."
- Primary CTAs: "Sell a Gift Card" / "Sell Crypto"
- Secondary CTA: "Create Account"

## How It Works (public page)

1. Create your account
2. Select your gift card or crypto
3. See your rate instantly
4. Submit your card or send your crypto
5. We confirm
6. Your wallet is credited
7. Withdraw your money

## Sell Flow

- Asset selector label: "What are you selling?" → Gift Card | Crypto
- Rate display: "You'll receive" (large, prominent) — never "Estimated" once a rate is locked to a specific submission; use "Estimated payout" only before submission, "Locked rate" after.
- Rate disclaimer (small caption near rate): "Rates may change until your card or deposit is confirmed."
- Gift card code entry: "Enter your gift card code" / "PIN (if applicable)"
- Gift card image upload: "Upload photos of your card"
- Crypto deposit screen: "Send [asset] to this address" / "Paste your transaction hash" / "Upload proof of deposit"
- Submit button: "Submit for Review"

## Trade Status Labels

- `Awaiting Deposit Confirmation` (crypto only) — "We're waiting for your deposit to arrive."
- `Under Review` — "Your submission is being verified."
- `Approved` — "Verified! Funds added to your wallet."
- `Rejected` — "This submission couldn't be approved." (always paired with a reason)
- `Paid` — "Payout complete."

## Wallet

- Balance label: "Wallet Balance"
- Withdraw CTA: "Withdraw"
- Withdraw method selector: "How would you like to get paid?" → Bank Transfer | PayPal | Crypto
- Bank transfer form intro: "Enter your bank details below." (fields adapt per country)
- Confirmation after withdrawal request: "Your withdrawal is on its way."

## Empty States

- No transactions yet: "You haven't sold anything yet. Ready to turn a card or coin into cash?"
- No referrals yet: "Invite friends and earn when they trade."
- No notifications yet (All tab): "You're all caught up. We'll let you know when something changes."
- No trade notifications yet: "No trade notifications yet. We'll let you know when a submission's status changes."
- No wallet notifications yet: "No wallet notifications yet. We'll let you know when a withdrawal's status changes."
- No referral notifications yet: "No referral notifications yet. Invite friends and earn when they trade."
- No account notifications yet: "No account notifications yet. We'll let you know about anything security-related here."
- No support messages yet: "Have a question? Send us a message and our team will get back to you." (Support page's live chat, first-visit state)

## Errors

- Generic submission error: "Something went wrong on our end. Please try again."
- 404 page: "Page not found" / "The page you're looking for doesn't exist or may have moved."
- Route error boundary (error.tsx, global-error.tsx): reuses the generic submission error copy above, paired with a "Try Again" button.
- Card/crypto rejected: paired with specific reason, e.g. "This card's balance couldn't be verified." / "We couldn't confirm this deposit — please check the transaction hash."
- Rate expired/changed: "This rate has changed. Please review the updated rate before continuing."

## Gift Cards (public page)

- Hero eyebrow (small caption): "Platform Rates · 9 brands and counting"
- Hero headline: "Sell any gift card. Get paid instantly."
- Hero subhead: "Pick your brand, see the rate, and get paid the moment we confirm."
- Rate browser eyebrow: "Gift Card Rates"
- Rate browser headline: "Find your brand, see your rate"
- Rate browser subhead: "Filter by country or card type, or search for your brand directly."
- Search placeholder: "Search brands..."
- Filter group labels: "Country" / "Type"
- Type filter options: "All" / "Physical" / "E-code"
- Empty filter state: "No brands match your filters. Try clearing a filter or searching a different name."
- Rate disclaimer (below grid): "Platform Rates shown are subject to confirmation at submission time."
- Process strip headline: "From card to cash in four steps"
- Process steps: "Pick your card" / "See your rate" / "Submit your code or photos" / "Get paid"
- FAQ headline: "Gift card questions"
- FAQ: "Which gift card brands do you accept?" Answer: "We accept Amazon, Steam, Apple, Google Play, PlayStation, Xbox, Razer Gold, Sephora, Walmart, and more. Search or filter above to see current rates for your brand."
- FAQ: "What's the difference between physical and e-code cards?" Answer: "A physical card has a code printed on the back or under a scratch panel. An e-code is delivered by email or receipt only, with no physical card attached. Both are accepted, and rates can differ between the two."
- FAQ: "How long does verification take?" Answer: "Most submissions are reviewed within minutes. Some cards take longer if we need to confirm the balance with the issuer."
- FAQ: "What happens if my card is rejected?" Answer: "You'll see the reason directly on your submission. Common reasons include an incorrect code, a card that's already been used, or a balance we can't verify."
- FAQ: "When do I get paid?" Answer: "The moment your submission is approved, the payout is added to your Veyro wallet automatically. From there you can withdraw by bank transfer, PayPal, or crypto."
- FAQ: "Are these rates guaranteed?" Answer: "Rates shown are Platform Rates and can change. The rate is locked in the moment you submit, so what you see is what you get once verification is complete."
- Final CTA banner headline: "Ready to sell your first gift card?"
- Final CTA banner subhead: "Pick a brand above, see your rate, and get paid the moment we confirm."
- Final CTA button: "Get Started"

## Crypto (public page)

- Hero headline: "Sell your crypto. Get paid the moment we confirm."
- Hero subhead: "Pick your asset and network, see the rate, and send from any wallet."
- Rate browser eyebrow: "Crypto Rates"
- Rate browser headline: "Pick your asset, see your rate"
- Rate browser subhead: "Search for an asset below. Where more than one network is supported, switch between them to see how the rate changes."
- Search placeholder: "Search assets..."
- Empty filter state: "No assets match "[query]". Try a different symbol or name."
- Rate disclaimer (below grid): "Platform Rates shown are subject to confirmation at submission time."
- Process headline: "How crypto selling works on Veyro"
- Process steps: "Select your asset and network" / "See your rate" / "We show you our deposit address" / "You send your crypto" / "Submit your proof of deposit" / "We confirm on-chain" / "Your wallet is credited"
- FAQ headline: "Crypto questions"
- FAQ: "Which crypto assets and networks do you support?" Answer: "We accept Bitcoin, Ethereum, Tether (USDT), BNB, Solana, XRP, and Dogecoin. Where an asset supports more than one network, like USDT on TRC20 or ERC20, you'll choose the exact network above before you see your deposit address."
- FAQ: "How long does confirmation take?" Answer: "Once your deposit reaches our address and you've submitted your transaction hash and screenshot, most confirmations happen within minutes. Busier networks can take longer to reach enough confirmations."
- FAQ: "What happens if I send on the wrong network?" Answer: "Sending on a network we don't support for that asset, or a network that doesn't match the address type, can mean those funds are lost permanently. Always match the network shown on the page to the network you're sending from."
- FAQ: "Is there a minimum amount I can sell?" Answer: "Yes, minimums vary by asset and are shown at the point of submission so you always know before you send anything."
- FAQ: "When do I get paid after my deposit is confirmed?" Answer: "The moment we confirm your deposit on-chain, the payout is added to your Veyro wallet automatically. From there you can withdraw by bank transfer, PayPal, or crypto."
- FAQ: "Are these rates guaranteed?" Answer: "Rates shown are Platform Rates and can change. The rate is locked in the moment you submit, so what you see is what you get once your deposit is confirmed."
- Final CTA banner headline: "Ready to sell your crypto?"
- Final CTA banner subhead: "Pick your asset above, see your rate, and get paid the moment we confirm your deposit."
- Final CTA button: "Get Started"

## Referrals / Leaderboard

- Referral page headline: "Earn by inviting others."
- Referral CTA: "Share your link"
- Leaderboard Trading panel headline: "Top Traders"
- Leaderboard Referrals panel headline: "Top Referrers"
- Leaderboard ranking period label: "This Week"
- Leaderboard teaser card button: "View Referrals"
- Viewer's own row, when pinned outside the visible ranked list: "You: #[rank]"

## Homepage (below the fold)

- Trust badge (hero, small caption): "Platform Rates · Instant Wallet Payout"
- Stats strip labels: "Trades completed" / "Brands & assets supported" / "Average payout time" / "Approval rate"
- How It Works section eyebrow: "How It Works"
- How It Works subhead: "Seven steps from submission to payout, no surprises in between."
- How It Works link-out: "See the full walkthrough"
- Rate showcase headline: "See what your assets are worth"
- Rate showcase subhead: "A sample of today's Platform Rates. Rates fluctuate and are subject to confirmation at submission time."
- Rate showcase link-out: "View all rates"
- Why Veyro headline: "Why Veyro"
- Why Veyro subhead: "Built to make selling gift cards and crypto feel effortless."
- Value prop (Instant payout): "Once your card or crypto is confirmed, your wallet is credited automatically. No waiting around."
- Value prop (Wide brand & crypto support): "Dozens of gift card brands and major crypto assets, all in one place, all one flow."
- Value prop (Transparent rates): "See exactly what you'll receive before you submit anything. No hidden markdowns."
- Value prop (Secure verification): "Every submission is reviewed by our team before your wallet is credited, keeping trades safe."
- Final CTA banner headline: "Ready to turn what you have into cash?"
- Final CTA banner subhead: "Create your free Veyro account and see your rate before you submit anything."
- Footer tagline: "Turn gift cards and crypto into cash. See your rate instantly, get paid the moment we confirm."
- Footer legal note: "Platform Rates shown are subject to confirmation at submission time."
