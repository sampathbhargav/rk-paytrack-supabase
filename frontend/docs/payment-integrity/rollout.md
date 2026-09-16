# Staged activation and rollback

This is a review plan, not authorization to run production SQL or deploy. Known bad legacy/test data stays untouched. No data repair is required.

## Deployment readiness check — September 13, 2026

Read-only inspection of production (`gpmrzjbqpqesvycthwsx`) confirmed that
`public.rk_payment_capabilities()`, `public.rk_payment_operation(uuid,text,jsonb)`
and `rk_payment_private.configuration` are absent. The RPC-dependent frontend
is therefore **not ready for production payment use**. Recheck live metadata
at release time; this observation is not an installation or activation.

The frontend now checks capabilities before persisting any new payment intent.
Missing, disabled, incompatible or unreachable capabilities prevent a new save.
Existing intents bypass this preliminary check so the backend can return a
previously committed result. A failed retry retains its original request ID,
including when mutation RPC access has been revoked during a write pause.
This safeguard does not install the backend or make an early release usable.

Before promotion: finish the staging browser acceptance matrix, install the
reviewed production migration disabled, confirm authenticated capabilities
return version 1, coordinate the write pause and compatible client release,
then activate and verify enabled=true through an authenticated session. Follow
the sequence and rollback procedure below; do not fall back to direct writes.

Web builds use `npm run build` with root-relative asset URLs. Desktop packaging
scripts use `npm run build:electron` with relative asset URLs. Keep Vercel on
the web build command and verify direct loads of `/deals/<id>`,
`/deals/<id>/edit`, and `/customers/<id>` in the staging preview.

## Database objects (proposed migration)

The proposal adds private `operations` (durable results), `obligations` (forward gross-amount snapshots) and `configuration` (one disabled activation flag), with RLS policies and scoped grants. It adds three supporting financial indexes, `schedule`, `promise_state`, `guard_writes`, `guard_schedule`, public `rk_payment_operation` and `rk_payment_capabilities`, and four triggers on payments, promises, deals and skips. Existing financial columns, foreign keys and RLS policies are retained. The only installation INSERT is the new disabled configuration row.

The private schema must not be exposed through PostgREST. Authenticated INSERT access to its ledger/snapshots is required by invoker functions, so exposing those tables would let callers forge private protocol records. Existing financial-table RLS is permissive; these protocol guards are not a substitute for a separate authorization review. Trigger functions use invoker access; grants and RLS must be tested with real authenticated/anonymous roles in staging.

## Sequence

1. **Review candidate:** review the proposed SQL, all writer adapters, tests, private schema exposure and guard impact. Do not run repair scripts or use anomalous legacy records as acceptance fixtures. Expected result: an agreed forward-only contract. Rollback: source-only changes remain unpublished.
2. **Isolated staging database:** create production-equivalent schema/RLS/grants and synthetic fixtures; install the proposed SQL disabled. Confirm old clients still function before activation, new RPC writes reject, and capability returns version 1 / disabled. Installation failure rolls back its transaction. No financial backfill occurs.
3. **Staging clients:** run the updated browser and Electron clients. Verify durable recovery under timeout/reload, required APIs on both origins, denied-role behavior, missing-RPC behavior and receipt result shapes. New client writes remain unavailable until activation; there is no unsafe fallback.
4. **Staging activation:** during a write pause, enable the configuration flag as an administrator. This is a separate reviewed UPDATE to the *new configuration table*, not a legacy repair. The RPC sets a transaction-local protocol context; payment/promise triggers reject old direct writers once enabled. Locks serialize deal/skip changes. Captured financial schedule edits and moves/cancellation of captured skipped installments are rejected; unaffected future skips remain usable. Validate all test cases in `validation.md`, including direct legacy writer rejection.
5. **Production database, only with later approval:** take the usual backup/PITR readiness check, verify schema drift, and install the same reviewed SQL disabled. Ordinary CREATE INDEX can block writes; use a controlled maintenance window. Confirm no existing financial rows changed.
6. **Production clients and activation, only with later approval:** distribute compatible browser/Electron builds, pause financial writes, drain in-flight old requests, then enable the gate and reopen access. Capability/guard checks must precede use. Old tabs/builds receive an update-required failure instead of continuing unsafe writes. Test first real authorized operations, never synthetic production receipts.
7. **Read-only post-release validation:** compare new operation keys/payment IDs, non-voided sums and current leaves across account, dashboard, dues, CSV and receipts. Watch for unexpected errors and new inconsistent rows. Existing known bad rows are excluded from the success criterion, without hiding their history.

## Rollback

Before activation, the additive disabled schema leaves the legacy release unchanged. Do not deploy the RPC-dependent frontend as a working payment UI before the gate is ready.

After activation, **do not set enabled=false as rollback**: that would allow legacy direct writers again. Pause writes by revoking execution of the mutation RPC while leaving guards enabled, and serve a read-only compatible frontend. Preserve private ledger rows and pending client keys. Restore execute only after the corrected RPC is validated; retained keys recover successful operations without replaying money. Do not drop the ledger/snapshots, delete transactions, restore a stale database backup over real receipts, or silently fall back to the legacy API. Prefer a reviewed forward correction of the RPC.

An operation already committed remains committed. Any genuine business reversal is a separate authorized void. An ambiguous legacy operation simply fails and remains unchanged; staff are not required to repair it to enable valid new work.

## Staging gates still required

- PostgreSQL 17 / real Supabase JWT and PostgREST behavior; private-schema exposure and resulting ACL inspection.
- Full browser and packaged Electron recovery/receipt workflows with staging credentials, including storage loss/unsupported capabilities and multi-tab retries.
- Explicit acceptance of captured schedule-edit restrictions and the old-client activation transition.
- Baseline lint failures remain visible; no unrelated lint cleanup is bundled with this financial change.
