# Payment integrity change inventory

Paths are relative to `frontend/`. No commit or push was made.

## APIs and request handling

- `src/api/paymentsApi.js`: replace payment inserts/void mutations with RPC adapters; remove standalone payoff writer; paginate per-deal payments.
- `src/api/promisesApi.js`: paginate complete histories, derive overdue status without writes, and route mark-paid/partial/reschedule through the RPC.
- `src/api/paymentOperationsApi.js` (new): authenticated transport, actor-scoped clients, recovery/acknowledgement and capability lookup.
- `src/api/readAllRows.js` (new): page through complete query results, including a smaller server-side response cap.
- `src/utils/paymentRequests.js` (new): durable frozen intent, request ID, same-intent in-flight sharing, recovery and acknowledgement.
- `src/utils/promiseUtils.js` (new): shared active leaf selector and combined scheduled/promise due amount.

## Components and screens

- `src/components/PaymentForm.jsx`: one split-payment RPC, synchronous submission guard, committed receipt totals and distinct post-save logging failures.
- `src/components/PaymentHistory.jsx`: atomic void result, guard and acknowledgement.
- `src/components/PromiseHistory.jsx`: shared active selection, historical risk labeling, guarded RPC handlers and acknowledgement.
- `src/components/PaymentRecovery.jsx` (new): replay an unresolved request, display confirmed payment summary, then open/refetch the account. No new request ID on recovery.
- `src/App.jsx`: add recovery/capability UI; preserve pre-existing unrelated edits.
- `src/pages/CustomerDetail.jsx`: shared promise totals, remove load-time payoff write, refetch after recovery navigation.
- `src/pages/DuePayments.jsx`: shared promise selection and deduplicated combined due card by deal/installment.
- `src/pages/BusinessInsights.jsx`: shared selection plus complete promise API reads.
- Earlier shared-selector changes remain in `src/pages/Dashboard.jsx`, `src/pages/Promises.jsx`, `src/pages/Reports.jsx`, `src/pages/Deals.jsx`, `src/pages/CustomerProfile.jsx`, `src/components/AccountSummaryPrint.jsx`, `src/components/DueSchedule.jsx`, and `src/api/assistantApi.js`.

## Documentation and synthetic tests

- `docs/payment-integrity/proposed-migration.sql`: revised forward-only, gated RPC proposal; never applied to production.
- `docs/payment-integrity/investigation.md`: updated architecture and writer inventory; removes legacy cleanup prerequisite.
- `docs/payment-integrity/detect-existing-rows.sql`: existing read-only diagnostic proposal, unchanged; not a repair script or rollout prerequisite.
- `docs/payment-integrity/rollout.md`, `validation.md`, `files-changed.md`: new activation, validation and inventory documentation.
- `tests/promiseUtils.test.mjs`: active histories and combined-due cases.
- `tests/paymentRequests.test.mjs`: new durable client request/recovery cases.
- `tests/payment-integrity-fixture.sql`: synthetic schema/grants only.
- `tests/payment-integrity-transaction.sql`, `payment-integrity-legacy.sql`: transaction/void regressions, updated for activation gate.
- `tests/payment-integrity-forward.sql`: new legacy isolation, gate/old-writer, reschedule/cancelled and payoff cases.
- `tests/payment-integrity-concurrent.sql`, `payment-integrity-schedule.test.mjs`: concurrent replay and schedule parity fixtures.

## Unrelated work preserved

Existing changes to `src/api/activityLogsApi.js`, `src/api/customerFollowUpsApi.js`, new `src/pages/CustomerInteractions.jsx`, and the unrelated App routing edits were preserved. They were not part of this payment-integrity implementation. No Electron packaging files, application IDs, signing settings, credentials or production exports were changed.
