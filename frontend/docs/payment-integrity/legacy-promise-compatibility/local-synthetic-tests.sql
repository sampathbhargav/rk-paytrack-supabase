-- LOCAL SYNTHETIC DATABASE ONLY. Never run against production.
BEGIN;
UPDATE rk_payment_private.configuration SET enabled=false WHERE id;
INSERT INTO public.deals(id,deal_tag,total_amount,monthly_payment,start_date,due_day,term)
SELECT ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
       'COMPAT-SYNTHETIC-'||i,1334.80,1334.80,DATE '2026-09-14',14,1
FROM generate_series(1,8) i;
INSERT INTO public.payments(id,deal_id,payment_date,due_date,amount_due,amount_paid,remaining_amount,payment_method)
SELECT ('20000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
       ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
       '2026-07-23','2026-10-14',1334.80,93.20,1241.60,'Cash'
FROM generate_series(1,8) i;
INSERT INTO public.payments(id,deal_id,payment_date,due_date,amount_due,amount_paid,remaining_amount,payment_method)
SELECT ('30000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
       ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
       '2026-08-14','2026-10-14',1241.60,343,898.60,'Cash'
FROM generate_series(1,8) i;
INSERT INTO public.payment_promises(id,deal_id,original_due_date,amount_due,amount_paid_now,remaining_amount,promised_date,promise_status)
SELECT ('40000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
       ('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
       '2026-10-14',1241.60,343,898.60,'2026-08-25','Broken'
FROM generate_series(1,8) i;
-- Broken snapshot that still adds up, but disagrees with actual payments.
UPDATE public.payment_promises SET amount_paid_now=300,remaining_amount=941.60
WHERE deal_id='10000000-0000-0000-0000-000000000004';
-- Invalid arithmetic and overlapping roots.
UPDATE public.payment_promises SET amount_paid_now=0
WHERE deal_id='10000000-0000-0000-0000-000000000005';
INSERT INTO public.payment_promises(deal_id,original_due_date,amount_due,amount_paid_now,remaining_amount,promised_date)
VALUES('10000000-0000-0000-0000-000000000006','2026-10-14',1241.60,343,898.60,'2099-01-01');
-- Undated money must not be silently allocated to this installment.
INSERT INTO public.payments(deal_id,payment_date,amount_paid)
VALUES('10000000-0000-0000-0000-000000000007','2026-01-01',10);
UPDATE rk_payment_private.configuration SET enabled=true WHERE id;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
DO $tests$
DECLARE
 d uuid:='10000000-0000-0000-0000-000000000001';
 root uuid:='40000000-0000-0000-0000-000000000001';
 child uuid; newleaf uuid; pay uuid; r jsonb; again jsonb; payload jsonb; req uuid:=gen_random_uuid();
 st record; old_snapshot jsonb; rejected boolean; i int; payment_count int; ledger_count int;
BEGIN
 SELECT * INTO STRICT st FROM rk_payment_private.promise_state(d,'2026-10-14');
 ASSERT st.gross=1334.80 AND st.paid=436.20 AND st.remaining=898.60,'legacy initial calculation';
 SELECT to_jsonb(p)-'promise_status'-'reschedule_reason' INTO old_snapshot FROM public.payment_promises p WHERE id=root;
 payload:=jsonb_build_object('dealId',d,'promiseId',root,'expectedRemaining',898.60,
   'amountPaid',500,'paymentDate','2026-08-27','paymentMethod','Cash','newPromisedDate','2099-09-04');
 r:=public.rk_payment_operation(req,'promise_partial',payload);
 again:=public.rk_payment_operation(req,'promise_partial',payload);
 ASSERT r=again,'same request recovers original result';
 ASSERT (r->>'promiseSnapshotVersion')::int=1,'snapshot format version';
 ASSERT jsonb_array_length(r->'promiseSnapshotsBefore')=1,'only original affected promise snapshotted';
 ASSERT (r#>>'{promiseSnapshotsBefore,0,amount_due}')::numeric=1241.60
   AND (r#>>'{promiseSnapshotsBefore,0,amount_paid_now}')::numeric=343
   AND (r#>>'{promiseSnapshotsBefore,0,remaining_amount}')::numeric=898.60
   AND r#>>'{promiseSnapshotsBefore,0,promise_status}'='Broken','original promise values retained';
 ASSERT (SELECT result->'promiseSnapshotsBefore' FROM rk_payment_private.operations
   WHERE request_id=req AND actor_id=auth.uid())=r->'promiseSnapshotsBefore','snapshot durably stored in ledger';
 ASSERT NOT has_table_privilege('authenticated','rk_payment_private.operations','UPDATE')
   AND NOT has_table_privilege('authenticated','rk_payment_private.operations','DELETE'),'staff cannot overwrite or delete ledger';
 ASSERT (SELECT count(*) FROM public.payments WHERE deal_id=d)=3,'one new payment';
 SELECT id INTO STRICT child FROM public.payment_promises WHERE parent_promise_id=root;
 SELECT * INTO STRICT st FROM rk_payment_private.promise_state(d,'2026-10-14');
 ASSERT st.remaining=398.60 AND st.paid=936.20,'500 partial leaves 398.60';
 ASSERT old_snapshot=(SELECT to_jsonb(p)-'promise_status'-'reschedule_reason' FROM public.payment_promises p WHERE id=root),'historical parent monetary fields preserved';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'reschedule',jsonb_build_object('dealId',d,'promiseId',child,
   'expectedRemaining',398.60,'newPromisedDate','2099-09-10','reason','Synthetic'));
 SELECT id INTO STRICT newleaf FROM public.payment_promises WHERE parent_promise_id=child;
 r:=public.rk_payment_operation(gen_random_uuid(),'promise_paid',jsonb_build_object('dealId',d,'promiseId',newleaf,
   'expectedRemaining',398.60,'paymentDate','2026-09-01','paymentMethod','Cash'));
 pay:=(r#>>'{payments,0,id}')::uuid;
 ASSERT (SELECT status FROM public.deals WHERE id=d)='Paid Off','fully paid';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,'paymentId',pay,'reason','Synthetic'));
 SELECT * INTO STRICT st FROM rk_payment_private.promise_state(d,'2026-10-14');
 ASSERT st.remaining=398.60 AND st.leaf_status IN ('Pending','Broken'),'reopens paid promise';
 ASSERT (SELECT status FROM public.deals WHERE id=d)='Active','reopens deal';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'void',jsonb_build_object('dealId',d,
   'paymentId','30000000-0000-0000-0000-000000000001','reason','Synthetic'));
 SELECT * INTO STRICT st FROM rk_payment_private.promise_state(d,'2026-10-14');
 ASSERT st.remaining=741.60,'void of unlinked original 343 after replacement';
 -- First operation is a void of the original 93.20, then repeated void.
 d:='10000000-0000-0000-0000-000000000002';
 payload:=jsonb_build_object('dealId',d,'paymentId','20000000-0000-0000-0000-000000000002','reason','Synthetic');
 r:=public.rk_payment_operation(gen_random_uuid(),'void',payload);
 ASSERT (r#>>'{promiseSnapshotsBefore,0,amount_due}')::numeric=1241.60
   AND (r#>>'{promiseSnapshotsBefore,0,remaining_amount}')::numeric=898.60,'first void preserves pre-conversion values';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'void',payload);
 SELECT * INTO STRICT st FROM rk_payment_private.promise_state(d,'2026-10-14');
 ASSERT st.remaining=991.80 AND st.paid=343,'first-action void and repeated void';
 ASSERT (SELECT amount_due=1334.80 AND amount_paid_now=343 AND remaining_amount=991.80
   FROM public.payment_promises WHERE id='40000000-0000-0000-0000-000000000002'),'active leaf normalized coherently';
 -- Normal Add Payment path with two intentional equal payments.
 d:='10000000-0000-0000-0000-000000000003';
 FOR i IN 0..1 LOOP
 PERFORM public.rk_payment_operation(gen_random_uuid(),'record',jsonb_build_object('dealId',d,
   'paymentDate','2026-09-01','paymentMethod','Cash','allocations',jsonb_build_array(jsonb_build_object(
   'dueDate','2026-10-14','amountPaid',100,'expectedPaid',436.20+i*100,'expectedRemaining',898.60-i*100))));
 END LOOP;
 SELECT * INTO STRICT st FROM rk_payment_private.promise_state(d,'2026-10-14');
 ASSERT st.remaining=698.60 AND st.paid=636.20,'two intentional payments both counted';
 ASSERT (SELECT count(*) FROM public.payments WHERE deal_id=d)=4,'two distinct records';
 FOR i IN 4..7 LOOP
 d:=('10000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid;
 SELECT count(*) INTO payment_count FROM public.payments WHERE deal_id=d;
 SELECT count(*) INTO ledger_count FROM rk_payment_private.operations;
 rejected:=false;
 BEGIN
  PERFORM public.rk_payment_operation(gen_random_uuid(),'promise_partial',jsonb_build_object('dealId',d,
   'promiseId',('40000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,
   'expectedRemaining',898.60,'amountPaid',500,'paymentDate','2026-09-01','paymentMethod','Cash','newPromisedDate','2099-01-01'));
 EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 ASSERT rejected,'bad legacy data must be rejected';
 ASSERT payment_count=(SELECT count(*) FROM public.payments WHERE deal_id=d),'failed operation preserves payments';
 ASSERT ledger_count=(SELECT count(*) FROM rk_payment_private.operations),'failed operation has no completed ledger';
 END LOOP;
 RAISE NOTICE 'PASS: residual-root partial, replay, mixed-basis replacement, reschedule, full payment, paid-off reopening, original-payment void, repeated void, record path, legitimate separate payments, bad snapshots/roots/undated rejection';
END;
$tests$;
RESET ROLE;
-- Force failure after payment/promise/deal mutations by denying ledger completion.
CREATE FUNCTION public.compat_test_fail_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'synthetic late failure'; END $$;
CREATE TRIGGER compat_test_fail_ledger BEFORE INSERT ON rk_payment_private.operations
FOR EACH ROW EXECUTE FUNCTION public.compat_test_fail_ledger();
SET LOCAL ROLE authenticated;
DO $atomic$
DECLARE d uuid:='10000000-0000-0000-0000-000000000008'; before_state jsonb; after_state jsonb; rejected boolean:=false;
BEGIN
 SELECT jsonb_build_object('payments',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM public.payments p WHERE deal_id=d),
   'promises',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM public.payment_promises p WHERE deal_id=d),
   'deal',(SELECT to_jsonb(x) FROM public.deals x WHERE id=d),
   'obligations',(SELECT jsonb_agg(to_jsonb(o)) FROM rk_payment_private.obligations o WHERE deal_id=d),
   'ledger',(SELECT count(*) FROM rk_payment_private.operations)) INTO before_state;
 BEGIN
 PERFORM public.rk_payment_operation(gen_random_uuid(),'promise_paid',jsonb_build_object('dealId',d,
   'promiseId','40000000-0000-0000-0000-000000000008','expectedRemaining',898.60,'paymentDate','2026-09-01','paymentMethod','Cash'));
 EXCEPTION WHEN raise_exception THEN
  ASSERT SQLERRM='synthetic late failure','must fail at the late ledger trigger'; rejected:=true;
 END;
 SELECT jsonb_build_object('payments',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM public.payments p WHERE deal_id=d),
   'promises',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM public.payment_promises p WHERE deal_id=d),
   'deal',(SELECT to_jsonb(x) FROM public.deals x WHERE id=d),
   'obligations',(SELECT jsonb_agg(to_jsonb(o)) FROM rk_payment_private.obligations o WHERE deal_id=d),
   'ledger',(SELECT count(*) FROM rk_payment_private.operations)) INTO after_state;
 ASSERT rejected AND before_state=after_state,'late failure must roll back every mutation';
 RAISE NOTICE 'PASS: late-failure atomic rollback includes payment, promise, captured basis, Paid Off status and ledger';
END;
$atomic$;
ROLLBACK;
BEGIN;
UPDATE rk_payment_private.configuration SET enabled=false;
INSERT INTO public.deals(id,deal_tag,total_amount,monthly_payment,start_date,due_day,term)
VALUES('10000000-0000-0000-0000-000000000010','COMPAT-OLDER-CHAIN',500,500,'2026-01-01',1,1);
INSERT INTO public.payment_promises(id,deal_id,original_due_date,amount_due,amount_paid_now,remaining_amount,promised_date,promise_status,parent_promise_id)
VALUES('40000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000010','2026-02-01',500,200,300,'2099-01-01','Partial Paid',null),
('40000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000010','2026-02-01',300,100,200,'2099-02-01','Pending','40000000-0000-0000-0000-000000000010');
INSERT INTO public.payments(deal_id,payment_date,due_date,amount_paid)
VALUES('10000000-0000-0000-0000-000000000010','2026-02-01','2026-02-01',200),
('10000000-0000-0000-0000-000000000010','2026-02-02','2026-02-01',100);
UPDATE rk_payment_private.configuration SET enabled=true;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';
DO $$ DECLARE s record; BEGIN
 SELECT * INTO STRICT s FROM rk_payment_private.promise_state('10000000-0000-0000-0000-000000000010','2026-02-01');
 ASSERT s.remaining=200,'old shrinking replacement chain resolves';
 PERFORM public.rk_payment_operation(gen_random_uuid(),'promise_paid','{"dealId":"10000000-0000-0000-0000-000000000010","promiseId":"40000000-0000-0000-0000-000000000011","expectedRemaining":200,"paymentDate":"2026-02-03","paymentMethod":"Cash"}');
 ASSERT (SELECT amount_due=500 AND amount_paid_now=500 AND remaining_amount=0 FROM public.payment_promises WHERE id='40000000-0000-0000-0000-000000000011'),'paid leaf standardized';
 RAISE NOTICE 'PASS: pre-existing residual replacement child accepted and full payment resolves';
END $$;
ROLLBACK;
