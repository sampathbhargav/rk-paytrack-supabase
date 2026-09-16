# Payment integrity validation

All database tests use a disposable local PostgreSQL 14 cluster, Unix socket `/tmp`, port 55439. They must never be run against Supabase production. Real PostgreSQL 17/Supabase authenticated staging remains a release gate.

## Results

- Node promise/request tests: **15 passed**. Covers historical selection, rescheduled leaves, exact-cent combined dues, double-click sharing, a lost response after server commit, recovery after client restart, changed-draft rejection, distinct legitimate payments, acknowledgement, storage failure and concurrent different-intent rejection.
- Transaction SQL: **passed**. Full/split payments, multiple partial payments, promise settlement/replacement, repeated/multiple voids, ancestor-linked void, atomic split rollback, replay, changed-payload rejection, stale different-key rejection and RLS-denied reconciliation rollback.
- Legacy SQL: **passed**. A valid initial unlinked dated payment is reversed using installment history; ambiguous undated void is rejected without mutation.
- Forward SQL: **passed**. Unrelated legacy anomalies stay byte-for-byte unchanged while new payment/void succeeds; disabled/enabled gate behavior; direct legacy writer rejection; captured-schedule protection; unrelated future skips allowed; reschedule, distinct payments, full payoff and reopening after void; ordinary payments after cancelled commitment.
- Concurrent SQL: **passed**. Two sessions with the same actor/request returned the same payment UUID. Exactly one payment persisted, total $200 (synthetic).
- Schedule parity: **7 passed**. Monthly leap/month-end clamping, biweekly, semi-monthly, one-time, cash, moved skips and cancelled skips.
- Offline Electron capability probe: **passed** in an isolated temporary profile on `file://`; secure context, persistent localStorage and Web Locks all available. No RK PayTrack session or Supabase request was loaded.
- Matching lockfile ESLint runtime/config: **99 errors / 5 warnings**, same diagnostic signatures/counts as the pre-change baseline after ignoring shifted code excerpts. No lint suppressions or dependency changes introduced.
- Final `npm run build`: passed. Vite's existing large-bundle warning remains.
- `npm run lint`: completed with exit 1, **99 errors / 5 warnings**, matching the pre-change baseline. It initially stalled while loading installed files. The matching temporary runtime independently confirmed no added diagnostic signatures. Repository dependencies/configuration were not altered to bypass lint.

## Reproduction

Initialize a new disposable local PostgreSQL cluster with no TCP listener. Apply `tests/payment-integrity-fixture.sql`, then `docs/payment-integrity/proposed-migration.sql` to the empty database. Do not apply the synthetic fixture to a managed project.

Run these files with `psql -h /tmp -p 55439 -d postgres -v ON_ERROR_STOP=1 -f <file>`:

- `tests/payment-integrity-transaction.sql`
- `tests/payment-integrity-legacy.sql`
- `tests/payment-integrity-forward.sql`

Each uses a transaction and rolls back its synthetic financial rows/configuration changes. To test concurrency, seed the synthetic deal ending `0003` (total/monthly 500, start 2026-01-01, due day 1, term 1) in the disposable database, enable its new configuration flag, and run `tests/payment-integrity-concurrent.sql` in two concurrent sessions. Assert one payment and total 200. This concurrency fixture intentionally commits synthetic rows; discard/stop the disposable database afterward.

```sh
node --test tests/promiseUtils.test.mjs tests/paymentRequests.test.mjs
node --test tests/payment-integrity-schedule.test.mjs
npm run lint
npm run build
```

## Remaining staging checks

Use real staging JWTs to verify anonymous denial, invoker RLS and full payment visibility, final grants, private-schema nonexposure, RPC transport, transition from old clients, authenticated web recovery across reload and packaged Electron recovery across restart. Exercise Dashboard, Deals, Customer Detail, Add Payment, Due Payments, Promises/History, Reports/CSVs and receipts/account summaries. No production browser flows were exercised because some old screens write on load. An offline Electron capability check does not substitute for the full staging Electron workflow.
