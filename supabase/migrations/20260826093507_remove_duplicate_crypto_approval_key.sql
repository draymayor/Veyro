-- Two conflicting platform_settings keys existed for the same setting:
-- crypto_withdrawal_requires_approval (singular "withdrawal") and
-- crypto_withdrawals_require_approval (plural "withdrawals"). Only the
-- singular key is read by the withdrawal creation logic
-- (apps/api/src/withdrawals/withdrawals.service.ts, product-rules.md rule
-- 18b), so the plural key was an orphaned duplicate that never affected
-- any actual withdrawal. Delete it.
delete from public.platform_settings
where key = 'crypto_withdrawals_require_approval';
