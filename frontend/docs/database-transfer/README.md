# RK PayTrack database transfer

This package transfers the database changes used by the validated release to a **different Supabase project that already has the original RK PayTrack schema**. It is not an empty-database bootstrap. The destination has not been inspected live, so compatibility is conditional on its schema, constraints, policies, grants, and Auth configuration matching the original application.

## Run order

1. Back up the destination database and confirm the project selected in SQL Editor. First test this package in an isolated staging copy using synthetic data. Do not use the existing RK PayTrack production or staging project: these changes are already installed there.
2. Pause financial writes for installation. Copy the **entire** `01_install.sql` into SQL Editor and run it as the database administrator. It performs prerequisite checks and installs all objects in one transaction. An error rolls back the installation. Index creation can lock existing tables; a 10-second lock timeout fails instead of waiting indefinitely. Expected final capabilities: version 1, enabled false.
3. Run `02_verify.sql`. Review output, including existing foreign keys, CHECK constraints, RLS policies, grants and triggers. The mutation RPC must allow authenticated execution and deny anonymous execution. Do not assume success in SQL Editor proves the application user can write through RLS.
4. In Supabase Data API settings, confirm `rk_payment_private` is **not an exposed schema**. Private ledger/snapshot permissions are needed internally by SECURITY INVOKER functions; exposing this schema would allow clients to forge those records. Keep the existing application's financial-table RLS policies intact. Verify real authenticated users have the required access; do not solve permission errors by disabling RLS or adding SECURITY DEFINER.
5. Deploy the matching frontend code, including both release and conditional-recovery-banner commits. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the **destination** project's values, then rebuild. Never copy service-role keys. Configure that project's Auth users, allowed sign-in/redirect URLs and Vercel SPA routing. Use `npm run build`, the correct frontend root and `dist` output directory. The new frontend deliberately blocks saves while capabilities are disabled.
6. During a coordinated write pause, drain old in-flight requests and refresh staff tabs. Only after code/configuration verification, run **the entire** `03_activate_after_deploy.sql`. Expected capabilities: version 1, enabled true. Old direct payment/promise writers will reject after activation. Schedule fields on captured obligations are intentionally protected.
7. Run `02_verify.sql` again. Test authenticated save, partial-plus-promise, reschedule, void, idempotent retry and receipt/account totals in destination staging before production acceptance. Do not create synthetic financial entries in production.

**Do not run all four SQL files consecutively.** File 04 is optional emergency response and would stop payment operations. Activation must wait for the compatible frontend.

## What is included

- Private `operations` request/result ledger, `obligations` snapshots and disabled `configuration` flag, with RLS/grants.
- Public `rk_payment_operation(uuid,text,jsonb)` and `rk_payment_capabilities()`.
- Internal schedule, promise-state and write/schedule-guard functions; four triggers; three payment/promise indexes.
- Automatic skipped-installment date compatibility, including missing stored moved dates, explicit moved dates, cancelled skips and monthly/biweekly/semi-monthly schedules.
- Shared `public.deal_stories` table, index, authenticated policies and timestamp trigger. This assumes a single shared dealership, not independent tenants sharing one project.

No customer/payment data, data repair, historical allocation, credentials, Auth-user copy or test fixtures are installed. Customer Interactions and activity attribution reuse original existing tables. The recovery banner requires no additional SQL.

The installer deliberately rejects an existing payment-integrity schema/RPC or Deal Stories object. Do not drop objects or add `IF NOT EXISTS` blindly; compare the destination's installed definitions and apply only reviewed missing changes. It does not remove conflicting policies or constraints. Required-column checks are not an exhaustive compatibility audit.

## Source and audit trail

`01_install.sql` combines the exact payment-integrity installation body, the follow-up skip compatibility body, and Deal Stories SQL under one outer transaction, with added prerequisites. Original individual SQL remains unchanged. `SOURCE-HASHES.json` identifies those source files. Supabase SQL Editor execution does **not** automatically create CLI migration-history entries: retain this package and record project ID, execution time, operator, results and deployed Git SHA in the destination repository's deployment log. Integrate it with that repository's migration process before later automated migrations.

Historical source comments saying “proposal” or “pending production” refer to the original rollout; this transfer package uses the installed release definitions. Do not run the original staging schema/fixtures against an existing database.

## Emergency pause

`04_emergency_pause_ONLY.sql` revokes authenticated mutation-RPC execution while leaving guards enabled and preserving all history. It blocks recovery too. Never set `enabled=false` as a post-activation rollback: that reopens legacy direct writers. Restore the RPC grant only after a reviewed fix and validation. A pause is not a schema uninstall or a reversal of committed payments.

## Validation scope

Package validation uses a disposable local PostgreSQL 17 database with synthetic original-schema fixtures, including simplified Auth/RLS. See `VALIDATION.md` for results. No SQL has been executed against the destination. A local PASS does not prove destination RLS, Data API exposure, authentication, existing constraints/triggers or deployed frontend compatibility.
