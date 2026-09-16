-- Synthetic fixtures only; no production IDs or repair actions.
BEGIN;
UPDATE rk_payment_private.configuration SET enabled=false WHERE id;
INSERT INTO public.deals(id,deal_tag,total_amount,monthly_payment,start_date,due_day,term)
VALUES('00000000-0000-0000-0000-000000000070','LEGACY-ISOLATION',1500,500,'2026-01-01',1,3),
('00000000-0000-0000-0000-000000000071','NEW-RESCHEDULE',500,500,'2026-01-01',1,1),
('00000000-0000-0000-0000-000000000072','CANCELLED-COMMITMENT',500,500,'2026-01-01',1,1);
INSERT INTO public.payment_promises(id,deal_id,original_due_date,amount_due,remaining_amount,promise_status,promised_date)
VALUES('00000000-0000-0000-0000-000000000080','00000000-0000-0000-0000-000000000070','2020-01-01',500,500,'Paid','2020-01-02'),
('00000000-0000-0000-0000-000000000081','00000000-0000-0000-0000-000000000070','2020-01-01',300,300,'Paid','2020-01-02'),
('00000000-0000-0000-0000-000000000082','00000000-0000-0000-0000-000000000072','2026-02-01',500,500,'Cancelled','2099-01-01');
INSERT INTO public.payments(id,deal_id,payment_date,amount_paid)
VALUES('00000000-0000-0000-0000-000000000083','00000000-0000-0000-0000-000000000070','2020-01-01',999);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
DO $$ DECLARE rejected bool:=false; BEGIN
 BEGIN
  PERFORM public.rk_payment_operation(gen_random_uuid(),'record','{"dealId":"00000000-0000-0000-0000-000000000071"}');
 EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 ASSERT rejected,'RPC is disabled before activation';
END $$;
RESET ROLE;
UPDATE rk_payment_private.configuration SET enabled=true WHERE id;
SET LOCAL ROLE authenticated;
DO $$
DECLARE d uuid:='00000000-0000-0000-0000-000000000070'; r jsonb; payment uuid;
 before_promises jsonb; before_payment jsonb; n int; v numeric; rejected bool:=false;
BEGIN
 SELECT jsonb_agg(to_jsonb(p) ORDER BY id) INTO before_promises FROM public.payment_promises p WHERE deal_id=d;
 SELECT to_jsonb(p) INTO before_payment FROM public.payments p WHERE id='00000000-0000-0000-0000-000000000083';
 r:=public.rk_payment_operation(gen_random_uuid(),'record',jsonb_build_object('dealId',d,'paymentDate','2026-02-01','paymentMethod','Cash',
   'allocations',jsonb_build_array(jsonb_build_object('dueDate','2026-02-01','amountPaid',200,'expectedPaid',0,'expectedRemaining',500,'promisedDate','2099-01-01'))));
 payment:=(r#>>'{payments,0,id}')::uuid;
 ASSERT (r->>'legacyStatusPreserved')::boolean,'legacy deal status preserved';
 ASSERT before_promises=(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM public.payment_promises p WHERE deal_id=d AND original_due_date='2020-01-01'),'old overlapping Paid roots unchanged';
 ASSERT before_payment=(SELECT to_jsonb(p) FROM public.payments p WHERE id='00000000-0000-0000-0000-000000000083'),'old undated payment unchanged';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,'paymentId',payment,'reason','synthetic'));
 SELECT remaining_amount INTO v FROM public.payment_promises WHERE deal_id=d AND original_due_date='2026-02-01';
 ASSERT v=500,'new obligation void works despite unrelated legacy anomalies';
 BEGIN
  PERFORM public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,'paymentId','00000000-0000-0000-0000-000000000083','reason','synthetic'));
 EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 ASSERT rejected,'ambiguous old void fails safely';
 ASSERT before_payment=(SELECT to_jsonb(p) FROM public.payments p WHERE id='00000000-0000-0000-0000-000000000083'),'old payment still untouched';
 rejected:=false;
 BEGIN INSERT INTO public.payments(deal_id,payment_date,amount_paid) VALUES(d,'2026-02-01',10);
 EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 ASSERT rejected,'legacy direct writer blocked after activation';
 rejected:=false;
 BEGIN UPDATE public.deals SET monthly_payment=900 WHERE id=d;
 EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 ASSERT rejected,'captured schedule cannot drift';
 SELECT count(*) INTO n FROM public.payments WHERE deal_id=d;
 ASSERT n=2,'no extra legacy writer payment';
 -- Unrelated future skips remain allowed; captured installment changes fail.
 INSERT INTO public.payment_skips(id,deal_id,original_due_date,installment_no,amount_due,moved_due_date,skip_status)
 VALUES('00000000-0000-0000-0000-000000000084',d,'2026-03-01',2,500,'2026-05-01','Active');
 rejected:=false;
 BEGIN
  INSERT INTO public.payment_skips(deal_id,original_due_date,installment_no,amount_due,moved_due_date,skip_status)
  VALUES(d,'2026-02-01',1,500,'2026-06-01','Active');
 EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 ASSERT rejected,'cannot move captured installment';
 RAISE NOTICE 'PASS: legacy isolation, new partial and void, activation and old-client guard';
END $$;
DO $$
DECLARE d uuid:='00000000-0000-0000-0000-000000000071'; r jsonb; first_id uuid; second_id uuid;
 root uuid; child uuid; v numeric; st text;
BEGIN
 r:=public.rk_payment_operation(gen_random_uuid(),'record',jsonb_build_object('dealId',d,'paymentDate','2026-02-01','paymentMethod','Cash',
  'allocations',jsonb_build_array(jsonb_build_object('dueDate','2026-02-01','amountPaid',200,'expectedPaid',0,'expectedRemaining',500,'promisedDate','2099-01-01'))));
 first_id:=(r#>>'{payments,0,id}')::uuid; root:=(r#>>'{payments,0,promise_id}')::uuid;
 r:=public.rk_payment_operation(gen_random_uuid(),'reschedule',jsonb_build_object('dealId',d,'promiseId',root,'expectedRemaining',300,'newPromisedDate','2099-02-01','reason','synthetic'));
 SELECT id INTO child FROM public.payment_promises WHERE parent_promise_id=root;
 ASSERT child IS NOT NULL,'reschedule creates child';
 r:=public.rk_payment_operation(gen_random_uuid(),'promise_paid',jsonb_build_object('dealId',d,'promiseId',child,'expectedRemaining',300,'paymentDate','2026-02-01','paymentMethod','Cash'));
 second_id:=(r#>>'{payments,0,id}')::uuid;
 ASSERT first_id<>second_id,'two legitimate payments recorded';
 SELECT status INTO st FROM public.deals WHERE id=d; ASSERT st='Paid Off','multiple payments pay off deal';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,'paymentId',first_id,'reason','synthetic'));
 SELECT remaining_amount,promise_status INTO v,st FROM public.payment_promises WHERE id=child;
 ASSERT v=200 AND st='Pending','void after full payment reopens leaf with 200';
 SELECT status INTO st FROM public.deals WHERE id=d; ASSERT st='Active','paid-off deal reopens';
 SELECT promise_status INTO st FROM public.payment_promises WHERE id=root; ASSERT st='Rescheduled','ancestor remains historical';
 RAISE NOTICE 'PASS: reschedule, two separate payments, multi-payment payoff and void reopening';
END $$;
DO $$ DECLARE r jsonb; v numeric; st text; BEGIN
 r:=public.rk_payment_operation(gen_random_uuid(),'record','{"dealId":"00000000-0000-0000-0000-000000000072","paymentDate":"2026-02-01","paymentMethod":"Cash","allocations":[{"dueDate":"2026-02-01","amountPaid":200,"expectedPaid":0,"expectedRemaining":500}]}');
 SELECT remaining_amount,promise_status INTO v,st FROM public.payment_promises WHERE id='00000000-0000-0000-0000-000000000082';
 ASSERT v=500 AND st='Cancelled','normal partial preserves cancelled historical commitment';
 r:=public.rk_payment_operation(gen_random_uuid(),'record','{"dealId":"00000000-0000-0000-0000-000000000072","paymentDate":"2026-02-01","paymentMethod":"Cash","allocations":[{"dueDate":"2026-02-01","amountPaid":100,"expectedPaid":200,"expectedRemaining":300,"promisedDate":"2099-01-01"}]}');
 SELECT remaining_amount INTO v FROM public.payment_promises WHERE parent_promise_id='00000000-0000-0000-0000-000000000082';
 ASSERT v=200,'explicit new commitment after cancellation is linked once';
 RAISE NOTICE 'PASS: cancelled commitment does not prevent legitimate payments';
END $$;
ROLLBACK;
