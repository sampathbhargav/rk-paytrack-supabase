-- OPTIONAL INCIDENT RESPONSE ONLY. Do NOT run during a normal installation.
-- Blocks authenticated new saves AND recovery until access is restored after review.
-- Keep activation/guards enabled; never delete the ledger or disable the flag.
BEGIN;
DO $$ BEGIN
 IF NOT coalesce((SELECT enabled FROM rk_payment_private.configuration WHERE id=true),false) THEN
   RAISE EXCEPTION 'Guards are not active; this is not a safe post-activation pause';
 END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.rk_payment_operation(uuid,text,jsonb) FROM authenticated;
COMMIT;
