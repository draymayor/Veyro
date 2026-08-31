-- Admin-adjustable margin applied to the live CoinGecko USD price before
-- FX conversion to a user's wallet currency (docs/product-rules.md's
-- crypto payout formula). Defaults to 3.0% until an admin UI exists to
-- change it per asset/network.
alter table public.crypto_assets
  add column margin_percentage numeric not null default 3.0;

-- Seed the V1 supported asset/network catalog (mirrors
-- apps/web/src/lib/crypto/data.ts) so the payout formula has real rows to
-- read margin_percentage and deposit_address from, instead of always
-- falling through to the application-level default.
insert into public.crypto_assets (symbol, network, deposit_address) values
  ('BTC', 'Bitcoin', 'bc1qveyro4x9k2m7hzq0pl6d3wjxr8n5vy2u7c9fae'),
  ('ETH', 'ERC20', '0xVeyro3f8A1c9E42d0B6a7F5e2C8d4B1a9F0e6C3D7'),
  ('USDT', 'TRC20', 'TVeyro9NpQ2xR7mK4vL1sD8fH6jY3gB5cA0eZwTn'),
  ('USDT', 'ERC20', '0xVeyro7B2d5F91a3C8e0D6b4A9f1E7c2D8b5A0F3C6'),
  ('BNB', 'BEP20', '0xVeyro1A6c3E80f2D9b5A7e4C1d8F0b6A3e9D2C5F8'),
  ('SOL', 'Solana', 'VeyroSoL8mK2pR4vN7xQ1sD9fH6jY3gB5cA0eZwTn'),
  ('XRP', 'XRP Ledger', 'rVeyroXrP9nK3mL6vQ2sD8fH1jY4gB7cA0eZwTnXR'),
  ('DOGE', 'Dogecoin', 'DVeyro8mK2pR4vN7xQ1sD9fH6jY3gB5cA0eZwTnDG')
on conflict (symbol, network) do nothing;
