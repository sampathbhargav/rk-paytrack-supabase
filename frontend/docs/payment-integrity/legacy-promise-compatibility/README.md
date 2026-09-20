# Older promise compatibility patch — revised v2

Prepared from the three function definitions supplied by the user on September 18, 2026. No access to the confidential target database was used. No production or hosted staging changes were applied.

## If the fix is already working

The user reported that the compatibility fix resolved the issue. That is a user-reported outcome, not an independent inspection of the confidential database. **Do not rerun the installer or rollback as part of the Help/Policy Center update.** This documentation update does not require a database migration.

The numbered files are not a sequence to run all together: `01` installs; `02` checks current amounts; `03` is an optional rollback only; `04` reads preserved values. Keep the installer and rollback together as a version-specific recovery package.

For an already-patched project, use the read-only checks only when needed. Their deal tag/date are examples for the original case; confirm the target before running them. The screenshot amounts describe the state before subsequent payments, not a permanent expected balance. An empty snapshot report can mean there were no qualifying successful operations after installation; it does not by itself prove data loss or patch failure.

## Revision and preserved originals

This revision replaces the earlier unexecuted candidate. Use the current files from this directory, not a previously copied script. The installer still requires the original supplied function versions; it deliberately refuses to overwrite an already-patched or different installation.

Before a successful payment, reschedule, or void changes any affected promise, the RPC captures its original ID, deal ID, original due date, amount_due, amount_paid_now, remaining_amount, status, promised date, parent, rescheduled-from date and creation timestamp. It stores these values as `result.promiseSnapshotsBefore` (format version 1) in the **existing** `rk_payment_private.operations` request ledger, atomically with the transaction. The ledger already supplies the actor, request ID, operation, payload, timestamp and result. No new table is needed.

This snapshot excludes free-text notes and customer contact information. It is a monetary/status provenance record, not a complete forensic audit or a backup. Ordinary authenticated users have no UPDATE/DELETE grants on the existing ledger; its existing per-actor RLS remains unchanged. A database administrator can still alter data. Snapshot recording introduces no new privileges.

Only promises belonging to touched installments are persisted. A retry returns the same original ledger result, including the original snapshot. Failed operations commit neither transactions nor snapshots. The current promise row still receives the coherent full-installment fields on success; its **pre-change values remain accessible in the ledger**. No historical payment is recreated or edited by the conversion. A requested void continues to change only its target payment's void status/metadata as intended.

Run `04_view_preserved_values_read_only.sql` after a successful operation to review original values for deal 1490. This is an administrator SQL report; there is no new frontend audit screen.

## What it fixes

Older promises can store the remaining installment balance at creation in `amount_due`, whereas the current RPC creates promises using the gross installment amount. The former equality check rejects either residual roots or older residual replacement children.

Example: gross 1,334.80; already allocated payments 93.20 + 343.00; old promise amount_due 1,241.60, amount_paid_now 343.00, remaining_amount 898.60. A new 500.00 payment should leave 398.60.

This patch treats the current schedule/captured obligation and correctly dated, non-voided payments as authoritative. It does not reconstruct when old payments occurred, infer missing allocations, or certify the accuracy of imported accounting data.

## Files and order

1. Keep a current database backup and retain the original supplied function definitions. Pause financial submissions during installation or rollback. Test in an isolated environment with the same application schema/security first.
2. Copy **the entire** `01_install_compatibility.sql` file into one SQL Editor query and run it as the database administrator. It installs two replacement function definitions and one private read-only helper atomically. A version mismatch or other error rolls back the whole installation. Do not remove the checks. If the editor leaves an aborted transaction open, execute `ROLLBACK;` before retrying.
3. Run `02_check_deal_read_only.sql`. It targets deal tag 1490, installment October 14, 2026. With the screenshot's unchanged records, expect gross 1,334.80, valid paid 436.20, remaining 898.60. This query does not expose customer contact information. No rows, a different result, or an exception requires review; do not manufacture matching values.
4. Reload the application. Check payment history before retrying. If the same unconfirmed payment is still available through recovery, use that existing request rather than creating a second logical submission. Otherwise confirm that the prior attempt did not save before entering another payment. Use the actual intended dates/method. A successful 500.00 payment against 898.60 leaves 398.60.
5. Check the payment history, current promise, installment, balance, and receipt. If underlying allocations are ambiguous the operation must continue to fail safely.

No frontend deployment is needed for this database-only patch with the supplied RPC version. It does not activate a disabled installation. It applies to eligible legacy promises throughout the project, not just deal 1490.

## Database effects

- Replaces `rk_payment_private.promise_state(uuid,date)` with a strict read-only wrapper.
- Adds `rk_payment_private.promise_state_legacy_v1(uuid,date,boolean)`, a read-only calculation helper. Its `false` mode is used only for post-mutation reconciliation by the RPC, after the strict pre-mutation check succeeds.
- Replaces `public.rk_payment_operation(uuid,text,jsonb)` with the original-value snapshot capture plus two calculation changes: use the post-mutation calculation helper, and update the current non-cancelled promise's `amount_due` to the gross basis alongside its recomputed paid/remaining fields.
- Keeps the schedule function, API signature, locks, request ledger, RLS, activation guards, and deal-status logic unchanged. All functions remain security-invoker with an empty search path. Existing function grants are retained; the new helper grants execution to authenticated and explicitly denies PUBLIC/anon.
- Creates no tables, columns, customer records, payments, or promises during installation. Does not backfill historical data.
- During subsequent successful operations, the current promise's monetary fields are standardized atomically. Superseded parents retain their monetary snapshots. Normal operation status/reason changes and creation of replacement children still occur as before.

## Eligibility and fail-safe behavior

All existing chain/root/leaf and payment-allocation checks remain. For a residual/mixed-basis chain, every promise must have finite, cent-precision, nonnegative paid/remaining values, a positive amount_due no larger than the gross installment, and amount_due = amount_paid_now + remaining_amount. Paid snapshots must have zero remaining. Before mutation, the leaf's remaining amount must equal gross minus all valid installment payments.

Unexplained discrepancies, overlapping roots, broken chains, invalid amounts, undated money covered by the existing guard, mismatched payment links, and overallocation still raise exceptions. This is deliberately conservative: not every historical promise format is accepted. Do not bypass an exception to force a save.

## Validation performed

Disposable **local PostgreSQL 17**, port 55448, synthetic records and authenticated-role fixtures only:

- Exact numeric screenshot pattern: 898.60 -> 398.60 after 500 payment.
- Same-request replay, concurrent same-request retries, one payment/ledger entry.
- Two intentional separate payments both accepted.
- Residual-root and residual-child chains; mixed old/new replacement promises; reschedule.
- Full payment, Paid Off, paid-promise reopening, deal reopening.
- Void of old unlinked payments, ancestor payments, and repeated voids.
- Rejection of inconsistent snapshots, overlapping roots, and undated allocations.
- Forced failure at ledger insertion rolls back payment, promise, captured basis, deal status, and ledger changes.
- Existing transaction, forward-compatibility, and legacy regression SQL suites pass, including RLS-denied reconciliation rollback, stale submissions, payload mismatch and activation guards.
- Before-change monetary/status snapshots, ledger persistence, original-value retention after void conversion, and authenticated UPDATE/DELETE restrictions pass.
- Helper permissions checked: invoker, anonymous execution denied, authenticated execution allowed.
- Function rollback and reinstall pass; repeated installation is rejected atomically.

The confidential target schema's extra triggers/policies and actual UI behavior have not been tested. The user must validate there or in their own isolated staging copy. No production payment was attempted by the assistant during those tests. The later user-reported successful outcome is noted above; it does not replace project-specific schema/security verification.

`local-synthetic-tests.sql` and `local-concurrent-test.py` are developer-only test artifacts. **Never run the synthetic SQL on production.** The concurrency script is hardcoded to the disposable local server and commits only synthetic test fixtures there.

## Rollback

Pause financial submissions, then run the entire `03_rollback_functions.sql` file. It checks the patched versions, restores the exact original supplied promise/RPC bodies, and drops only the new helper (without CASCADE). It does not undo any completed financial transaction or change stored balances. Preserved snapshots already written to the existing ledger remain there after function rollback; future operations using the original RPC will not create these new snapshots.

After real payments/reschedules have succeeded with compatibility enabled, restoring the old validator may block further work on mixed-basis legacy chains. Do not restore old financial rows or replay payments to work around that. A tested forward fix may be preferable. Reinstalling this patch is possible when the original function-version checks match again.

## Relationship to the current interface

The payment review panel displays estimates from the loaded account. “What needs attention now?” summarizes current collection amounts; Total Deal Balance includes future installments. These UI changes do not change eligibility checks or the compatibility RPC. Payment history and the confirmed account must still be checked after a save.

Staff guidance is available in Help Center under “Older promise compatibility” and “Recover an unconfirmed payment,” and in Policy Center under “Uncertain saves and payment incidents.” A compatibility error must not be bypassed by deleting and recreating historical payments. Preserve dates, amounts, methods and allocations; escalate ambiguous records for review.
