-- Synthetic staging/local database ONLY. All records roll back.
-- The caller must set request.jwt.claim.sub to a synthetic authenticated user.
BEGIN;
INSERT INTO public.deals(id,deal_tag,total_amount,monthly_payment,start_date,due_day,term)
VALUES('00000000-0000-0000-0000-000000000091','SKIP-RPC-REGRESSION',500,500,'2026-08-31',31,1);
INSERT INTO public.payment_skips(deal_id,original_due_date,installment_no,amount_due,skip_status)
VALUES('00000000-0000-0000-0000-000000000091','2026-09-30',1,500,'Active');
SET LOCAL ROLE authenticated;
DO $$
DECLARE
 d uuid:='00000000-0000-0000-0000-000000000091';
 request uuid:=gen_random_uuid(); bad_request uuid:=gen_random_uuid();
 payload jsonb; result jsonb; first_payment uuid; root uuid;
 before_skips jsonb; rejected boolean:=false;
BEGIN
 SELECT jsonb_agg(to_jsonb(s) ORDER BY id) INTO before_skips FROM public.payment_skips s WHERE deal_id=d;
 payload:=jsonb_build_object('dealId',d,'paymentDate','2026-09-16','paymentMethod','Cash','allocations',
  jsonb_build_array(jsonb_build_object('dueDate','2026-10-31','amountPaid',200,'expectedPaid',0,'expectedRemaining',500,'promisedDate','2099-01-01')));
 -- Force failure after the valid first allocation would have inserted payment/promise.
 BEGIN
  PERFORM public.rk_payment_operation(bad_request,'record',jsonb_set(payload,'{allocations}',
   (payload->'allocations')||jsonb_build_array(jsonb_build_object('dueDate','2026-11-30','amountPaid',100,'expectedPaid',0,'expectedRemaining',500))));
 EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 ASSERT rejected,'invalid second allocation must fail';
 ASSERT NOT EXISTS(SELECT 1 FROM public.payments WHERE deal_id=d),'payment rolled back';
 ASSERT NOT EXISTS(SELECT 1 FROM public.payment_promises WHERE deal_id=d),'promise rolled back';
 ASSERT NOT EXISTS(SELECT 1 FROM rk_payment_private.operations WHERE request_id=bad_request),'ledger rolled back';
 ASSERT NOT EXISTS(SELECT 1 FROM rk_payment_private.obligations WHERE deal_id=d),'obligation capture rolled back';
 result:=public.rk_payment_operation(request,'record',payload);
 first_payment:=(result#>>'{payments,0,id}')::uuid;
 root:=(result#>>'{payments,0,promise_id}')::uuid;
 ASSERT (result->>'totalPaid')::numeric=200 AND (result->>'balance')::numeric=300,'partial totals';
 ASSERT result=public.rk_payment_operation(request,'record',payload),'same request replays identical result';
 ASSERT (SELECT count(*) FROM public.payments WHERE deal_id=d)=1,'retry does not duplicate';
 ASSERT (SELECT remaining_amount FROM public.payment_promises WHERE id=root)=300,'promise remaining 300';
 result:=public.rk_payment_operation(gen_random_uuid(),'promise_paid',jsonb_build_object('dealId',d,'promiseId',root,
  'expectedRemaining',300,'paymentDate','2026-09-16','paymentMethod','Cash'));
 ASSERT result->>'dealStatus'='Paid Off' AND (result->>'balance')::numeric=0,'promise payoff';
 ASSERT (SELECT count(*) FROM public.payments WHERE deal_id=d)=2,'separate payment accepted';
 result:=public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,'paymentId',first_payment,'reason','synthetic regression'));
 ASSERT result->>'dealStatus'='Active' AND (result->>'balance')::numeric=200,'paid-off reopening';
 ASSERT (SELECT remaining_amount FROM public.payment_promises WHERE id=root)=200,'void uses valid remaining payment';
 ASSERT before_skips=(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM public.payment_skips s WHERE deal_id=d),'skip metadata unchanged';
 ASSERT NOT has_function_privilege('anon','public.rk_payment_operation(uuid,text,jsonb)','EXECUTE'),'anonymous mutation denied';
END $$;
ROLLBACK;
SELECT 'PASS: skipped installment partial, promise payoff, replay, separate payment, void reopening, atomic rollback, unchanged skips' AS result;
