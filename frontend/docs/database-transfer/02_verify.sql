-- READ ONLY. Run after install and again after activation.
SELECT public.rk_payment_capabilities() AS capabilities;
SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='rk_payment_private' AND c.relkind='r')
 OR (n.nspname='public' AND c.relname IN ('deals','payments','payment_promises','payment_skips','deal_stories'))
ORDER BY 1,2;
SELECT n.nspname AS schema_name,p.proname,p.prosecdef AS security_definer,
 pg_get_function_identity_arguments(p.oid) AS arguments,p.proconfig,p.proacl,
 md5(pg_get_functiondef(p.oid)) AS definition_hash
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='rk_payment_private' OR
 (n.nspname='public' AND p.proname IN ('rk_payment_operation','rk_payment_capabilities','touch_deal_story'))
ORDER BY 1,2;
SELECT has_function_privilege('authenticated','public.rk_payment_operation(uuid,text,jsonb)','EXECUTE') AS authenticated_rpc,
 has_function_privilege('anon','public.rk_payment_operation(uuid,text,jsonb)','EXECUTE') AS anonymous_rpc;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='rk_payment_private' OR (schemaname='public' AND tablename IN
 ('deals','payments','payment_promises','payment_skips','deal_stories')) ORDER BY 1,2,3;
SELECT n.nspname,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname='public'
 AND c.relname IN ('deals','payments','payment_promises','payment_skips','deal_stories') ORDER BY 2,3;
SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public'
 AND indexname IN ('rk_payments_deal_due','rk_promises_deal_due','rk_promises_parent','deal_stories_updated_idx');
SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants
WHERE table_schema IN ('public','rk_payment_private') AND grantee IN ('anon','authenticated')
 AND table_name IN ('deals','payments','payment_promises','payment_skips','deal_stories','operations','obligations','configuration')
ORDER BY 1,2,3;
SELECT c.relname,con.conname,pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('deals','payments','payment_promises','payment_skips','deal_stories') ORDER BY 1,2;
-- Also check Supabase Data API settings: rk_payment_private MUST NOT be exposed.
-- SQL Editor administrator checks cannot prove application-user RLS access.
