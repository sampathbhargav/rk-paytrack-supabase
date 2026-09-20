-- Run against the affected project. Returns amounts only; no customer PII.
BEGIN TRANSACTION READ ONLY;
DO $unique_deal$
BEGIN
 IF (SELECT count(*) FROM public.deals WHERE deal_tag='1490')<>1 THEN
  RAISE EXCEPTION 'Expected exactly one deal tagged 1490';
 END IF;
END;
$unique_deal$;
SELECT d.deal_tag, s.leaf_status, s.gross AS installment_amount,
       s.paid AS valid_installment_paid, s.remaining AS installment_remaining
FROM public.deals d
CROSS JOIN LATERAL rk_payment_private.promise_state(d.id,DATE '2026-10-14') s
WHERE d.deal_tag='1490';
ROLLBACK;
-- Historical screenshot baseline BEFORE later transactions: 1334.80 / 436.20 / 898.60.
-- After successful payments/voids, current values will differ. Do not reset them
-- to match this example. This is a post-install check, not a repair script.
-- No rows or an exception means STOP; do not bypass checks or change amounts.
