-- Fraud Review duplicate detection (docs/admin-guide.md's Fraud Review
-- section, docs/product-rules.md rule 17): flag a repeated card code or a
-- near-duplicate card image for manual review. Flagged trades are never
-- auto-rejected or auto-approved, this only surfaces a note in the admin
-- Trade Review queue for a human to weigh.

alter table public.trade_files add column image_phash text;

-- Narrows the candidate set the upload endpoint scans for a perceptual
-- match to rows that actually have a hash. Hamming distance between two
-- hashes isn't something a plain btree can index, so the actual distance
-- comparison still happens in application code against this narrowed set.
create index on public.trade_files (image_phash) where image_phash is not null;

alter table public.trades add column fraud_flagged boolean not null default false;
alter table public.trades add column fraud_flag_reason text;
alter table public.trades add column fraud_flag_ref_trade_id uuid references public.trades(id);

-- Case/whitespace-insensitive lookup for the card-code duplicate check:
-- the same code re-entered with different casing or stray spaces should
-- still match an earlier submission.
create index on public.trades (lower(trim(card_code))) where card_code is not null;
create index on public.trades (fraud_flagged) where fraud_flagged;
