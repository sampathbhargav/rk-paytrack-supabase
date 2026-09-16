# Production database change register

## Release decision — September 15, 2026

User requested moving toward production without repeating the complete local acceptance suite in Vercel. Remaining preview tests are waived for this phase, not retroactively marked PASS. Local/staging evidence and outstanding limitations remain in staging-validation.md. Electron is out of scope. Production execution has not started.

Read-only production metadata on September 15 confirms rk_payment_private and both public RPCs are absent. Deploying the new frontend alone would disable payment saves.

## Exact installation candidate

- Target: production project `gpmrzjbqpqesvycthwsx`.
- Source: `proposed-migration.sql` (full executable SQL retained in this directory).
- SHA-256: `c5a8284a0330ed2911cdd4e40cc98d031223dfd74d3910a9176ddf15c9a73618`.
- Installation is one transaction, initially disabled.
- No historical payment/promise update, allocation, backfill, deletion or repair.
- Only installation data insert: new configuration row `(true, false)`.
- Existing financial columns and RLS policies are retained; four new triggers attach to existing tables.
- New tables all enable RLS. Functions use SECURITY INVOKER. Private schema must remain outside PostgREST exposed schemas.

## Objects created

| Type | Name |
| --- | --- |
| SCHEMA | `rk_payment_private` |
| TABLE | `rk_payment_private.operations` |
| POLICY | `own_operation_read` |
| POLICY | `own_operation_insert` |
| TABLE | `rk_payment_private.obligations` |
| POLICY | `obligation_read` |
| POLICY | `obligation_insert` |
| TABLE | `rk_payment_private.configuration` |
| POLICY | `configuration_read` |
| FUNCTION | `rk_payment_private.guard_writes` |
| TRIGGER | `rk_payment_write_guard` |
| TRIGGER | `rk_promise_write_guard` |
| FUNCTION | `rk_payment_private.guard_schedule` |
| TRIGGER | `rk_deal_schedule_guard` |
| TRIGGER | `rk_skip_schedule_guard` |
| FUNCTION | `public.rk_payment_capabilities` |
| INDEX | `rk_payments_deal_due` |
| INDEX | `rk_promises_deal_due` |
| INDEX | `rk_promises_parent` |
| FUNCTION | `rk_payment_private.schedule` |
| FUNCTION | `rk_payment_private.promise_state` |
| FUNCTION | `public.rk_payment_operation` |

Policy names above are scoped to their respective new tables; see source SQL for exact predicates. Authenticated users receive actor-scoped ledger SELECT/INSERT, deal-visible obligation SELECT/INSERT, configuration SELECT, and required function EXECUTE. Anonymous users receive configuration SELECT but no public RPC execution. PUBLIC default execution is revoked as specified in the migration.

## Separate activation change

After installation, authenticated capability verification, production build verification and a coordinated financial-write pause:

```sql
UPDATE rk_payment_private.configuration SET enabled = true WHERE id = true;
```

Expected affected rows: exactly one. Capture execution timestamp, migration ID, actor, before/after flag and verification outcome when executed. Activation rejects old direct payment/promise writers. Captured schedule changes are restricted; staff must reload the compatible web release. These changes affect future operations; ambiguous legacy recalculations fail safely.

## Rollout order and release checks

1. Verify production schema/grants/triggers against the reviewed staging baseline, private-schema API exclusion, backup/restore readiness and the complete working-tree release scope. Record evidence; do not export PII into this repository.
2. Coordinate a pause for payments, promises, voids and schedule edits. Ordinary index creation can block writers. Drain pending submissions and preserve unresolved request IDs.
3. Install the exact additive migration disabled using migration history. Record migration ID/hash/time and object/ACL checks. Do not activate on a failed check.
4. Build a fresh web artifact with verified production Supabase inputs. Never promote the staging-built preview. Record source manifest/build hash and target configuration without credentials.
5. Release compatible production frontend during the pause, verify login/routing/backend target, activate once ready, then require staff to refresh before reopening payment use.
6. Perform minimal production smoke checks: authenticated capabilities, Dashboard/Deals/Reports loading, direct routes and runtime errors. Verify the first real user-authorized transaction read-only; do not fabricate production financial test data.

## Rollback

Before activation: keep configuration disabled; retain additive objects and original frontend. Transaction failure rolls back installation.

After activation: keep guards enabled and preserve ledger/snapshots. Pause mutation access with:

```sql
REVOKE EXECUTE ON FUNCTION public.rk_payment_operation(uuid,text,jsonb) FROM authenticated;
```

Drain already running transactions; revocation does not cancel them. Keep financial use paused and provide a compatible read-only frontend. Do not set enabled=false, drop the ledger or restore a stale backup over committed payments. Validate a forward correction in staging, then restore the documented EXECUTE grant. An old Vercel deployment alone is not a safe financial rollback after activation.

Previous production deployment recorded during preview: `dpl_583FCqEnVFs7SAJS6JZHjT1owQsm`; recheck before release. Production alias: `rk-paytrack.vercel.app`.

## Execution ledger

| Step | Status | Evidence |
| --- | --- | --- |
| Production presence preflight | Complete, read-only | Private schema/capability/mutation RPC all absent |
| Core schema drift | PASS | Columns/defaults/nullability, constraints and policies match staging for deals/payments/payment_promises/payment_skips; no existing triggers or index-name collisions |
| Backup archive integrity | PASS | Manual archive checksum and full decoding verified; restore drill not performed |
| Staff write pause | Pending | Await operational confirmation |
| Installation | APPLIED, DISABLED | Migration 20260916015910 payment_integrity_atomic_rpc_disabled |
| Activation | APPLIED | One flag row enabled at 2026-09-16 02:16:28.914259 UTC |
| Production deployment | READY | dpl_8Y1DhwGi9bi6P87r2fRquo2iQUHx; rk-paytrack.vercel.app |
| Public smoke checks | PASS | Login renders; deployed entry byte-match; production-only backend; SPA routes load |
| Authenticated business smoke | Pending | User must sign in; no synthetic production transaction |

Append every SQL change, including corrections, with exact source/hash, target, reason, time, result, verification and rollback implications. Never label a proposed change as applied.

## September 15 production preflight evidence

- Project rk-paytrack / gpmrzjbqpqesvycthwsx is ACTIVE_HEALTHY, PostgreSQL 17.6.1.121, us-east-2.
- Machine comparison of metadata confirms identical columns/defaults/nullability, constraints (including status values and parent/promise foreign keys) and policies across the four relevant production/staging tables. Production has no user triggers on these tables; staging has exactly the four intended guards.
- RLS is enabled on all four tables; authenticated SELECT/INSERT/UPDATE/DELETE privileges exist. Existing permissive policies are unchanged by the proposal. New private objects require their documented actor/deal predicates.
- Eight existing indexes inspected; the three proposed index names do not collide.
- SQL-session pgrst.db_schemas is unset; this does NOT prove PostgREST schema exposure. API configuration verification remains pending.
- Authenticated Chrome dashboard at /database/backups/scheduled shows organization Free and explicitly states “Free Plan does not include project backups.” No managed restore point was available there. No upgrade attempted. No backup artifact was found in the repository; that does not establish whether an external backup exists.
- Production migration/deployment paused pending a verified manual backup and remaining release checks. No production SQL mutation, financial row export, migration, activation, deployment, commit or push performed.
- Next: identify an existing current manual backup, or establish a secure database connection for a local backup outside the repository. Do not send database passwords in chat or store customer data in source control. Record backup timestamp, scope, checksum and verification without its contents.

## Manual backup preparation

Installed local PostgreSQL 17.11 tools through Homebrew (existing default PostgreSQL 14 link retained; no server service started by Codex). Verified pg_dump version and backup script shell syntax. Authenticated dashboard confirms session endpoint aws-1-us-east-2.pooler.supabase.com:5432, user postgres.gpmrzjbqpqesvycthwsx. No saved production password/connection was available.

Prepared /private/tmp/rk-production-backup.command and opened it in Terminal for hidden password entry by the user. It performs a read-only custom-format database dump with TLS, writes under ~/RK-PayTrack-Backups/<UTC timestamp>/ with restrictive permissions, checks archive directory readability, and records SHA-256. Password is neither embedded in the script nor printed. Backup excludes publications/subscriptions and does not include Storage object files, external configuration or cluster-role passwords. Archive directory readability is not a restore test; recovery verification remains required.

Status: awaiting user password entry and successful backup completion. No production database mutation, migration, activation, plan change, commit, push or deployment performed.

## Backup completion and API isolation preflight

User completed local backup after resetting the database password themselves. Archive: ~/RK-PayTrack-Backups/20260916T015604Z/production-gpmrzjbqpqesvycthwsx.dump (494884 bytes, mode 0600). SHA-256 cfbfedb8c0f54ad899a620465884965b87d0537277f854ead94f4970a306c616 matches the recorded checksum. PostgreSQL 17 pg_restore decoded the full archive to /dev/null successfully. Table schema and TABLE DATA entries are present for customers, deals, payments, payment_promises and payment_skips. This is archive integrity verification, not a completed restore drill; no production data was restored or copied into staging.

Production REST request with Accept-Profile rk_payment_private rejected with HTTP 406 / PGRST106. Private schema is not API-exposed. Pre-installation metadata reconfirmed private schema and mutation RPC absent. Backup contents and credentials remain outside repository and logs. Preparing a fresh production-configured build; migration and activation not yet executed.

## Production installation — 2026-09-16 01:59:10 UTC

Applied payment_integrity_atomic_rpc_disabled through Supabase migration tool to gpmrzjbqpqesvycthwsx. Migration history version 20260916015910. Exact source SHA-256 matches c5a8284a0330ed2911cdd4e40cc98d031223dfd74d3910a9176ddf15c9a73618. Tool returned success.

Post-install checks: enabled=false; operations=0; obligations=0; four guards; three supporting indexes; RLS enabled on all private tables. Authenticated mutation EXECUTE=true; anonymous EXECUTE=false. No activation or production frontend deployment yet. The installation script contains no existing financial-row mutations or historical repair. Older documentation statements saying production was untouched are historical and superseded by this installation entry.

Additional installation verification: all six production function body hashes, argument signatures and SECURITY INVOKER flags match staging exactly. SET LOCAL ROLE authenticated in a read-only transaction returned capability version=1/enabled=false (database-role check, not a live user JWT login). Production alias still points to dpl_583FCqEnVFs7SAJS6JZHjT1owQsm before deployment.

## Production web build

Original build stalled on macOS dataless dependency files. Stopped that build, copied identical source into /private/tmp/rk-production-build-source, and installed locked dependencies with npm ci --ignore-scripts. No application edits or repository dependency changes. Web build passed (Vite 8.3.0; 329 modules); existing bundle-size warning remains. Source identity matched for 82 files; manifest SHA-256 51b1cf13693f6871863ca4a1e04ceaa1a1879e07d969016908afecec6b028944. Artifact has 16 deployable files, production Supabase host only, no staging host, env files, SQL or source maps. Deployment initiated with explicit --prebuilt --prod to the existing project; completion and activation pending verification. No Git commit/push.

## Production deployment and activation — September 16 UTC / September 15 Chicago

Vercel deployment dpl_8Y1DhwGi9bi6P87r2fRquo2iQUHx returned READY/production and aliased https://rk-paytrack.vercel.app. Deployment URL: https://rk-paytrack-supabase-bekt83hlv-pinnamsampath-3471s-projects.vercel.app. Uploaded prebuilt artifact; shared Vercel environment variables not edited. Existing production deployment retained for reference; do not use a legacy frontend rollback as a financial-write fallback after activation.

Read-only HTTP checks: live entry JavaScript byte-matches the verified local production output and embeds only gpmrzjbqpqesvycthwsx.supabase.co. /login, /reports, /deals serve the SPA. Browser shows the new production login normally. Authenticated user workflows await user login; no synthetic production payment was created.

Executed the documented activation UPDATE on rk_payment_private.configuration with enabled=false predicate. Exactly one row returned enabled=true at 2026-09-16 02:16:28.914259+00. This changes only the new rollout flag; no historical repairs. Old direct financial writers are now subject to enabled guards. Staff must refresh old tabs. No Git commit/push performed.

Post-activation capability verified under authenticated database role: version=1/enabled=true. Production login console scan returned zero captured warning/error entries. Normal production-user sign-in and first real authorized transaction verification remain pending.

## Authenticated production smoke check

User confirmed normal production login. Claimed their Chrome production tab; it initially retained the old release. Reload preserved authentication and loaded /assets/index-DREc5CCC.js, the verified new bundle. Active deal count became 113 (old page displayed all 139); database aggregate confirms 113 Active deals.

PASS route/render smoke checks: Dashboard, Reports, Due Payments, Deals, Add Payment, browser refresh and authentication persistence. No financial submission or mutation performed during these checks. First real authorized production payment/RPC/receipt verification remains pending; these read-only checks do not claim a production payment test.

Aggregate comparison: financed $2,161,561.00 and valid collected $790,668.91 agree with production SQL. Dashboard net balance $1,370,892.09 differs from Reports per-deal open balance $1,371,892.09. Existing excess paid totals $1,000.00. Source explains the exact difference: Dashboard subtracts portfolio totals; Reports sums max(deal amount minus applied payments, zero). This is an existing aggregation-semantic discrepancy, not a new payment mutation. No legacy inspection/repair/allocation or automatic reconciliation performed. Cross-screen balance equivalence is not claimed for these portfolio cards. Any future display-definition alignment should be a separately reviewed code change.

Due Payments today showed scheduled $500, promises $0, combined $500. One pre-existing browser message-channel/listener error was captured at 02:19:37 UTC; none newly captured during refreshed route checks. Its wording is consistent with extension messaging, but source attribution is unconfirmed. No observed fatal application error.

No commit or push. Database changes remain limited to the documented installation and activation. Staff should refresh old tabs. First real business transaction can be verified read-only when submitted in the normal course of work.

## Post-release incident — skip metadata rejection

User attempted a payment on deal test2 / ac18e6bc-12ea-4db5-a154-5c3f0a76654d and received “Legacy skip metadata needs review”. Read-only verification: zero completed operations for the deal; no payments created since activation. Active skip f4f4f869-ec5e-4594-b457-63a48405bda5 targets installment 2 / 2026-10-31 / $500 and has null moved_due_date and moved_installment_no. A separate cancelled skip is excluded from the schedule RPC and is not the cause.

Root cause: new rk_payment_private.schedule rejects any active skip lacking moved_due_date; existing src/utils/duePaymentsUtils.js applySkipsToSchedule calculates an appended date when that field is absent. This is a rollout compatibility gap, not a successful or partially committed payment. Aggregate impact scan found two active missing-date skips across two deals. No customer PII or other deal identities retained here.

No production data repair, inferred replacement date, guard bypass or SQL correction performed. Prior instruction prohibits automatic inference/repair of ambiguous historical dates. Resolution requires confirming the existing runtime skip calculation as the intended compatibility rule (then staging-testing a narrowly scoped RPC correction without updating historical rows), or an explicitly authorized business correction. Payment retry should wait until resolved. The first production payment smoke test is therefore BLOCKED, not PASS.

## Skip-schedule compatibility correction — September 16, 2026 UTC

User authorized matching the application's existing automatic skip scheduling without changing historical rows. This resolves the preceding skip-metadata incident; it does not repair legacy records.

- Changed only `rk_payment_private.schedule(uuid)` using `CREATE OR REPLACE FUNCTION`, SECURITY INVOKER and empty search_path. Missing moved dates now use the existing UI rule: append after the last schedule date, using monthly clamping, biweekly +14 days, or the next semi-monthly date. Explicit moved dates remain authoritative; cancelled skips remain excluded. Invalid original dates/amounts still fail safely.
- Source: `supabase/migrations/20260916022937_payment_skip_schedule_compatibility.sql`; SHA-256 `203d65633866843263151fd28bd674e6f8bb15f9f008d8ee9784ba64a954162e`. Original installation SQL remains unchanged.
- Staging migration: `20260916024827 payment_skip_schedule_compatibility` on `lsgzpvhyuswmvpxokhdt`.
- Production migration: `20260916025233 payment_skip_schedule_compatibility` on `gpmrzjbqpqesvycthwsx`.
- Post-install function-definition MD5 matches staging: `18ad41088b52a1aaa2198ef6dbd6f328`; prior production hash `e7ea18eb7c302a5d202ef86b95e0da97`. Execute grants remain postgres/authenticated only, SECURITY INVOKER remains false for prosecdef, activation remains enabled.
- Verification: 14 real-staging SQL schedule cases matched expectations generated by the actual frontend utility, including monthly/leap February, explicit/automatic/multiple/cancelled skips, biweekly, semi-monthly, and the reported configuration. All fixture transactions rolled back.
- `tests/payment-skip-compatibility.sql` passed under the authenticated database role with a synthetic staging user's subject: partial on appended installment, promise payoff, separate payment, same-request replay, void reopening, failed second allocation rolling back payment/promise/ledger/obligation, anonymous RPC denial, and byte-equivalent skip metadata. This is a database-role test, not a new browser JWT acceptance test.
- Existing payment/request unit tests: 20/20 PASS. `npm run build`: PASS (existing bundle-size warning).
- Production read-only schedule now returns $500 on 2026-09-30, 2026-11-30, 2026-12-31 and 2027-01-31 for the affected deal. Payment and skip fingerprints match before/after exactly; completed operation count remains zero. No production payment submitted by Codex.
- No frontend source/deployment, customer/payment/skip row repair, RLS changes, commit or push.

Rollback: restore the prior schedule function body from the original installation SQL using CREATE OR REPLACE (prior body also retained in `/private/tmp/rk-skip-old-function.sql`). This reintroduces the safe skip rejection. Keep activation enabled and preserve all ledgers/guards; if payment writes must be suspended, revoke authenticated execution of the public mutation RPC instead of disabling the flag. Do not drop financial history.

Remaining user check: on the original browser/account, use Recover Payment to retry the preserved request; open the confirmed account afterward. Verify the resulting production transaction read-only before declaring the first production payment acceptance PASS.

Lint rerun status at handoff: npm run lint and an escalated retry started but stalled on local/cloud-backed file reads before reporting results. Current count is not verified; prior completed baseline remains 99 errors / 5 warnings. No lint cleanup performed. Production correction validation is based on the passing build, 20 unit tests, 14 real-staging parity assertions and authenticated-role atomic RPC regression above.

## Production transaction verification after skip correction

Read-only follow-up verified the user's subsequent operations on test2 (ac18e6bc-12ea-4db5-a154-5c3f0a76654d):

- One $500 Active payment for 2026-12-31, payment f7ddd615-6e30-4298-885a-672ed4152f0d; saved operation returned collected $1,500 / balance $500.
- One $500 payment for 2027-01-31, d87a875d-ee69-4b35-829f-761f1002bf9e; saved operation returned Paid Off / balance $0. A separate void operation returned Active / balance $500. Payment remains in history as Voided.
- One $200 Active payment for 2027-01-31, 6e305ba7-6994-4a9d-ba50-718471f0ef55; saved operation returned collected $1,700 / balance $300.
- Exactly one promise for this deal: 2c212972-e76c-493b-af2a-2242e66ed984, gross $500, paid $200, remaining $300, Pending, promised 2026-09-29, no parent.
- Four completed operations (three records, one void), each with a distinct request ID and one associated payment in its result. No extra payment record observed for those saves. This confirms persisted operations, not proof of an intentional duplicate-click test.

Current database state: deal total $2,000, valid non-voided collected $1,700, remaining $300, status Active. Voided $500 excluded. Production payment save, payoff, reopening and partial-plus-promise persisted-state checks PASS. No production mutation performed by Codex during verification. Receipt/Account Summary and final displayed cross-screen values still require confirmation; no new UI PASS is inferred from database checks alone. No commit/push.

## Production receipt and Account Summary confirmation

User confirmed “Receipt and summary correct” after reviewing the latest $200 payment receipt and Account Summary for the affected deal. Mark receipt and Account Summary acceptance PASS (manual user verification). Combined with the preceding read-only database checks, this completes the targeted production payment/skip-compatibility incident acceptance: valid collected $1,700, balance $300, one Pending $300 promise, deal Active, voided $500 excluded. This does not assert comprehensive production coverage of every business workflow. No additional financial transaction, deployment, commit or push performed for this confirmation.

## Git release review

User authorized committing the completed changes; push remains unapproved. All 70 application source files byte-match the source used for the deployed production build. The current build passed; payment/request unit tests 20/20 and staging schedule parity 14/14 passed during the skip correction, with authenticated-role atomic RPC regression also passing.

Lint completed using the identical application source and copied repository ESLint configuration in `/private/tmp/rk-production-build-source`: 99 errors / 5 warnings, unchanged from the known baseline (exit 1). This supersedes the earlier stalled-lint limitation; it is not a clean lint result. A pattern scan of 54 changed/untracked files found no embedded JWTs, private keys, service tokens, or quoted password assignments. This is a targeted scan, not a security audit. Supabase CLI temporary files are ignored; credentials, env files, customer CSV exports, backups and generated build/installers are excluded from the commit.

Production was published through an explicit Vercel CLI prebuilt deployment, which does not require a Git commit or push. A later Git push may independently trigger Vercel; inspect the production branch/build/environment configuration before that push. Committing locally does not deploy or apply SQL.
