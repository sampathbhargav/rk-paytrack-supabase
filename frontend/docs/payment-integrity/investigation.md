# Forward payment integrity

## Scope and status

The engineering objective is to prevent new inconsistent payment data. The known bad legacy/test records (Test regi and 1249) are **not repair targets or rollout prerequisites**. Do not reconcile them, allocate their undated payments, infer their original obligations, or rewrite their history. No production SQL, migration, repair, deployment, commit or push was performed for this work.

The frontend now uses the proposed version-1 RPC for all `public.payments` writers. The SQL remains a proposal outside the migrations directory and is disabled on installation. See `rollout.md` for activation and rollback. The existing database tables/columns, constraints, grants, RLS and triggers were inspected read-only in the preceding review; no assumed production columns were added to application queries.

## Atomic operation

`public.rk_payment_operation(uuid,text,jsonb)` supports `record`, `promise_paid`, `promise_partial`, `reschedule`, and `void`. One record request contains all installment allocations. PostgreSQL commits its payment inserts, promise changes, obligation capture, deal payoff change and request result together; any exception rolls them all back.

An actor/request advisory lock serializes identical requests. A deal row lock serializes distinct operations on the same deal, followed by locks on that deal's promises and payments. Expected paid/remaining values reject stale submissions. The server validates amounts, dates, links, chain structure and installment basis. Voided payments never enter paid totals. RLS stays enabled; functions are SECURITY INVOKER with an empty search path. No privileged frontend credential is needed.

The private `operations` ledger stores actor ID, request UUID, operation, frozen JSON payload, result and creation time. Matching replay returns the stored result; changed input with the same key rejects. Successful keys must not expire. A replay may describe an older receipt: refresh the account for its current balance.

## Historical tolerance

There is no migration-time scan, backfill or repair of financial rows. A valid new installment can be processed even if another installment has overlapping roots or the deal has undated legacy payments. Undated payments are never assigned a due date by this RPC.

`rk_payment_private.obligations` captures the validated gross amount and due date on the first successful forward operation. This makes subsequent reconciliation independent of mutable schedule generation. No historical promise is changed just to produce a snapshot. An old promise without a snapshot must pass the existing strict basis/link/ledger checks before an explicit operation can proceed. Ambiguous old obligations fail with their state unchanged; unrelated new obligations remain available.

Automatic deal status changes are suppressed when known ambiguity patterns exist on the deal (positive undated payments, Paid/nonzero promises, or overlapping roots). The response reports `legacyStatusPreserved`. Existing payment-based display totals remain based on non-voided recorded payments; this is not a claim that unreliable historical receipts represent reconciled business truth.

Cancelled commitments remain historical. An ordinary payment can proceed without reviving one. If the user explicitly supplies a new partial-payment promise, it becomes a linked child. Partial Paid and Rescheduled parents retain audit snapshots. A repeated void does not repeatedly add back money or rewrite the original void reason; ambiguous legacy voids fail safely.

## Current promise and due totals

`getActivePromises` in `src/utils/promiseUtils.js` is the shared current-obligation selector: positive finite remaining, Pending/Broken, and no child anywhere in the complete history. It neither infers links among unrelated roots nor repairs stored amounts. Promise reads are paginated before filtering; Business Insights now uses the same API. History stays visible; PromiseHistory risk labels/actions distinguish historical rows.

`getCombinedDueAmount` excludes a promised amount when the scheduled list already contains the same deal/original-due-date obligation. The scheduled remaining amount takes precedence. Other installments remain included; integer cents avoid accumulation drift. Separate scheduled and promise lists/cards remain useful follow-up views, but their combined amount does not count an installment twice.

Customer Detail, Dashboard, Due Payments, Promises, Promise History, Reports/deal CSVs, Deals export, Due Schedule, Account Summary, Customer Profile, Business Insights and deal-promise assistant answers use the shared selector. Receipts do not display an active-promise balance; new payment receipts now take committed totals from the RPC rather than adding optimistic client totals.

## Writer inventory

| Writer/caller | New handling |
|---|---|
| PaymentForm on Add Payment | One `savePaymentAllocations` call for the complete split payment; old `addPayment` insertion loop removed. |
| PromiseHistory Mark Paid | `promise_paid` RPC. |
| PromiseHistory partial payment | `promise_partial` RPC, including historical parent and new child. |
| PromiseHistory reschedule | `reschedule` RPC. |
| PaymentHistory void | `void` RPC, including current-leaf recalculation and payoff reopening. |
| CustomerDetail load-time payoff update | Removed; opening an account does not mutate deal status. |
| `updateBrokenPromises` called by existing reader pages | Compatibility no-op; overdue status is derived in promise reads, with persistence updated by financial operations. |
| Deal edits / payment skips | Still use their domain APIs. Database guards coordinate them with captured obligations; captured installment changes fail rather than drift. Unaffected future skip changes remain available. |
| Maintenance invoice payments/promises | Separate `maintenance_payments` / maintenance domain in `maintenanceApi.js`, called by Maintenance and AddPayment's maintenance mode. Not `public.payments` writers and not migrated into the dealership financing RPC. No uninspected maintenance schema is assumed. |

Repository search found no remaining frontend INSERT/UPDATE/DELETE against `public.payments` or `public.payment_promises` outside the RPC. Read-only queries remain in reporting/profile APIs. Activity logging remains a post-save operation; its failure cannot trigger a new payment or be described as a failed financial save.

## Durable frontend requests

`paymentRequests.js` is transport-independent and tested. `paymentOperationsApi.js` binds it to Supabase, current actor, browser storage, crypto UUIDs and Web Locks. Before transport, the exact payload/request key is stored in localStorage under the actor's key. Storage failure prevents sending. Same-intent double clicks share the in-flight request. Different concurrent input is rejected; a pending intent cannot be overwritten by an edited/new payment.

Unknown network outcomes retain the draft through reload/restart. Recover Payment replays the original payload/key, then opens the confirmed account after acknowledgement. Confirmed server rejections release the draft; timeouts/unknown failures do not. Successful responses remain recoverable until acknowledged. A distinct subsequent payment gets a new key and fresh expected amounts; customer/date/amount are not uniqueness keys. Different actors or different explicit keys are not semantic duplicate-receipt detection.

Submit handlers have synchronous guards. Acknowledgement removes only the matching request ID. Post-commit refresh/logging problems are reported as follow-up problems. The new frontend never falls back to the old multi-request writer when the RPC is missing/disabled. Environments lacking reliable storage, Web Locks or crypto UUIDs fail closed.

## Validation

Tests use synthetic local data only, never production IDs or copied customer/payment records. See `validation.md` for results and commands. Real authenticated Supabase staging and browser/Electron end-to-end workflow testing remain release gates, not historical cleanup gates.

Design reference: [Supabase database functions and invoker security](https://supabase.com/docs/guides/database/functions).
