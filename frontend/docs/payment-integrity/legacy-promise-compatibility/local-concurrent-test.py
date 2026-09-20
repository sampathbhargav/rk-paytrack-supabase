import subprocess,concurrent.futures,time
psql=['/opt/homebrew/opt/postgresql@17/bin/psql','-h','/private/tmp','-p','55448','-d','postgres','-v','ON_ERROR_STOP=1','-Atq']
def sql(s):
 r=subprocess.run(psql,input=s,text=True,capture_output=True)
 if r.returncode: raise RuntimeError(r.stderr)
 return r.stdout.strip()
print(sql('''BEGIN;
UPDATE rk_payment_private.configuration SET enabled=false WHERE id;
INSERT INTO public.deals(id,deal_tag,total_amount,monthly_payment,start_date,due_day,term)
VALUES('10000000-0000-0000-0000-000000000009','COMPAT-CONCURRENT',1334.80,1334.80,'2026-09-14',14,1);
INSERT INTO public.payments(deal_id,payment_date,due_date,amount_due,amount_paid,remaining_amount)
VALUES('10000000-0000-0000-0000-000000000009','2026-07-23','2026-10-14',1334.80,93.20,1241.60),
('10000000-0000-0000-0000-000000000009','2026-08-14','2026-10-14',1241.60,343,898.60);
INSERT INTO public.payment_promises(id,deal_id,original_due_date,amount_due,amount_paid_now,remaining_amount,promised_date)
VALUES('40000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000009','2026-10-14',1241.60,343,898.60,'2099-01-01');
UPDATE rk_payment_private.configuration SET enabled=true WHERE id;
COMMIT;'''))
request="""SELECT public.rk_payment_operation('90000000-0000-0000-0000-000000000009','promise_partial',
'{"dealId":"10000000-0000-0000-0000-000000000009","promiseId":"40000000-0000-0000-0000-000000000009","expectedRemaining":898.60,"amountPaid":500,"paymentDate":"2026-09-01","paymentMethod":"Cash","newPromisedDate":"2099-02-01"}');"""
prefix="BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub='90000000-0000-0000-0000-000000000001';"
lock="SELECT pg_advisory_xact_lock(hashtextextended('90000000-0000-0000-0000-000000000001:90000000-0000-0000-0000-000000000009',0)); SELECT pg_sleep(1);"
with concurrent.futures.ThreadPoolExecutor() as pool:
 a=pool.submit(sql,prefix+lock+request+'COMMIT;')
 time.sleep(.15)
 b=pool.submit(sql,prefix+request+'COMMIT;')
 assert a.result().strip()==b.result().strip()
assert sql("SELECT count(*) FROM public.payments WHERE deal_id='10000000-0000-0000-0000-000000000009'")=='3'
assert sql("SELECT count(*) FROM rk_payment_private.operations WHERE request_id='90000000-0000-0000-0000-000000000009'")=='1'
assert sql("SELECT remaining FROM rk_payment_private.promise_state('10000000-0000-0000-0000-000000000009','2026-10-14')")=='398.60'
assert sql("SELECT result#>>'{promiseSnapshotsBefore,0,amount_due}' FROM rk_payment_private.operations WHERE request_id='90000000-0000-0000-0000-000000000009'")=='1241.60'
print('PASS: concurrent same-request submissions return identical result, one payment, one ledger entry, remaining 398.60')
print(sql("""SELECT 'helper_is_invoker='||NOT prosecdef FROM pg_proc WHERE oid='rk_payment_private.promise_state_legacy_v1(uuid,date,boolean)'::regprocedure;
SELECT 'anon_denied='||NOT has_function_privilege('anon','rk_payment_private.promise_state_legacy_v1(uuid,date,boolean)','EXECUTE');
SELECT 'authenticated_allowed='||has_function_privilege('authenticated','rk_payment_private.promise_state_legacy_v1(uuid,date,boolean)','EXECUTE');"""))
