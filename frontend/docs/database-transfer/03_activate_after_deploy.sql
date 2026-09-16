-- Run ONLY after 01 + 02, matching web code deployment, and authenticated validation.
-- Pause financial writes, drain old requests and refresh staff tabs before activation.
BEGIN;
SET LOCAL lock_timeout = '10s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM rk_payment_private.configuration WHERE id=true) THEN
   RAISE EXCEPTION 'Payment integrity installation is missing';
 END IF;
 IF to_regprocedure('public.rk_payment_operation(uuid,text,jsonb)') IS NULL
   OR to_regclass('public.deal_stories') IS NULL THEN
   RAISE EXCEPTION 'Installation incomplete';
 END IF;
 IF NOT has_function_privilege('authenticated','public.rk_payment_operation(uuid,text,jsonb)','EXECUTE') THEN
   RAISE EXCEPTION 'RPC execution has been revoked; review before activation';
 END IF;
END $$;
UPDATE rk_payment_private.configuration SET enabled=true WHERE id=true AND enabled=false;
COMMIT;
SELECT public.rk_payment_capabilities() AS activated_capabilities;
-- Expected version=1, enabled=true. Old direct payment/promise writers now reject.
