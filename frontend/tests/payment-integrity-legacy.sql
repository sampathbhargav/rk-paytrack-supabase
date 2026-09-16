-- Synthetic local fixture only. Never run against production.
BEGIN;
UPDATE rk_payment_private.configuration SET enabled=true WHERE id;
SELECT set_config('rk.payment_operation','v1',true);
INSERT INTO public.deals(id,deal_tag,total_amount,monthly_payment,start_date,due_day,term)
VALUES('00000000-0000-0000-0000-000000000006','TEST-LEGACY',500,500,'2026-01-01',1,1);
INSERT INTO public.payment_promises(id,deal_id,original_due_date,amount_due,amount_paid_now,remaining_amount,promised_date)
VALUES('00000000-0000-0000-0000-000000000060','00000000-0000-0000-0000-000000000006','2026-02-01',500,200,300,'2099-01-01');
INSERT INTO public.payments(id,deal_id,payment_date,due_date,amount_due,amount_paid,remaining_amount)
VALUES('00000000-0000-0000-0000-000000000061','00000000-0000-0000-0000-000000000006','2026-02-01','2026-02-01',500,200,300);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
DO $$
DECLARE v numeric; rejected bool:=false; n int;
BEGIN
 PERFORM public.rk_payment_operation(gen_random_uuid(),'void','{"dealId":"00000000-0000-0000-0000-000000000006","paymentId":"00000000-0000-0000-0000-000000000061","reason":"synthetic"}');
 SELECT remaining_amount INTO v FROM public.payment_promises WHERE id='00000000-0000-0000-0000-000000000060';
 ASSERT v=500,'initial unlinked payment must reconcile by installment';
 PERFORM set_config('rk.payment_operation','v1',true);
 INSERT INTO public.payments(id,deal_id,payment_date,amount_paid)
 VALUES('00000000-0000-0000-0000-000000000062','00000000-0000-0000-0000-000000000006','2026-02-01',25);
 BEGIN
  PERFORM public.rk_payment_operation(gen_random_uuid(),'void','{"dealId":"00000000-0000-0000-0000-000000000006","paymentId":"00000000-0000-0000-0000-000000000062","reason":"synthetic"}');
 EXCEPTION WHEN raise_exception THEN rejected:=true;
 END;
 ASSERT rejected,'ambiguous undated payment must not be guessed';
 SELECT count(*) INTO n FROM public.payments WHERE id='00000000-0000-0000-0000-000000000062' AND payment_status='Active';
 ASSERT n=1,'rejected void must preserve payment';
 RAISE NOTICE 'PASS: unlinked initial payment reconciliation and undated payment rejection';
END;
$$;
ROLLBACK;
