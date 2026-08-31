-- Gift card brand + rate seed data, mirroring the placeholder catalog that
-- was previously hardcoded only in apps/web/src/lib/gift-cards/data.ts
-- (rates are illustrative "Platform Rates" per docs/admin-guide.md, not
-- live market data). This lets the actual sell flow (quote + trade
-- creation) resolve a real gift_card_rates row instead of trusting a
-- client-computed payout. The public catalog/browse pages keep using the
-- existing frontend constants unchanged, this seed only backs the
-- submission endpoints.

-- A slug gives the sell flow a stable, human-readable key to look up a
-- brand by, matching the ids already used in the frontend catalog
-- constants, instead of requiring the client to know a raw uuid.
alter table public.gift_card_brands add column slug text unique;

insert into public.gift_card_brands (name, slug, is_active) values
  ('Amazon', 'amazon', true),
  ('Steam', 'steam', true),
  ('Apple', 'apple', true),
  ('Google Play', 'google-play', true),
  ('PlayStation', 'playstation', true),
  ('Xbox', 'xbox', true),
  ('Razer Gold', 'razer-gold', true),
  ('Sephora', 'sephora', true),
  ('Walmart', 'walmart', true);

insert into public.gift_card_rates
  (brand_id, country, card_type, min_denomination, max_denomination, rate, currency, is_active)
values
  ((select id from public.gift_card_brands where slug = 'amazon'), 'US', 'e-code', 10, 500, 1080, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'amazon'), 'US', 'physical', 25, 200, 1020, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'amazon'), 'GB', 'e-code', 10, 500, 1060, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'amazon'), 'CA', 'e-code', 10, 300, 1010, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'amazon'), 'DE', 'e-code', 15, 300, 990, 'NGN', true),

  ((select id from public.gift_card_brands where slug = 'steam'), 'US', 'e-code', 5, 100, 1050, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'steam'), 'US', 'physical', 10, 100, 1000, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'steam'), 'GB', 'e-code', 5, 100, 1030, 'NGN', true),

  ((select id from public.gift_card_brands where slug = 'apple'), 'US', 'physical', 25, 500, 1120, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'apple'), 'US', 'e-code', 10, 500, 1140, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'apple'), 'CA', 'e-code', 10, 300, 1080, 'NGN', true),

  ((select id from public.gift_card_brands where slug = 'google-play'), 'US', 'e-code', 10, 200, 1000, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'google-play'), 'US', 'physical', 15, 200, 950, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'google-play'), 'GB', 'e-code', 10, 200, 970, 'NGN', true),

  ((select id from public.gift_card_brands where slug = 'playstation'), 'US', 'e-code', 10, 100, 1030, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'playstation'), 'US', 'physical', 20, 100, 990, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'playstation'), 'GB', 'e-code', 10, 100, 1010, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'playstation'), 'CA', 'physical', 25, 100, 960, 'NGN', true),

  ((select id from public.gift_card_brands where slug = 'xbox'), 'US', 'e-code', 10, 100, 1015, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'xbox'), 'US', 'physical', 15, 100, 965, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'xbox'), 'GB', 'e-code', 10, 100, 985, 'NGN', true),

  ((select id from public.gift_card_brands where slug = 'razer-gold'), 'Global', 'e-code', 10, 200, 930, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'razer-gold'), 'US', 'e-code', 10, 200, 950, 'NGN', true),

  ((select id from public.gift_card_brands where slug = 'sephora'), 'US', 'physical', 25, 250, 900, 'NGN', true),

  ((select id from public.gift_card_brands where slug = 'walmart'), 'US', 'physical', 25, 300, 970, 'NGN', true),
  ((select id from public.gift_card_brands where slug = 'walmart'), 'US', 'e-code', 25, 300, 990, 'NGN', true);
