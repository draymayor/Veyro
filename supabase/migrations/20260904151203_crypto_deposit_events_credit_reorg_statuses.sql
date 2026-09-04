-- Piece 3 of webhook-based deposit auto-crediting (see
-- 20260904135512_webhook_deposit_detection.sql for the original table):
-- two new crypto_deposit_events.status values.
--
-- 'crediting': a claim state, not a wait state. The confirmation-depth
-- poller conditionally UPDATEs a row from 'pending_confirmation' to
-- 'crediting' (WHERE status = 'pending_confirmation', exactly 1 row
-- affected) BEFORE calling CryptoWalletService.creditWallet - this is
-- what actually serializes concurrent poller instances against each
-- other (Cloud Run here can scale beyond one instance, per
-- docs/deployment.md's existing ThrottlerModule caveat), since claiming
-- AFTER crediting would let two instances both pass a plain read-check
-- and both credit before either updates status. A row stuck in
-- 'crediting' (the credit call itself failed after the claim succeeded)
-- is never picked up again by the normal 'pending_confirmation' poll
-- query, so it can never be double-credited - it needs a stuck-state
-- recovery pass, not a fresh insert.
--
-- 'orphaned_reorg_unrecoverable': distinct from 'orphaned_reorg' (a
-- clean reversal: the user still had the credited balance, debitWallet
-- succeeded). This is the rare case where the user already
-- sold/withdrew the credited amount before the reorg was caught, so the
-- debit itself would fail (insufficient balance) - deliberately NOT
-- auto-resolved as a negative balance or silently written off. Surfaced
-- to admin for an actual recovery/write-off decision, never a silent
-- log line.
alter table public.crypto_deposit_events
  drop constraint crypto_deposit_events_status_check;

alter table public.crypto_deposit_events
  add constraint crypto_deposit_events_status_check
  check (status in ('pending_confirmation', 'crediting', 'credited', 'orphaned_reorg', 'orphaned_reorg_unrecoverable'));
