-- Only run in the synthetic local fixture database. Entire test rolls back.
BEGIN;
UPDATE rk_payment_private.configuration SET enabled=true WHERE id;
SELECT set_config('rk.payment_operation','v1',true);
INSERT INTO public.deals(id,deal_tag,total_amount,monthly_payment,start_date,due_day,term)
VALUES('00000000-0000-0000-0000-000000000001','TEST-PROMISE',500,500,'2026-01-01',1,1),
('00000000-0000-0000-0000-000000000002','TEST-SPLIT',1000,500,'2026-01-01',1,2);
INSERT INTO public.payment_promises(id,deal_id,original_due_date,amount_due,amount_paid_now,remaining_amount,promised_date)
VALUES('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','2026-02-01',500,0,500,'2099-01-01');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
DO $$
DECLARE
 d uuid:='00000000-0000-0000-0000-000000000001';
 root uuid:='00000000-0000-0000-0000-000000000010';
 result jsonb;
 payment_200 uuid;
 payment_100 uuid;
 child uuid;
 v numeric;
 status text;
 payload jsonb;
BEGIN
 payload:=jsonb_build_object('dealId',d,'paymentDate','2026-02-01','paymentMethod','Cash','allocations',
   jsonb_build_array(jsonb_build_object('dueDate','2026-02-01','amountPaid',200,'expectedPaid',0,'expectedRemaining',500,'promisedDate','2099-01-01')));
 result:=public.rk_payment_operation(gen_random_uuid(),'record',payload);
 payment_200:=(result#>>'{payments,0,id}')::uuid;
 SELECT remaining_amount INTO v FROM public.payment_promises WHERE id=root;
 ASSERT v=300,'first partial leaves 300';
 payload:=jsonb_set(jsonb_set(jsonb_set(payload,'{allocations,0,amountPaid}','100'),'{allocations,0,expectedPaid}','200'),'{allocations,0,expectedRemaining}','300');
 result:=public.rk_payment_operation(gen_random_uuid(),'record',payload);
 payment_100:=(result#>>'{payments,0,id}')::uuid;
 result:=public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,'paymentId',payment_200,'reason','synthetic test'));
 SELECT remaining_amount INTO v FROM public.payment_promises WHERE id=root;
 ASSERT v=400,'void recomputes from the remaining 100 payment';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,'paymentId',payment_200,'reason','repeat'));
 SELECT remaining_amount INTO v FROM public.payment_promises WHERE id=root;
 ASSERT v=400,'repeated void must not add twice';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,'paymentId',payment_100,'reason','test'));
 SELECT remaining_amount INTO v FROM public.payment_promises WHERE id=root;
 ASSERT v=500,'multiple voids restore gross amount';
 result:=public.rk_payment_operation(gen_random_uuid(),'promise_partial',jsonb_build_object('dealId',d,'promiseId',root,
   'expectedRemaining',500,'amountPaid',200,'paymentDate','2026-02-01','paymentMethod','Cash','newPromisedDate','2099-02-01'));
 payment_200:=(result#>>'{payments,0,id}')::uuid;
 SELECT id INTO child FROM public.payment_promises WHERE parent_promise_id=root;
 ASSERT child IS NOT NULL,'partial creates replacement';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,'paymentId',payment_200,'reason','test'));
 SELECT remaining_amount INTO v FROM public.payment_promises WHERE id=child;
 ASSERT v=500,'ancestor payment void reconciles current leaf';
 SELECT promise_status INTO status FROM public.payment_promises WHERE id=root;
 ASSERT status='Partial Paid','historical parent is not revived';
 result:=public.rk_payment_operation(gen_random_uuid(),'promise_paid',jsonb_build_object('dealId',d,'promiseId',child,
   'expectedRemaining',500,'paymentDate','2026-02-01','paymentMethod','Cash'));
 payment_200:=(result#>>'{payments,0,id}')::uuid;
 SELECT remaining_amount INTO v FROM public.payment_promises WHERE id=child;
 ASSERT v=0,'mark paid sets remaining to zero';
 SELECT deals.status INTO status FROM public.deals WHERE id=d;
 ASSERT status='Paid Off','promise payment updates deal status atomically';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,'paymentId',payment_200,'reason','test'));
 SELECT remaining_amount INTO v FROM public.payment_promises WHERE id=child;
 ASSERT v=500,'void reopens paid leaf';
 RAISE NOTICE 'PASS: partials, repeated/multiple voids, ancestor void, paid-off reversal';
END;
$$;
DO $$
DECLARE
 d uuid:='00000000-0000-0000-0000-000000000002';
 request uuid:=gen_random_uuid();
 result jsonb;
 again jsonb;
 payload jsonb;
 n int;
 rejected bool:=false;
BEGIN
 payload:=jsonb_build_object('dealId',d,'paymentDate','2026-02-01','paymentMethod','Cash','allocations',jsonb_build_array(
  jsonb_build_object('dueDate','2026-02-01','amountPaid',500,'expectedPaid',0,'expectedRemaining',500),
  jsonb_build_object('dueDate','2026-03-01','amountPaid',600,'expectedPaid',0,'expectedRemaining',500)));
 BEGIN
  PERFORM public.rk_payment_operation(request,'record',payload);
 EXCEPTION WHEN raise_exception THEN rejected:=true;
 END;
 ASSERT rejected,'invalid second allocation must fail';
 SELECT count(*) INTO n FROM public.payments WHERE deal_id=d;
 ASSERT n=0,'first allocation must roll back when second fails';
 SELECT count(*) INTO n FROM rk_payment_private.operations WHERE request_id=request;
 ASSERT n=0,'failed transaction must not leave completed request';
 payload:=jsonb_set(payload,'{allocations,1,amountPaid}','500');
 result:=public.rk_payment_operation(request,'record',payload);
 again:=public.rk_payment_operation(request,'record',payload);
 ASSERT result=again,'retry must return identical persisted result';
 SELECT count(*) INTO n FROM public.payments WHERE deal_id=d;
 ASSERT n=2,'retry must not insert additional allocations';
 ASSERT result->>'dealStatus'='Paid Off','split payoff must update deal';
 rejected:=false;
 BEGIN
  PERFORM public.rk_payment_operation(request,'record',jsonb_set(payload,'{paymentMethod}','"Check"'));
 EXCEPTION WHEN raise_exception THEN rejected:=true;
 END;
 ASSERT rejected,'same request ID with changed payload must fail';
 rejected:=false;
 BEGIN
  PERFORM public.rk_payment_operation(gen_random_uuid(),'record',payload);
 EXCEPTION WHEN raise_exception THEN rejected:=true;
 END;
 ASSERT rejected,'different request ID with stale balances must fail';
 RAISE NOTICE 'PASS: split rollback, same-key replay, payload mismatch, stale different-key retry';
END;
$$;
RESET ROLE;
-- A restrictive policy simulates permissions changing during deployment.
CREATE POLICY test_deny_promise_update ON public.payment_promises AS RESTRICTIVE
 FOR UPDATE TO authenticated USING(false) WITH CHECK(false);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
 n_before int;
 n_after int;
 rejected bool:=false;
BEGIN
 SELECT count(*) INTO n_before FROM public.payments;
 BEGIN
  PERFORM public.rk_payment_operation(gen_random_uuid(),'record',jsonb_build_object(
    'dealId','00000000-0000-0000-0000-000000000001','paymentDate','2026-02-01','paymentMethod','Cash',
    'allocations',jsonb_build_array(jsonb_build_object('dueDate','2026-02-01','amountPaid',100,'expectedPaid',0,'expectedRemaining',500))));
 EXCEPTION WHEN insufficient_privilege THEN rejected:=true;
 END;
 SELECT count(*) INTO n_after FROM public.payments;
 ASSERT rejected,'RLS denial must be propagated';
 ASSERT n_before=n_after,'RLS denial must roll back inserted payment';
 ASSERT NOT has_function_privilege('anon','public.rk_payment_operation(uuid,text,jsonb)','EXECUTE'), 'anonymous cannot call mutation RPC';
 RAISE NOTICE 'PASS: invoker RLS and denied reconciliation rollback';
END;
$$;
ROLLBACK;
