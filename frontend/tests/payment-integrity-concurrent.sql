-- Synthetic fixture only; used by two concurrent psql sessions.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
SELECT public.rk_payment_operation('00000000-0000-0000-0000-000000000077','record',
'{"dealId":"00000000-0000-0000-0000-000000000003","paymentDate":"2026-02-01","paymentMethod":"Cash","allocations":[{"dueDate":"2026-02-01","amountPaid":200,"expectedPaid":0,"expectedRemaining":500}]}');
SELECT pg_sleep(2);
COMMIT;
