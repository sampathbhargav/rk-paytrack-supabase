# Isolated staging validation — 2026-09-07

## Current release scope — web only

**Electron: Out of scope for production deployment.** Its automation, restart, packaging, and storage checks are not release blockers. No Electron code changes are included in this validation phase. Earlier Electron observations below are retained only as historical test notes.

Production architecture: GitHub → Vercel → React/Vite → Supabase. Release gates cover database integrity, authenticated browser workflows, cross-screen consistency, and an actual Vercel preview connected exclusively to staging. Test regi and deal 1249 remain excluded legacy anomalies; no repair or inferred allocation is required.

The connected Vercel plugin currently returns an empty teams list. The workspace has no `.vercel/project.json`, installed Vercel CLI, or CLI authentication at the standard checked paths. Project settings and production environment variables have not yet been inspected; no Vercel configuration or deployment has been modified. Final preview acceptance remains pending access to the owning Vercel account.

## Environment and production boundary

- Project: `rk-paytrack-staging`, ID `lsgzpvhyuswmvpxokhdt`.
- URL: `https://lsgzpvhyuswmvpxokhdt.supabase.co`.
- Database host: `db.lsgzpvhyuswmvpxokhdt.supabase.co`, PostgreSQL 17.6.1.166.
- Organization: `sampathbhargav's Org` (`pvoplmpaiuzakmjusihj`), verified Free after creation and testing. Quoted project cost: $0/month. No upgrade or paid add-on operation was performed.
- Last management API health: `ACTIVE_HEALTHY`.
- Separate project API credentials were retrieved without printing them. Temporary configuration, synthetic password and auth session files are outside the repository with mode 0600.
- Production project `gpmrzjbqpqesvycthwsx` received only read-only metadata queries. Its project metadata and health remained unchanged. No production financial rows were copied, repaired or migrated. This is not a claim that other production users performed no concurrent activity.

## Installed schema

`staging-schema.sql` recreates 11 application tables, 38 constraints, 22 RLS policies, supporting indexes, and the maintenance invoice sequence/trigger from inspected production metadata. The historical import table and its import helper are outside the required application scope. No production table data or sequence current values were copied.

The reviewed `proposed-migration.sql` installed successfully. Objects verified: private operations, obligations and configuration tables (all RLS enabled); six invoker functions; four financial write/schedule triggers; three supporting indexes. Authenticated RPC execute is granted; anonymous execute is denied. PostgREST exposes only public and graphql_public, and rejects requests for rk_payment_private with PGRST106.

Installation default was disabled. Pre-activation authenticated tests verified rejection of new RPC saves and compatibility of the legacy direct writer. The flag was then enabled in staging only. It remains enabled. After activation, direct payment and promise inserts rejected; maintenance invoice payment insertion remained functional.

One synthetic email/password user was provisioned in staging Auth only, with a generated password hash and email identity. The real password-token endpoint successfully issued authenticated sessions. No emails were sent. Password authentication works; full production Auth setting equivalence has not yet been verified through management configuration access.

## Authenticated API results

`tests/staging-payment-integrity.mjs` uses normal user JWTs and the real Supabase REST/RPC endpoints. It hard-checks the approved staging ID and URL before any request. These are API integration results, not UI acceptance results.

| Scenario | Result |
| --- | --- |
| Full $500 payment | One payment, no promise, balance zero, deal Paid Off |
| $200 then $100 payments against $500 | Remaining $300 then $200 |
| Void first $200, retaining valid $100 | Remaining $400 |
| Void remaining $100 | Promise restored to $500 |
| Reschedule and partial-promise replacement | Parent retained historically, linked replacement carries current amount |
| Promise settlement | Remaining zero, deal Paid Off |
| Void after settlement by multiple payments | Promise remaining $200, deal reopened Active |
| Controlled overdue promise | Broken status returned |
| Concurrent same actor/request UUID | Same result/payment ID, one persisted payment |
| Two separate payment UUIDs | Both legitimate payments accepted |
| Actual frontend request helper double call | One transport call for the shared operation |
| Response lost after real database commit | Restarted helper reuses durable key; no duplicate |
| Invalid second allocation | Earlier payment/promise/snapshot rolled back; no ledger row |
| Maintenance payment | Separate existing table flow succeeded |

Temporary staging-only ledger trigger injection forced failures after payment, promise, reschedule, payoff and void changes but before ledger completion. Before/after financial snapshots matched, and zero failed-operation ledger rows persisted. That trigger and function were removed afterward.

A temporary restrictive promise UPDATE policy was tested with a real user JWT. Reconciliation returned 42501 and the inserted payment rolled back. The temporary policy was removed afterward. Production policies were never changed.

## Browser, Electron and cross-screen status

Not yet passed. A staging Vite process was started on 127.0.0.1:5174 with explicit staging environment variables; existing production env files were not edited. An isolated Electron launcher uses a temporary user profile and permits network requests only to localhost and the staging Supabase host. Its initial module-resolution error was fixed in the temporary launcher.

September 8 UI continuation: macOS permissions now work. The verified staging bundle is served at `http://127.0.0.1:5176`; its only embedded Supabase project host is `lsgzpvhyuswmvpxokhdt.supabase.co`. Normal synthetic-user browser login passed. Browser-control timeouts around native confirmation dialogs were resolved by inspecting the native Chrome dialog; no blind payment resubmissions were performed.

On synthetic deal `STG-ATOMIC-d0b317bd` (`ed2667fc-f4ab-4b1a-9e2b-665d8fcf2912`, two $500 installments):
- Browser Add Payment saved $500 against September 1. Customer Detail showed one payment, installment Paid, $500 deal balance, and no promises. Receipt `RK-STG-ATOMIC-d0b317bd-35F757` showed $500 paid today/to date and $500 balance; Account Summary agreed. A double-click was attempted, but a confirmation dialog interrupted it, so this is not a conclusive rapid-double-submit pass.
- A separate $200 payment against October 1 created a $300 promise for October 5. Account Summary, Customer Detail, schedule, and Promise History showed $700 paid / $300 balance, one current $300 promise.
- Rescheduling to October 10 retained the October 5 promise as Rescheduled; the active count remained one and the promise balance remained $300.
- Voiding the $200 through Payment History restored the current promise and account balance to $500 and valid collected total to $500. The voided payment remained visible and the historical rescheduled promise was retained.

Electron was relaunched with the same verified local bundle and isolated profile/network allowlist. Synthetic-user login and Dashboard accessibility content passed; Dashboard showed $4,200 valid collected and $3,800 remaining after the browser void. A separate default Electron instance was closed through its menu. Native accessibility and screenshots subsequently disagreed (accessibility showed Add Payment while screenshots remained at the login screen), and some native clicks had no effect. No Electron financial transaction is marked passed until this control/observation discrepancy is resolved. This is not a reported macOS permission denial. Browser network recovery, multi-tab locks, remaining payment scenarios and full cross-screen/export checks are not yet passed.

Source search confirms the shared promise helper is used by Dashboard, Customer Detail, Due Payments, Promises/History, Reports and CSV paths, Deals exports, Account Summary and related readers. Receipts use committed RPC totals. Actual rendered cross-screen balances and exported files have not yet been compared. API tests do not substitute for these checks.

## Local checks

- `npm run build`: passed; existing bundle-size warning and slow filesystem/build timing remain.
- `npm run lint`: 99 errors / 5 warnings, unchanged from baseline.
- Promise/request unit tests: 15 passed.
- Schedule parity on disposable local PostgreSQL: 7 passed.
- Transaction, legacy and forward SQL regression suites: passed; synthetic fixtures rolled back.
- Real staging concurrent retries: passed.
- `git diff --check`: passed before this report was added.

## Changes and remaining release gates

New repository files this phase: `staging-schema.sql`, `staging-validation.md`, and `tests/staging-payment-integrity.mjs`. No payment implementation or proposed migration changes were required by the completed staging API tests. Temporary launch/auth scripts live outside the repository. No commit, push, production deployment or production migration was performed.

Remaining (web release scope): complete the remaining authenticated browser UI scenarios, verify every requested screen/export/receipt, test actual browser storage/restart recovery, compare full Auth configuration, and review captured-schedule restrictions and old-client transition behavior. Staging is not yet a production release approval.

Next action: obtain access to the owning Vercel project and complete browser cross-screen/network tests against its staging-only preview. Preserve the synthetic fixture state above when resuming; do not repeat completed payments.

After all staging gates pass and user review: recheck schema drift and backup readiness; install the reviewed production migration disabled only with explicit approval; distribute compatible browser/Electron clients during a write pause; activate production only with explicit approval; validate the first authorized operations read-only. Never merge staging test data into production. After activation, rollback means pausing RPC writes while preserving guards/ledger, not reopening legacy writers.

## September 9 resumed UI checks

The Due Payments date discrepancy was an uncommitted automation field interaction: native date setValue updated React state correctly. October 10 showed the fixture as one Pending promise for $500 with total due $500; October 1 showed its scheduled remaining $500 (plus another synthetic installment for a $1,000 screen total). No code change was needed.

Reports rendered $4,200 deal cash collected and $3,800 open deal balance, agreeing with the previous Dashboard observation. The actual Full Deals CSV export for STG-ATOMIC-d0b317bd showed Total_Paid=500, Balance=500, Payment_Count=1, Active_Promise_Count=1 and Active_Promise_Amount=500. Promise_History retained the old Rescheduled $300 and current Pending $500; the voided payment was excluded from valid payment totals.

Electron restart restored the authenticated synthetic session and Dashboard ($4,200 collected / $3,800 remaining). Screenshot and accessibility agreed on Add Payment after restart. Selecting the synthetic deal succeeded, but the native installment selector did not respond; coordinate fallback failed with Computer Use noWindowsAvailable even though accessibility still exposed the window. No Electron payment was submitted. This is a control failure, not evidence of a financial calculation failure or a permission denial.

Browser Promises showed total active balance $1,500 ($900 Pending and $600 Broken), retained historical rows, and the fixture current $500 promise. A new browser partial-promise $100 attempt was rejected before submission because the automated date entry had not committed. After native date entry, Save opened confirmation; dialog handling then timed out and the Chrome content became blank. A subsequent dialog inspection found no active dialog. A staging-only read-only database check confirmed the fixture still had exactly the existing active $500 and voided $200 payments, with no new $100 payment. Do not assume this attempted operation succeeded, and recheck persisted state before resuming.

Current UI control blockers: Electron native selector/noWindowsAvailable, and Chrome blank content/focus-emulation timeouts around confirmation. No new financial code or SQL change was made. Full UI matrix, actual network-recovery and duplicate-click validation remain incomplete; production readiness is NOT approved. The next step is restore stable UI control, re-read this fixture, and resume the pending partial-promise transaction only after confirming its outcome.

## Web production rollout and rollback plan (not executed)

1. Inspect the owning Vercel project, Git production branch, Vite build/root settings, SPA rewrites, and environment variable target metadata. Preserve a private before/after comparison of production configuration without printing values.
2. Create a Preview-target deployment from the reviewed working tree without committing or pushing. Supply staging Supabase values at preview build time only; prevent production credentials from entering the artifact. Prefer deployment-scoped overrides to changing shared production settings. Confirm the deployed bundle contains only the staging backend host. Keep preview protection intact.
3. Complete authenticated financial, idempotency, refresh/direct-routing, export/receipt and console-error acceptance on that deployed URL. Review results before any production action.
4. After explicit production approval, check schema drift and backup/recovery readiness; install the reviewed migration with activation disabled. Do not repair legacy anomalies.
5. During a coordinated payment-write pause, deploy a fresh production build using production environment values. **Never promote the staging-built preview artifact:** Vite embeds its staging backend at build time. Verify intended production host before resuming writes.
6. Activate the RPC guard only after compatible web clients are available and stale writers are addressed. Validate authorized initial operations and monitor errors, ledger retries, valid-payment totals and active promise balances.
7. Before activation, revert the web release to the previous production artifact if necessary, leaving inactive additive database objects in place. After activation, pause RPC writes and preserve the ledger/financial guards; do not restore direct legacy writers or toggle activation off as a shortcut. Fix forward or roll back only to an RPC-compatible frontend. Preserve committed financial records throughout.

Current recommendation: **not yet ready for production**, because actual Vercel preview acceptance and remaining browser retry/double-click scenarios are incomplete. Electron tooling failures are irrelevant to this decision.

## Web-only acceptance checkpoint

| Area | Current evidence / remaining work |
| --- | --- |
| Backend staging | Previously passed authenticated RPC, RLS rejection, atomic rollback, authoritative void, reschedule and durable ledger integration tests; no migration changes in this phase. |
| Browser staging | Login, full payment, partial plus promise, reschedule and void previously passed. Due Payments, Account Summary and actual Full Deals CSV agree on the saved fixture. Complete remaining matrix on deployed preview. |
| Vercel preview | Not created. Plugin teams response empty; listing projects with the visible workspace slug also failed. No project configuration or environment values were changed. Production environment equality is not yet independently verified. |
| Cross-screen | Saved fixture: $500 valid paid, $500 deal balance, one $500 active promise. CSV retains historical Rescheduled $300 without counting it. Dashboard/Reports portfolio totals agree at $4,200 collected / $3,800 remaining. |
| Idempotency | Helper and authenticated API tests passed earlier. Actual browser double-click and uncertain-response recovery remain unverified; do not substitute API results for UI acceptance. |
| Application defects | No new confirmed financial defect from these checks. Acceptance gaps and tool errors are not classified as application defects. |
| Ignorable tooling | All Electron findings are out of scope. Date-fill interaction was a test automation issue. Chrome control failures are tooling issues, but outstanding browser acceptance still needs completion. |

The browser recovered during this phase. The prepared $100 partial-promise submission was attempted again and a JavaScript confirmation was positively observed. It has NOT been accepted or reported as saved. Chrome then reported user window interaction; foreground automation stopped to avoid fighting the user. The preserved staging tab is 1986596265, at the existing fixture detail page. Recheck dialog and persisted state before proceeding; never blindly resubmit.

Awaiting connection to the owning Vercel account or its project dashboard URL. Once available, inspect configuration and create only a staging-backed Preview deployment, then finish web acceptance there. No source implementation, Electron code, production backend, production deployment, subscription, commit or push was changed in this phase.

## September 10 Vercel access check

Authenticated dashboard inspection confirmed the Hobby workspace `pinnamsampath-3471s-projects`, project `rk-paytrack-supabase`, linked GitHub repository `sampathbhargav/rk-paytrack-supabase`, and production domain `rk-paytrack.vercel.app`. An older feature-branch preview exists; its backend has not been verified and it is not approved for synthetic transactions.

The Vercel plugin returns an empty teams list and a specific **403 Forbidden** for this project. Browser workspace viewing succeeded, but project navigation then failed with Chrome focus/navigation timeouts and native AX cannotComplete. No environment settings were reached or changed. Final staging deployment requires a Vercel connection authorized for this workspace (or a functioning authenticated CLI); no preview was deployed. Production Supabase and Vercel remain untouched by this work. `git diff --check` passed.

## Local Vite acceptance — September 10–11 checkpoint

Current working tree was launched using `npm run dev -- --host 127.0.0.1 --port 5180 --strictPort` with process-only staging credentials. The served `src/supabaseClient.js` module was checked and contained only the approved staging host. No production env file changed. Login and Dashboard loaded in the browser. Missing Start Date was rejected by native form validation. A complete one-installment $500 form showed first/maturity date September 1 from start August 1, due day 1, term 1. Create Deal reached a confirmation but did not persist: September 11 staging read-only lookup of `STG-WEB-0910-FULL` returned no rows. Deal creation is not yet a browser PASS.

Latest completed commands: build PASS (78 seconds, existing bundle warning); lint 99 errors / 5 warnings, unchanged; promise/request units 15/15 PASS; schedule parity 7/7 PASS against fresh current-migration local fixture; transaction, legacy and forward SQL suites PASS. Initial sandbox socket denial and an obsolete local fixture were resolved by using an authorized fresh disposable local PostgreSQL cluster. Normal-authenticated staging integration suite rerun PASS, including atomic rejected allocation, non-voided recalculation, reschedule, payoff/reopening, concurrency and request-helper recovery. These API/SQL tests do not substitute for the pending comprehensive browser matrix.

The earlier port-5180 session was affected by repeated filesystem-triggered restarts. The acceptance server was subsequently started on port 5181 with watching disabled. See the continuation below for the current server and acceptance state. No Vercel or Electron work is part of this phase. No production writes, legacy repairs, commits or pushes.

## September 11 continuation — existing port 5181

### Current validation method: manual actions, read-only verification

#### Production rollout executed after user authorization

See production-change-register.md for complete details. Migration 20260916015910 installed, production Vercel deployment dpl_8Y1DhwGi9bi6P87r2fRquo2iQUHx READY, and payment flag activated 2026-09-16 02:16:28 UTC. Backup integrity and public smoke checks passed. Remaining preview tests were waived by the user, not marked passed. Authenticated production checks await user sign-in. No legacy repair, synthetic production payment, Git commit or push.

#### Production rollout executed after user authorization

Migration 20260916015910 installed; Vercel deployment dpl_8Y1DhwGi9bi6P87r2fRquo2iQUHx READY at rk-paytrack.vercel.app; flag enabled at 2026-09-16 02:16:28 UTC. Backup archive integrity, live asset/backend target, login and public routing checks passed. See production-change-register.md. Authenticated production-user smoke checks remain pending. No historical repair or Git commit/push.

#### September 15 — release scope decision

User requested proceeding toward production without repeating all business flows in Vercel. Remaining preview reschedule/void/retry and other uncompleted preview checks remain NOT TESTED, not PASS. Production change inventory and execution status are tracked in production-change-register.md. No production mutation or deployment has occurred at this decision point.


#### Vercel preview partial payment + promise — financial persistence and duplicate prevention PASS

Manual preview submission on STG-WEB-SCHEDULE-31 (bbb9973a-e224-4d11-99d0-a5eddd924fee) created exactly one new Active Cash $200 payment bec63a6f-7c5d-4121-89be-97989d73b1e3 against 2027-03-31. Two valid payments now total $700; deal remains Active with $800 balance ($300 second installment plus $500 third installment). Pending root promise 426d8481-f69b-4a66-8311-43a7e03d9a72 has amount_due $500, amount_paid $200, remaining_amount $300, original/promised date 2027-03-31. Customer Detail, Account Summary, payment history and promise history agree.

Preview Due Payments filtered to 2027-03-31 independently shows scheduled remaining $300, promise remaining $300, and combined Total Due $300, counted once. Total Follow-Ups displays 2 (the two displayed rows), not two monetary obligations. No financial double counting observed.

Date deviation: payment and durable request 18f9c389-2d15-4b2c-9c2b-cf84ff687644 both contain 2026-09-14; prior test instructions requested 2026-09-28. User selection is unconfirmed. Backend preserved the submitted date; no automatic correction or date-selection PASS claimed.

Reports navigation clicks did not leave Due Payments in this automation session; current post-partial Reports/Dashboard totals and receipt remain NOT TESTED. This alone does not establish an application navigation defect. Prior full-payment Reports pass remains valid for that earlier snapshot. No code change, database write, production operation, commit or push performed. Next manual preview action: reschedule this $300 promise to April 5, 2027, then read-only verify historical parent/current child and unchanged $700 paid/$800 deal balance.

#### Vercel preview full payment — PASS for persistence/account/Reports

User submitted full payment from deployed Preview. Read-only staging: exactly one Active Cash $500 payment 98fd2d1a-bc85-4e66-877f-8c9bde6792b9, payment date 2026-09-28, original due 2027-02-28, one record request 11d943d6-1bf2-4668-a935-45791dadb6f7. STG-WEB-SCHEDULE-31 stays Active; total $1,500, paid $500, remaining $1,000, zero promises. Fresh deployed Customer Detail/Account Summary/Payment History agree, first installment Paid/$0 remaining, next two $500 each. Reports after route reload: $8,600 collected/$10,400 deal balance/$8,900 combined collections. Existing already-open Reports tab initially showed its pre-payment snapshot until reloaded; fresh load is correct.

Next manual preview test: second installment 2027-03-31, $200 Cash, payment date 2026-09-28, promised date 2027-03-31. Expected two valid payment records totaling $700, $800 deal balance, second installment/promise remaining $300, third installment still $500. Matching promise/scheduled date intentionally exercises combined-due deduplication on March 31. Awaiting manual action; no financial writes by Codex, no production changes.

#### Vercel preview authenticated login and portfolio baseline: PASS

User completed synthetic staging login. Independently observed integrity-tester@example.invalid authenticated on preview. Dashboard: 24 Active deals, $19,000 financed, $8,100 collected, $10,900 balance; read-only staging aggregate query agrees. Direct navigation to /reports preserved login and rendered $8,100 deal collected/$10,900 balance/$8,400 combined maintenance+deal collected. No captured error/warning entries on these checks. Preview reads the expected synthetic staging data.

Next preview-only manual transaction fixture: STG-WEB-SCHEDULE-31 / bbb9973a-e224-4d11-99d0-a5eddd924fee. Read-only baseline Active, total/balance $1,500, zero payments/promises; installments $500 each on 2027-02-28, 2027-03-31, 2027-04-30. User to record full $500 Cash against first installment with payment date September 28, 2026. Expected exactly one payment, first remaining zero, deal $1,000 remaining/Active, no promises. No payment submitted by Codex; deployed financial-save acceptance awaits user action and database verification.

#### Vercel isolated preview — deployed and initial checks PASS

CLI 59.17.0 authenticated as pinnamsampath-3471. Built current working tree with explicit staging-only VITE inputs into temporary /private/tmp/rk-vercel-staging-preview/.vercel/output/static. Build passed; 17 output files, no SQL/env/source maps, staging host only. Manifest SHA-256 cb1152a02fe622b3e63344567e87c6fb3d592551cc0b3331c6423cb0c071430f. Temporary output config uses Build Output API v3 with filesystem handling then SPA index fallback. No repository dependency or environment file changed.

Uploaded prebuilt with explicit --target=preview to existing project. Deployment dpl_2zJvdT3wjo4JbLKc7b9exzpiU7UG READY: https://rk-paytrack-supabase-qoe4i8kh9-pinnamsampath-3471s-projects.vercel.app . Initial attempt with --skip-domain was rejected before upload because that option is production-only; successful retry used Preview target without it. No production promotion performed.

Post-upload production alias inspection confirms unchanged dpl_583FCqEnVFs7SAJS6JZHjT1owQsm, Ready, original September 1 production deployment. Shared Production/Preview Supabase variables were not edited. Anonymous fetch redirects to Vercel login due to deployment protection; this is not an application failure. Authenticated vercel curl checks pass: deployed entry JS byte-matches verified local staging build, contains only lsgzpvhyuswmvpxokhdt.supabase.co, and /login and /reports serve RK PayTrack. Protection retained.

Browser loads the application login normally, with no captured warning/error entries. Synthetic-user login and deployed payment acceptance remain pending manual sign-in. Do not promote this artifact to production: staging backend is embedded in its Vite bundle. No Supabase mutation, Git commit/push, production deployment, or plan change. Next: user signs in to the preview with integrity-tester@example.invalid, then validate deployed authenticated routes and financial workflows one manual transaction at a time with staging read-only verification.

#### Authenticated Vercel inspection — preview isolation plan

Browser sign-in succeeded. Verified team team_nrS8o4G1gmycHZVfETCkZMJj (pinnamsampath-3471s-projects), project prj_bC5rtAPkCCU1c4Bvv1T0QK693NQ1 / rk-paytrack-supabase. Production alias rk-paytrack.vercel.app is Ready, sourced from main commit 595a53a8be9ae0843b84000d1e8f65c5d5582fdf. Project uses Vite, root frontend, default build/install/output settings (dist output), Node 24.x. Existing feature/supabase-login preview is an older release, not acceptance evidence for this working tree.

Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are scoped jointly to Production and Preview. Values were not revealed or changed. A default preview cannot be assumed isolated. Proposed safe path: prepare a staging-built artifact from the reviewed working tree with explicit staging-only build inputs, verify its backend host, then upload as Preview with production aliasing disabled/default Preview target. Never promote that staging artifact to production: Vite embeds its staging backend at build time. Production requires a separate approved build with production inputs after its backend rollout. Preserve all shared project variables.

Plugin get_project with verified IDs still returns 403, despite browser access. No CLI/auth was found at checked standard locations; initiated cached CLI download/help only, no repository dependency change or deployment. CLI authentication is needed for uploading local uncommitted code without Git pushes. No production settings, variables, data or deployments changed. Current remote Node 24 differs from local Node 20 validation; preview build compatibility must be checked or use verified prebuilt static output. Exact upload command awaits CLI help/authentication.

#### Vercel preview preparation — account access required

User authorized continuing to Vercel inspection/preview preparation, not production rollout. Connected Vercel plugin list_teams returned an empty list; list_projects for the user-provided pinnamsampath-3471s-projects scope returned Failed to list projects. Opened the supplied team dashboard in the in-app browser; it redirects to Vercel login. Project identity, current environment-variable scopes and production configuration therefore remain unverified. No configuration or deployment was changed.

Local configuration contains SPA fallback rewrite /(.*) to /index.html and Vite base /. Candidate preview plan after access: identify the existing project's repository/root/build/output settings; verify staging-only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for the isolated preview without altering production targets; use the reviewed working tree via a preview-only deployment mechanism if supported, with no Git push; validate deployed auth, direct-route refresh, financial saves/recovery and exports. Exact command/configuration must be finalized after authenticated inspection, not guessed. User login to the opened Vercel dashboard is the immediate blocker; connector reauthorization may also be needed. Never expose keys. Production Supabase remains untouched; no commit or push.

#### Check receipt — user-verified PASS

Fresh authenticated Reports view independently shows September Check collections $500, deal collections $8,100, deal balance $10,900, combined deal/maintenance collections $8,400. These equal prior verified totals plus the two separate $500 Cash/Check payments. Check reporting and account/receipt coverage now pass (receipt user-verified). No fresh method-specific CSV was inspected at this checkpoint.

User confirmed the Check receipt correctly shows Check, $500, and September 28, 2026. Receipt rendering is user-verified rather than independently inspected by Codex; underlying payment values were independently verified in staging. No code or database changes.

#### Check payment — persistence and account rendering: PASS

Manual second payment verified read-only in staging: c228aeb3-6965-4425-a6a4-115c086c26ca, $500 Active, method Check, payment date 2026-09-28, installment 2027-03-30. Its record request c1517552-6dcf-4769-a2ad-5eb2ba435f9e is distinct from the preceding Cash request. Exactly two valid payments exist on STG-WEB-SCHEDULE-30, $1,000 collected/$500 balance, Active, zero promises. First two installments have zero remaining; April 30, 2027 remains $500.

Fresh authenticated browser Customer Detail, rendered Account Summary and Payment History all agree: separate Cash and Check $500 rows, two Paid installments and one $500 Due installment, no active promises. This passes Check submission/persistence and these account views; Check receipt and new method-specific Reports/export values still need verification. Prior September exports predate these two payments. No application changes or database mutations by Codex; staging reads only.

#### Check-attempt clarification — test-input mismatch confirmed

User confirmed Cash and September 28, 2026 were selected. Request ledger and saved payment faithfully reflect those selections; this is a test-input mismatch, not an established application defect. Preserve the valid synthetic $500 Cash payment. Non-Cash test remains pending. Next manual action: same synthetic STG-WEB-SCHEDULE-30, next unpaid installment March 30, 2027, $500, payment method explicitly Check and payment date September 28, 2026. Expected after verification: two distinct valid payments (one Cash, one Check), $1,000 collected/$500 balance, Active, no promises. No automated financial writes or record correction.

#### Check-payment attempt — method/date mismatch; not passed

User reported Check payment complete. Read-only staging shows exactly one new $500 Active payment, ID 4b2ec35a-16ea-4908-b470-cddd0a6e966a, for STG-WEB-SCHEDULE-30, due 2027-02-28. However its method is Cash and payment date is 2026-09-28, not the requested Check / 2027-02-28. Durable record request 90d2c441-2923-42d4-9149-43dca3e3ad66 contains paymentMethod Cash and paymentDate 2026-09-28, matching the stored payment: no evidence of backend method/date corruption. Whether the user selected different values or UI state changed is unresolved.

Financial checks pass: first installment paid $500/remaining zero, other two installments remain $500 each, deal balance $1,000/status Active, zero promises. Non-Cash acceptance remains NOT TESTED because this was a Cash request. Preserve this synthetic historical record; no correction, void, retry or new payment performed. Ask user what appeared in the form/confirmation before proceeding. September 2026 collections now include this $500; prior CSV snapshots predate it.

#### User decision and next manual test — non-Cash method

User explicitly chose to keep the existing partial-payment rule: a promised date is required. Promise-free partial payment is now excluded by the accepted business rule, not an unresolved defect or an implementation request. No code changed for this decision.

Prepared unused synthetic STG-WEB-SCHEDULE-30 (549f4dc3-17ef-4ef5-906d-b768475d124e) for a $500 Check payment against its February 28, 2027 installment, with payment date February 28, 2027. Read-only staging baseline: Active, $1,500 total/remaining, zero payments/promises; three $500 dates Feb 28, Mar 30, Apr 30, 2027. Current served frontend host independently confirmed staging-only. Expected after manual action: one valid Check payment $500, first installment remaining zero, deal remaining $1,000 and Active, no promise. This future-dated synthetic test belongs to February 2027 reports, not September 2026 collections. No payment submitted by Codex; awaiting user confirmation and read-only verification.

#### Current acceptance review after CSV validation

This checkpoint supersedes older pending/failure summaries below, while preserving their historical evidence. Core manually exercised payment/promise/void/recovery flows pass within the recorded limits. Dashboard Active count, recovery component visibility and deal-promise Collection Priority export defects are fixed and verified. Customer Balances, Past Due Promises, Past Due Scheduled, corrected Collection Priority and Daily Summary CSVs pass; Full Deals previously passed for its recorded snapshot. Build, 20 unit tests and seven schedule-parity tests pass; completed lint is 99 errors/5 warnings, unchanged.

Additional non-writing browser check: Add Deal direct route loaded authenticated. Empty Create Deal submission stayed on the form and focused customerName; customerName, dealTag, totalAmount, startDate, monthlyPayment, dueDay and term were invalid. No captured runtime errors. This proves empty-form rejection and required-field constraints, not every malformed schedule combination. Notes-only Edit Deal persistence and monthly February/day-30/day-31 schedules previously pass; full schedule-edit workflows remain untested.

Remaining decision: PaymentForm.jsx explicitly requires promisedDate for partial payments in both validation and input required attributes. Asked user whether to retain this existing business rule or allow promise-free partials. No rule changed pending response. Remaining coverage limits: actual browser non-Cash/referral-credit payments, comprehensive schedule edits/individual invalid inputs, and maintenance promise overlap are not validated by the current fixtures. Double-click evidence is one logical payment after manual attempt; concurrent same-request guarantee additionally rests on earlier authenticated integration tests. Vercel preview remains deferred and Electron out of scope. Do not claim production readiness or commit authorization from these results. Next action is resolve the partial-payment business rule, then scope any remaining local acceptance cases before final review.

#### September daily collection summary — CSV: PASS

Post-priority-fix lint has now completed: **99 errors / 5 warnings**, unchanged from the known baseline. Earlier pending-lint notes are superseded by this result. Build, 20 payment/request unit tests and seven schedule-parity tests previously passed for this fix.

User-exported `rk-paytrack-daily-collection-summary-2026-09.csv` (SHA-256 `54f98900d87f2c637a59f7c411befa3b6ad75fa5c52ae90f224a8c055bef0dcf`) reconciles on all six payment dates with read-only staging sums grouped by source, payment date, status and method. Deal cash $7,100; maintenance $300; combined cash/applied $7,400; referral credit $0; 32 valid payment records (29 deal, three maintenance). Per-day (deal/maintenance/count): Sep 1 5300/0/23; Sep 7 0/100/1; Sep 8 500/100/2; Sep 11 0/100/1; Sep 13 1100/0/4; Sep 14 200/0/1. All CSV arithmetic and date uniqueness checks pass.

Fourteen Voided deal-payment records totaling $2,700 are excluded from both collected amounts and counts (Sep 1 $2,200; Sep 8 $200; Sep 12 $300). September 12, which has only voids, correctly has no collection row. Payment_Count counts database payment records, not necessarily distinct split-payment submissions. Totals agree with verified Customer Balances CSV and Dashboard deal collections. No discrepancy or code fix; no file alteration, database mutation, production access, commit, push or deployment. This fixture covers Cash only; other payment methods/referral credits are not proven by this CSV.

#### September 15 — Collection Priority browser re-export: PASS

User refreshed and supplied `rk-paytrack-collection-priority-2026-09-15 (1).csv` (SHA-256 `b96d898724891279317f39e4294979ab7770ce8706b0c20da9cd7a481583472e`). Actual CSV contains 28 preserved follow-up rows: 20 scheduled plus eight promises. Amount sums to $5,900, fixing the original $8,200 overcount. Each overlapping promise has Amount=0, Original_Due_Date matching exactly one scheduled row, its actual balance retained in Promise_Remaining (sum $2,300), and explicit non-additive explanation.

Compared every row with the original export by type/reference/date: no missing or new follow-ups; dates, statuses, days overdue and notes unchanged; scheduled amounts unchanged; each original promise Amount equals new Promise_Remaining. These amounts match the immediately preceding staging read-only reconciliation; no new database test/mutation was necessary. This closes the reported deal-promise priority-export FAIL. Maintenance overlap remains outside this fixture's coverage. Latest lint log still has no completion result; do not claim a new lint count. Files were inspected without alteration; no production access, deployment, commit or push.

#### September 15 — Collection Priority CSV defect and local fix

Supplied `rk-paytrack-collection-priority-2026-09-15.csv` fails additive-amount acceptance: 20 scheduled rows total $5,900, with eight overlapping current promise rows adding $2,300 into the same Amount column ($8,200). The underlying obligations were verified against staging in the preceding two export checks. Root cause: buildCollectionPriorityRows concatenated both amounts without identifying overlap.

Local Reports.jsx fix retains promise follow-up rows but sets Amount to zero when that exact deal/original due date is already represented by a scheduled row. Adds Promise_Remaining, Original_Due_Date and Amount_Explanation columns on every output row (required because exportToCsv uses first-row headers). A shared isPromiseCoveredBySchedule helper in promiseUtils.js now serves both this export and existing getCombinedDueAmount. Separate installments remain additive; ambiguous legacy identities are not inferred. Maintenance behavior remains unchanged and is not validated for overlapping maintenance obligations by this fixture.

Validation: payment/request units 20/20, local schedule parity 7/7, build and git diff --check passed. New lint run remains pending with no completion count; previous completed baseline is 99 errors/5 warnings. Restarted only verified local Vite, retaining watch:null and staging-only process environment. Served module confirms the explanation and only lsgzpvhyuswmvpxokhdt.supabase.co. Fresh manual browser re-export is required to close this FAIL; expected 28 follow-up rows, Amount total $5,900, separately labeled overlapping Promise_Remaining $2,300. No database mutations, production access, deployment, commit or push.

#### September 15 export — Past Due Scheduled CSV: PASS

User-supplied `rk-paytrack-past-due-scheduled-2026-09-15.csv` (SHA-256 `112768884f6b5fa655b23822ed7baa03e20c108ffd99f7cc1436d3af20695012`) has 20 unique deal/due-date rows. Totals: $10,000 scheduled, $4,100 valid paid against these installments, $5,900 remaining. Every row matches a read-only staging query of Active deals using rk_payment_private.schedule and payments joined by deal and due date, excluding Voided payments. No missing or extra rows found. Dates are September 1, 2026, correctly 14 days past due at the September 15 export date; all per-row arithmetic passes.

Void regression rows remain correct: WEB-FULL $0 paid/$500 remaining; WEB-BROKEN $0/$500; WEB-PARTIAL $400/$100. Recovery and legitimate separate-payment fixtures both show $200/$300. Scheduled total agrees with prior Dashboard scheduled past-due $5,900. This is a scheduled-debt report, not a combined collection-priority report: the separately verified $2,300 overdue promises describe overlapping installment debt and must not be added to $5,900. No code fix needed, file unchanged, all database access staging-only/read-only. Moved/skipped installments are absent from this export and therefore not covered by this file check.

#### September 15 export — Past Due Promises CSV: PASS

User-supplied `rk-paytrack-past-due-promises-2026-09-15.csv` (SHA-256 `f600f2c1bf39824f3b7a993c38ef8ae8eea34b799c69aeb8addc23dbe520ddbf`) contains eight distinct deal/installment obligations totaling $2,300 remaining. All dates precede the export date; all amounts satisfy amount due minus paid equals remaining. Read-only staging comparison of complete promise history confirms each row matches the current unsuperseded obligation: three STG-PARTIAL rows at $200, three STG-BROKEN rows at $300, WEB-SEPARATE $300, WEB-BROKEN $500. Historical Rescheduled/Partial Paid versions, the Paid zero-balance promise, and future current promises are excluded. No maintenance promises exist in staging, correctly yielding no maintenance export rows.

Three stored Pending promises display/export Broken because promisesApi derives overdue status at read time; this matches current application behavior and is not a missing database update or a repair requirement. Their dates and amounts match exactly. No duplicate obligations or financial discrepancies found, no code changes required. CSV left unchanged; Supabase queries were staging-only/read-only. This verifies the supplied September 15 export, not future date-boundary behavior.

#### September 14 — Customer Balance CSV: PASS

Inspected user-exported `rk-paytrack-customer-balance-report-2026-09-14.csv` (SHA-256 `baf196e45fc20d7852e1c64784400206b72ceb63f841b694ca3fdfd4b3865454`) without altering it. Five customer rows, 29 deals: $19,000 financed, $7,100 valid deal cash collected, $0 referral credit, $11,900 deal balance. Separate maintenance totals: three jobs, $300 invoiced/$300 paid/$0 remaining. Combined cash is correctly $7,400; combined balance $11,900. Deal totals agree with the previously observed Dashboard/Reports portfolio values. Every row passes financed-minus-applied, maintenance-total-minus-paid, combined balance, and combined cash arithmetic.

Read-only staging SQL grouped authoritative non-voided payment history by customer_id: (deal count/financed/paid/balance) 9/7500/1300/6200, 6/3500/1600/1900 twice for two distinct customer IDs, 7/4000/2600/1400, and 1/500/0/500. All match CSV rows; each of the three corresponding maintenance customer groups has one fully paid $100 job. Repeated synthetic customer names represent distinct database customers, not duplicated transactions. Export omits customer IDs, so the two identical-looking rows can only be reconciled as a multiset against these distinct groups. No financial discrepancy or code fix found. No production access or mutation. This validates Customer Balances only; other export types remain separately untested.

#### September 14 — notes-only Edit Deal persistence: PASS

After the user reported completion, read-only staging verification of `154713aa-1c1b-492c-bbb1-0713f3d5fcaa` confirmed notes now contain `Notes-only staging edit verified`; updated_at is 2026-09-14 14:14:57.781+00. Status remains Active, financed/balance $1,500, monthly $500, term 3, start 2028-01-31, due day 31, maturity 2028-04-30. There are still zero payments and zero promises. Authoritative schedule remains February 29, March 31 and April 30, 2028, each $500. The earlier unresponsive Save attempt did not require an application code change; its exact cause remains unconfirmed. This passes notes-only persistence, not comprehensive schedule editing. Browser tab inspected afterward was on Login, so a fresh post-save account render was not independently checked at this checkpoint. Latest post-Dashboard lint log still lacks a completion result.

#### September 14 — manual Edit Deal Save reported unresponsive

User clicked Save Changes after appending the notes-only marker. Read-only browser inspection found no invalid native form controls, no captured warning/error logs, and an enabled submit button attached to the form. The edited notes remain in the form. Staging read-only lookup still shows original notes and null updated_at: save has NOT succeeded. Source invokes window.confirm before either customer or deal writes; a cancelled/suppressed confirmation returns silently. Whether a confirmation appeared/was accepted is not yet established, so this is an unresolved UI failure, not a confirmed application root cause. No confirmation bypass, code change, or database mutation was performed. Next diagnostic: establish whether the user saw the confirmation; if it was absent, repeat manually in a normal browser against the same local staging server.

#### September 14 — Dashboard count fix verified; Edit Deal baseline

Fixed both Dashboard Active Deals cards to filter `status === "Active"`; previously they incorrectly displayed all 29 deals. Refreshed browser now shows 24 in both cards. Financial totals remain $19,000 financed, $7,100 collected, $11,900 remaining. The served local Supabase client was rechecked and contains only `lsgzpvhyuswmvpxokhdt.supabase.co`. Restarted watch-disabled staging Vite once to load source changes; no production changes.

Post-fix build completed successfully. Payment/promise unit tests passed 19/19. The first combined run's seven schedule failures were local socket permission errors; authorized schedule-parity rerun passed 7/7. Post-fix lint remains running at this checkpoint; the last completed baseline remains 99 errors / 5 warnings, so no new lint result is claimed yet.

Prepared Edit Deal on synthetic `STG-WEB-SCHEDULE-LEAP` (`154713aa-1c1b-492c-bbb1-0713f3d5fcaa`). Read-only staging baseline: Active; total $1,500; monthly $500; start 2028-01-31; due day 31; term 3; maturity 2028-04-30; zero payments and promises. Existing notes: `Synthetic staging schedule edge-case only; no payments.` Browser edit form matches these values and schedule total $1,500. Notes-only save awaits manual action; persistence is NOT TESTED yet. No database write performed during this checkpoint.

#### September 14 — consolidated local acceptance checkpoint

Recovered-payment Dashboard and Reports agree: $19,000 financed, $7,100 deal collected, $11,900 deal balance. Dashboard fixture shows $200 paid/$300 remaining. Due Payments September 20 shows LOST-RESPONSE once at $300 and PARTIAL once at $100, total $400, zero scheduled dues. Original lint and diagnostic lint logs now both finish with 99 errors / 5 warnings, unchanged from baseline; the additional unrestricted rerun is redundant and was still running at this checkpoint. The initial stall did not establish a source defect or a confirmed sandbox root cause. Build passed; payment/promise units 19/19 and schedule parity 7/7 passed after local PostgreSQL restart.

Stopped the verified temporary lost-response Vite process on port 5182 (PID 20028 and its npm parent 20000). Browser returned to normal staging port 5181. The fault adapter exists only in a temporary config, not repository source or production. The sole source fix during this recovery test was rendering the existing PaymentRecovery component in App.jsx. No production access/mutation, deployment, commit or push was performed.

| Business flow | Result | Evidence / limitation |
| --- | --- | --- |
| Deal creation | PASS | Earlier fresh deal saved through Add Deal and read back. |
| Monthly schedule generation | PASS | Normal, day 30/31, non-leap and leap February; browser and staging schedule agree. |
| Full payment | PASS | Single $500 payment and zero balance verified. |
| Partial payment without promise | NOT TESTED | Existing UI requires a promised date; product decision needed before changing that rule. |
| Partial payment with promise | PASS | $200 paid/$300 remaining; obligation counted once. |
| Additional promise payment | PASS | Partial and full settlement checked with preserved history. |
| Promise reschedule / Broken | PASS | Active child counted once; historical parent excluded. |
| Full / partial / selective multiple-payment void | PASS | Valid payment history determines remaining amounts. |
| Paid Off / reopening | PASS | Full and multi-payment promise settlement then selective void verified. |
| Double-click protection | PASS | User double-click attempt produced one payment; does not prove two browser requests reached RPC. |
| Retry after lost response and refresh | PASS | Controlled post-commit transport loss; same durable request and payment recovered. |
| Legitimate separate equal payments | PASS | Two $100 payments, distinct request IDs, $300 remaining. |
| Atomic rollback | PASS | Earlier authenticated staging/SQL controlled-failure evidence; not repeated through browser. |
| Due Payments monetary totals | PASS | Same-day scheduled/promise overlap deduplicated; recovered promise counted once. |
| Dashboard / Customer Detail / Reports money | PASS | Observed fixture and portfolio comparisons agree. |
| Full Deals CSV | PASS | Supplied 25-row export reconciled before newer fixtures; other export types not checked. |
| Receipt | PASS | Earlier full/partial receipts independently checked; latest separate-payment receipt user-verified only. |
| Account Summary | PASS | Observed payment/void/recovery balances agree. |
| Refresh / logout-login persistence | PASS | Saved state preserved; recovery also survived reload. |
| Missing schedule fields / Edit Deal | NOT TESTED | Comprehensive current browser checks remain incomplete. |

Remaining application issue: Dashboard labels all deals as Active Deals (29 versus Reports 24 at this checkpoint); money is unaffected. Due Payments follow-up count counts rows (scheduled and promise) rather than unique obligations; monetary total is correct. Nonfatal React key/style warnings were observed earlier. Remaining scope gaps include other requested CSV types, complete Add/Edit Deal and missing-field checks, and Vercel preview acceptance (explicitly deferred). Electron is out of scope. No final production-readiness approval: core tested financial flows pass, but the listed gaps and existing Dashboard label issue must be reviewed before committing or considering rollout.

#### Lost-response recovery after refresh: PASS

User refreshed the same port-5182 tab, selected Recover Payment and opened the confirmed account. Browser shows “Operation confirmed. Review the account before recording another payment.” Read-only staging inspection confirms the original request ID `8bbe31bb-1911-4f1a-a062-c9a4ab17f330` remains the only ledger operation for this fixture, and original payment `8e8626ce-70c8-4f6c-be20-787e5ca5e053` remains the only payment ($200 Active). Original promise `05de0cac-1ec9-498b-b0ba-7bb33203f61e` remains Pending with $300 remaining. No duplicate payment, promise or new request was created.

Customer Detail, schedule, Payment History, Promise History and Account Summary agree on $200 collected/$300 remaining. This completes the actual-browser persisted-request recovery scenario using controlled post-commit response-loss injection and manual recovery after reload. It does not claim a physical network outage was tested. Cross-screen portfolio/export checks specifically for this fixture remain unperformed. The recovery component restoration is the one source fix made during this test; build and 19 unit/7 parity tests passed as recorded above. The existing npm lint process still has no final output at this checkpoint, so the current lint count is unverified. Temporary port 5182 harness cleanup remains to be completed after final screen checks. No production changes, commit, push or deployment.

#### Lost-response test — committed state verified; recovery awaiting user

User observed the deliberate lost-response error on port 5182. Codex independently observed the same error and visible Recover Payment button in the authenticated browser. Read-only staging inspection confirms one Active $200 payment `8e8626ce-70c8-4f6c-be20-787e5ca5e053`, allocated to September 1 (entered payment date September 14), and one Pending $300 promise `05de0cac-1ec9-498b-b0ba-7bb33203f61e` for September 20. Deal remains Active, $500 total, valid collected $200, balance $300. The completed durable record operation has request ID `8bbe31bb-1911-4f1a-a062-c9a4ab17f330` and stores this same payment/promise result.

The form still displays its pre-submission $500 balance after the lost response; it explicitly says payment was not confirmed. This is not authoritative post-commit state. Do not submit a new payment. Next user action: refresh the same 5182 tab, click Recover Payment, then Open confirmed account. Verify the same ledger request/payment IDs and unchanged counts before marking recovery PASS. No automatic recovery action or financial write was performed by Codex. Lint output still has no completed result at this checkpoint; its baseline comparison remains pending.

#### Browser lost-response preparation — recovery UI defect fixed; manual test pending

Found the current App.jsx imported PaymentRecovery but commented out its render. This removed the visible recovery action required after uncertain payment outcomes. Restored the existing `<PaymentRecovery />` component with a one-line local change; confirmation behavior and financial calculations are unchanged. Build passes (1m24s, existing bundle-size warning). Payment/promise units pass 19/19. Schedule parity initially could not connect to the stopped disposable local PostgreSQL instance; after restarting that local instance, 7/7 pass. Lint was started and remains running at this checkpoint; do not claim a current baseline comparison yet.

Prepared synthetic staging deal STG-WEB-LOST-RESPONSE (`61108294-1c9b-4b23-b696-73dd12a03c94`), $500 total/one September 1 installment. Read-only baseline: Active, zero payments/promises. A temporary Vite config `/tmp/rk-lost-response-vite.config.mjs` serves the current working tree on port 5182, watch disabled, leaving 5181 unchanged. Its dev-only Supabase fetch adapter rejects non-staging hosts and discards exactly one successful record-operation response for this fixture after reading the real successful RPC result. A sessionStorage marker permits subsequent responses, including after reload in the same tab. No credentials are embedded in the config or logs. The served client was checked HTTP 200, staging host only, adapter/fixture guard present; served App renders PaymentRecovery.

This is controlled post-commit response-loss injection, not an actual network outage. No payment has been submitted by Codex. Port 5182 has separate origin storage; user staging login is required. Next: user submits one $200 Cash payment with remaining $300 promised September 20, observes the intentional error, then stops. Codex must verify database commit before directing browser reload and Recover Payment in the same tab/origin. Success requires the same request ID, one payment, $200 valid paid/$300 remaining, and recovery of the original result. Do not close the test tab or clear its storage during the test. Browser lost-response acceptance is NOT TESTED until those manual steps and read-only checks complete. Stop the temporary server after validation. No production changes, deployment, commit or push.

#### September 13 — monthly schedule edge cases: PASS

Created three fresh synthetic staging deals using the existing synthetic customer (fixture setup only). Each has $500 monthly payment, term 3 and total $1,500. Inspected authenticated local Customer Detail schedules and Account Summary, then compared with read-only staging `rk_payment_private.schedule` results. All three match exactly, with zero payments/promises, $0 collected and $1,500 remaining per deal.

| Fixture / ID | Start / due day | Browser and PostgreSQL installment dates | Maturity | Result |
| --- | --- | --- | --- | --- |
| STG-WEB-SCHEDULE-30 / 549f4dc3-17ef-4ef5-906d-b768475d124e | 2027-01-30 / 30 | 2027-02-28, 2027-03-30, 2027-04-30 | 2027-04-30 | PASS |
| STG-WEB-SCHEDULE-31 / bbb9973a-e224-4d11-99d0-a5eddd924fee | 2027-01-31 / 31 | 2027-02-28, 2027-03-31, 2027-04-30 | 2027-04-30 | PASS |
| STG-WEB-SCHEDULE-LEAP / 154713aa-1c1b-492c-bbb1-0713f3d5fcaa | 2028-01-31 / 31 | 2028-02-29, 2028-03-31, 2028-04-30 | 2028-04-30 | PASS |

Each schedule has exactly three $500 installments, begins the month after start, clamps to February/April month ends, and restores the configured due day in March rather than drifting. Maturity matches the final installment in both browser and stored deal fields. This validates generated schedules and rendering, not Add Deal form creation for these fixtures, which were inserted through the staging plugin. Missing-field browser validation and actual-browser uncertain-response recovery remain distinct pending checks. The fixtures add $4,500 to staging financed/open balances; prior CSV totals were captured before their creation. No application code, production records, subscriptions, deployments or Git commits were changed. Existing passing tests were not rerun for this documentation/fixture-only step.

#### September 13 — supplied Full Deals CSV: PASS for checked financial values

Read the user's downloaded `rk-paytrack-full-deals-report-2026-09-13.csv` without modifying it (SHA-256 `bb1d62be94a5b2e43dd2196770e34bf618f92f889d61dcf9270650c8da1c68c9`). It contains 25 rows, 25 unique deal tags, all prefixed STG-. Decimal arithmetic across all rows gives $14,000 total amount, $6,900 cash collected/total paid and $7,100 balance, matching the previously observed Dashboard and Reports. Every row satisfies total amount minus total applied equals balance. Exported active promise amounts sum to $2,900; that aggregate was not independently reconciled to every staging promise in this check.

| Synthetic fixture | Cash collected | Balance | Active promise amount | Valid payment count |
| --- | ---: | ---: | ---: | ---: |
| STG-WEB-0913-SEPARATE | $200 | $300 | $300 | 2 |
| STG-WEB-0912-DOUBLE | $500 | $0 | $0 | 1 |
| STG-WEB-0912-BROKEN | $0 | $500 | $500 | 0 |
| STG-WEB-0911-PARTIAL | $400 | $100 | $100 | 1 |
| STG-WEB-0911-FULL | $0 | $500 | $0 | 0 |

These five rows match the previously read staging states. SEPARATE exports both historical Rescheduled $300 and current Broken $300 in Promise_History, but Active_Promise_Count is 1 and Active_Promise_Amount is $300. PARTIAL retains historical $300/$200 promises in history but counts only the current $100. Voided payments do not inflate collected totals or payment counts. Payment_History in this export contains only valid payments, so it is not a complete void audit trail; the voided records remain in the database/application history verified earlier. No source change is indicated by these checks.

User also reported that the latest $100 receipt looked correct. Record that receipt as user-verified only; Codex did not independently inspect its rendered content. Other CSV types, independent receipt validation, schedule edge cases and actual-browser uncertain-response recovery remain outstanding. No workbook edits, database writes, deployment, commit or push occurred.

#### September 13 evening — same-date scheduled/promise overlap: PASS

Read-only staging verification after user rescheduling confirms the two Active $100 payments are unchanged. Original promise `7fc2c631-c911-4c08-ab41-a98ebbe6d862` remains historical Rescheduled for September 20. Child `b73dc448-fcbe-4019-8e27-1eea1db9fbc1` has original due and promised date September 1, remaining $300 and Broken status (date is past). Deal remains Active, $200 collected/$300 outstanding.

Customer Detail, schedule, Account Summary and Promise History show $300 current balance and preserve the historical promise without adding it to active balance. Due Payments selected September 1 displays this deal in both its scheduled and promise sections, but deduplicates the monetary total: portfolio scheduled amount $5,600, promise amount $300, combined Total Due $5,600, not $5,900. This fixture therefore contributes $300 once. Total Follow-Ups displays 20 for 19 scheduled rows plus one promise row; that is a row count, not a unique-obligation count, and is distinct from the verified monetary deduplication.

Selecting September 20 confirms the rescheduled fixture is absent; only the separate reopened $100 promise remains, with combined Total Due $100. No code change or financial write was made during verification. Fresh CSV/receipt acceptance, browser uncertain-response recovery and schedule edge cases remain pending; this is not full release signoff.

#### September 13 evening — second equal payment browser comparison: PASS

After user opened the authenticated local deal, Customer Detail, installment schedule, Payment History, Promise History and Account Summary for `STG-WEB-0913-SEPARATE` confirm two $100 payments, $200 valid collected, $300 remaining and one Pending $300 promise. This completes the observed browser/database legitimate-equal-payments check with the distinct ledger request IDs recorded below.

Dashboard fixture row shows $500 due/$200 paid/$300 remaining. Dashboard and Reports agree on $14,000 financed, $6,900 deal collected and $7,100 deal open balance. Due Payments selected September 20 shows this fixture once at $300 and the previously reopened `STG-WEB-0911-PARTIAL` promise once at $100: two promises, zero scheduled dues, combined total $400. Thus the reopened promise Due Payments comparison also passes. The existing Dashboard Active Deals label discrepancy persists (25 versus Reports 20). CSV and receipt checks remain pending for this fixture; no claim is made that all acceptance work is complete.

Browser control recovered after manual opening/login. Date-control fill initially did not persist; focusing the control before keyboard date entry produced an observed Selected Date of September 20 and correct rows. No code change was needed. Next manual test targets same-date scheduled/promise overlap: reschedule this fixture's current $300 promise to its original installment date, September 1, 2026, without a payment. Expected payments unchanged, $300 remaining, historical promise preserved, and a single $300 contribution to combined Due Payments on September 1. Await user action and read-only verification. Production, implementation code and Git remain unchanged.

#### September 13 evening — two legitimate equal payments: database PASS

Server recovery follow-up: Vite reports ready on port 5181 with watching disabled. HTTP verification of the served Supabase client returned 200 and exactly `lsgzpvhyuswmvpxokhdt.supabase.co`. Browser navigation then timed out on Page.navigate, and tab inspection timed out/reset the CUA kernel. Browser comparisons remain NOT TESTED for the second payment due to tooling; the local server and staging-only served configuration are verified. Next step is user opening the restored local application and logging into staging, without entering another payment, before resuming read-only screen comparisons.

Resume inspection of `STG-WEB-0913-SEPARATE` confirms two Active $100 payments: original `66397c18-f3cf-4bb4-a8d4-a653ec40551a` and new `ac7286ab-9d7c-4dcd-9253-56138ae20348`. Total valid paid $200 against $500, remaining $300, deal Active. The same Pending root promise `7fc2c631-c911-4c08-ab41-a98ebbe6d862` now has $300 remaining; no duplicate promise was created. Two record operations have distinct durable request IDs: `820979a1-f701-40f0-9af4-c8893defad04` and `1e7a9c96-a419-4135-9777-4dc5b0978f14`. Idempotency accepted both intentional equal-amount payments; this does not substitute for lost-response retry testing.

At resume, no in-app tabs remained and opening port 5181 returned ERR_CONNECTION_REFUSED. Restarting the existing staging-only configuration required escalation after sandbox listen EPERM; this is a local tooling issue, not a payment defect. Post-second-payment browser comparisons remain pending until the server and authenticated browser are restored. Production remained untouched; no financial writes were performed by Codex in this verification.

#### September 13 — first of two intentional equal payments: PASS; second pending

User submitted the first $100 on `STG-WEB-0913-SEPARATE` (`ef19639d-526e-4b69-ab55-5a246b941a4b`). Read-only staging inspection confirms exactly one Active $100 payment `66397c18-f3cf-4bb4-a8d4-a653ec40551a`, allocated to September 1, valid collected $100, Active deal and $400 balance. One Pending root promise `7fc2c631-c911-4c08-ab41-a98ebbe6d862` has amount due $500, paid $100, remaining $400, promised September 20. The durable ledger contains one record operation for this deal, request ID `820979a1-f701-40f0-9af4-c8893defad04`.

Browser Customer Detail, schedule, Payment History, Promise History and Account Summary agree on $100 collected/$400 remaining and one current $400 promise. The two-legitimate-payments scenario is not yet complete. Next action: reopen Take Payment from Customer Detail and intentionally submit another $100 Cash against the same September 1 installment, using today's payment date and September 20 promised date. Expected two separate valid $100 payments, $200 collected, $300 remaining, and a distinct second request ID. Do not use a retry/recovery action for this intentional new payment. Verify read-only after user confirmation. Portfolio screens and exports remain pending for this fixture. No implementation or database mutations occurred during this verification.

#### September 13 — paid promise reopening after selective void: PASS

User voided $100 payment `9ac8f174-8751-418b-9f6b-c9e067bcf361` on `STG-WEB-0911-PARTIAL`. Read-only staging verification confirms that payment is now Voided, the earlier $200 remains Voided, and $400 payment `8a7c33a8-f007-4f48-96d8-a5500bcfabf0` remains valid (stored Paid). Three payment records remain; valid collected is $400 against $500, balance $100, deal reopened to Active. Current promise `3e06946a-c686-41bd-b972-beba358801b5` reopened from Paid to Pending, with cumulative paid $400 and remaining $100 for September 20. Both historical promise ancestors retain their prior values and statuses.

Customer Detail, schedule, Payment History, Promise History and Account Summary agree on $400 collected/$100 outstanding, with one active $100 promise. Dashboard fixture row also shows $400 paid/$100 remaining. Dashboard and Reports agree on portfolio financed $13,500, deal cash collected $6,700 and deal balance $6,800, captured before creating the next fixture. Dashboard's previously documented Active Deals count discrepancy remains (24 versus Reports 19); no new financial discrepancy was observed. Due Payments, receipt and CSV were not separately inspected for this void and remain pending cross-screen checks.

Prepared a new synthetic staging-only deal `STG-WEB-0913-SEPARATE`, ID `ef19639d-526e-4b69-ab55-5a246b941a4b`, for two legitimate separate $100 submissions. Fixture creation inserted only a staging deal, not payments or promises. Total/monthly $500, one September 1 installment. First manual action: pay $100 Cash using today's date, with September 20 promised date (required by current partial-payment form). Verify the first operation before instructing a second intentional $100 submission. This scenario remains pending. No implementation changes, production operations, deployment, commit or push occurred.

#### September 13 — full settlement of rescheduled promise: PASS for database and deal screens

After user submission on `STG-WEB-0911-PARTIAL`, staging read-only verification found exactly one new $400 payment `8a7c33a8-f007-4f48-96d8-a5500bcfabf0`, stored status Paid, allocated to September 1. The prior valid $100 remains and the $200 payment remains Voided: three historical records, two valid payments totaling $500. Deal status is Paid Off and balance $0. Current promise `3e06946a-c686-41bd-b972-beba358801b5` is Paid with $500 cumulative paid and $0 remaining. Both historical ancestors are unchanged; no new promise was created.

Authenticated local Customer Detail, schedule, Payment History, Promise History and Account Summary agree on $500 valid collected and $0 outstanding. Promise History preserves all three promises but counts zero active obligations. Account Summary shows no open installment or active promise. The grouped Payment History displays the new stored Paid payment as Active; both denote non-voided payment here, with no financial discrepancy. Dashboard, Reports, Due Payments and the new receipt/export were not separately rechecked in this step and remain pending for this transaction.

Next manual test: void only the existing $100 payment `9ac8f174-8751-418b-9f6b-c9e067bcf361`, dated September 12. Preserve the new $400 payment and previously voided $200. Expected valid collected $400, outstanding $100, reopened current promise with $100 remaining, and deal Active. Await user action before read-only verification. No application code, schema, production data, deployment or Git changes were made; only this report was updated.

#### September 13 — refresh/logout/login persistence: PASS

User completed refresh, logout and staging login for `STG-WEB-0912-DOUBLE` (`23f5d834-d434-4c3f-a8ce-990761390c7f`). Read-only staging verification still found the same single Active $500 payment `c60cd8ab-9f0d-4c8e-91d2-874373f13aa4`, Paid Off deal status and no promises. Authenticated browser Customer Detail, Payment History, installment schedule and Account Summary agree: $500 collected, $0 remaining, one payment, no open installment or active promise. No duplicate was created by refresh/login. This verifies persistence, not uncertain-response recovery, which remains pending.

The existing local server is restored on port 5181 with staging configuration verified; its earlier unavailability is no longer the immediate blocker. No application or SQL changes were made for this verification.

Next manual scenario is full settlement of the current rescheduled promise on `STG-WEB-0911-PARTIAL` (`3d08678d-c29e-4465-a60b-45c4134c861e`). Read-only baseline: Active deal, $500 total, $100 valid paid, $400 outstanding. Current Pending promise `3e06946a-c686-41bd-b972-beba358801b5` has $400 remaining for September 20; the two historical promises remain excluded. User should choose Paid on that current promise and confirm a $400 Cash payment. Expected: one new $400 payment, $500 valid collected, zero balance, current promise resolved and Paid Off status, while historical and voided records remain. Await user completion before verification or another transaction.

#### Manual double-click outcome — one payment confirmed; transport coverage limited

User reported completion. September 13 read-only staging query confirms `STG-WEB-0912-DOUBLE` has exactly one Active $500 payment `c60cd8ab-9f0d-4c8e-91d2-874373f13aa4`, no promises, and Paid Off status. Customer Detail independently displayed one payment/transaction, $500 paid, $0 balance, and installment Paid. No duplicate resulted from the reported manual double-click: PASS for observed duplicate prevention. The user has not specified whether confirmation intercepted the second click; this does not establish two concurrent frontend requests, same-request retry, or lost-response recovery.

Navigation to Dashboard then failed with `net::ERR_CONNECTION_REFUSED` on the approved port 5181. Local inspection found no listening process on 5181 and the previous `/tmp/rk-staging-config.json` is absent; the temporary watch-disabled Vite config remains. No restart, alternate-port testing, or production access occurred. Dashboard/Reports/Due Payments/receipt comparisons for this payment remain incomplete. Restore and verify a staging-only 5181 server before the next manual transaction. Do not use the unrelated visible port 5173 server without environment verification. No code or database mutations were needed for this verification.

#### Multiple payments, void only the first — PASS

User voided $200 payment `0d8e21be-0ce1-4b03-85bf-e46e1aa79a46` on `STG-WEB-0911-PARTIAL`. Read-only staging confirms it is Voided while $100 payment `9ac8f174-8751-418b-9f6b-c9e067bcf361` remains valid (Partial). Valid total $100, deal total $500, remaining $400, status Active. Current Pending promise `3e06946a-c686-41bd-b972-beba358801b5` remains dated September 20 and recalculates to due $500, paid $100, remaining $400. Historical Partial Paid $300 and Rescheduled $200 rows are preserved unchanged and excluded from active balance.

Customer Detail, schedule, Account Summary and Promise History agree on $100 paid/$400 remaining, two historical payment records (one voided), three promise-history rows but one current promise. Due Payments September 20 shows one $400 promise and combined Total Due $400. Dashboard and Reports agree on $13,000 financed, $5,900 collected and $7,100 balance (before next fixture). No code changes or production modifications; fresh receipt/CSV checks remain pending.

#### Rapid double-click — awaiting manual action

Prepared staging-only synthetic deal `STG-WEB-0912-DOUBLE`, ID `23f5d834-d434-4c3f-a8ce-990761390c7f`, one $500 September 1 installment, Active, zero payments/promises confirmed read-only. User should enter $500 Cash and rapidly double-click Save Payment, then handle confirmation normally without intentionally starting another payment. Record whether the confirmation prevented the second click from reaching Save. Expected one logical payment. A single persisted row after this UI test does not by itself prove concurrent same-request transport handling or lost-response recovery; those remain distinct acceptance checks.

#### Partial-promise payment void — PASS

Read-only verification after the user's void on `STG-WEB-0912-BROKEN` confirms original $200 payment `afba14ba-2ec1-4f33-8598-c8c1a7305cb0` is retained as Voided. Valid paid is $0; deal Active, total/balance $500. Existing promise `ea126c00-5de0-4c9f-8571-a2fd5080506d` retains its ID and September 10 date, remains Broken, and now has amount due $500, paid $0, remaining $500. No duplicate promise was created.

Customer Detail, installment schedule, Promise History and Account Summary agree on $0 collected/$500 outstanding and one active Broken $500 promise. Payment History retains the Voided $200 and reason. Due Payments September 10 shows one Broken promise and combined Total Due $500. Dashboard and Reports agree on $13,000 financed, $6,100 collected (down $200), $6,900 balance (up $200); Dashboard broken-promise amount is $1,400 (up $200). No code or production changes. Receipt/CSV for this specific void were not separately inspected.

Next manual test: `STG-WEB-0911-PARTIAL` has the prior $200 and $100 non-voided payments and a current $200 promise rescheduled to September 20. Void only the $200 payment `0d8e21be-0ce1-4b03-85bf-e46e1aa79a46`, with reason `Synthetic staging multiple-payment void test`; keep the $100 payment intact. Expected valid paid $100 and current promise/deal remaining $400, with historical promises preserved and excluded from active totals. Await user completion before verification or another transaction.

#### Full-payment void and Paid Off reopening — PASS

After manual void, read-only staging confirms original payment `a807626a-cd10-40c4-b305-6ff263267804` remains as Voided with reason `Synthetic staging full-payment void test`. No replacement payment: valid paid $0, deal total/balance $500, status Active (previously Paid Off), zero promises. Customer Detail and Account Summary agree; installment is open/Past Due with $0 paid/$500 remaining. Payment History retains the $500 Voided row and reason, total valid paid $0, voided total $500. Its expanded allocation remains a historical snapshot; it is excluded from live balances. No receipt action was exposed for the voided row in the observed history view.

Dashboard and Reports show $13,000 financed, $6,300 deal collected (down $500), $6,700 balance (up $500). Reports Paid Off count falls to 4, Active count is 19. Due Payments for September 1 includes the fixture once at $500 due/$0 paid/$500 remaining; portfolio combined dues $5,200. Existing Dashboard count-label discrepancy remains separate. This verifies full-payment void and Paid Off reopening through manual browser action plus read-only database inspection; CSV remains pending. No code, SQL implementation, or production changes.

Next manual scenario uses the fresh broken-promise fixture `STG-WEB-0912-BROKEN`: void its sole $200 payment `afba14ba-2ec1-4f33-8598-c8c1a7305cb0` with reason `Synthetic staging partial-promise void test`. Baseline is one valid $200 payment and Broken promise $300; expected after void is $0 valid paid and $500 remaining on the existing overdue obligation. Do not perform the multiple-payment void on `STG-WEB-0911-PARTIAL` yet. Await completion and verify before continuing.

#### Broken promise — PASS (database and observed screens)

After user completion, read-only staging query confirms one Active $200 payment `afba14ba-2ec1-4f33-8598-c8c1a7305cb0`, payment/due date September 1, on `STG-WEB-0912-BROKEN`. Deal Active, $500 total, $300 remaining. Root promise `ea126c00-5de0-4c9f-8571-a2fd5080506d` has September 10 promised date, $300 remaining and stored status Broken.

Customer Detail schedule shows $500 due/$200 paid/$300 remaining, Partial with Promise Broken. Account Summary and Promise History show one Broken $300 promise. Dashboard displays the fixture in both its scheduled past-due and broken-promise sections as separate views of the same $300 obligation; portfolio balance does not add them together. Broken count is 4 and amount $1,200 (up one/$300). Dashboard and Reports agree: $13,000 financed, $6,800 deal collected, $6,200 deal balance. Due Payments selected September 10 has zero scheduled items, one Broken promise, and $300 combined Total Due. No duplicate obligation is included in that combined total. Receipt/CSV for this specific action were not separately inspected.

#### Full-payment void / Paid Off reopening — awaiting user

Read-only baseline reconfirmed `STG-WEB-0911-FULL` remains Paid Off with one Active $500 payment `a807626a-cd10-40c4-b305-6ff263267804`. User should open Payment History, expand Details for that $500 payment, select Void, enter reason `Synthetic staging full-payment void test`, then Confirm Void and accept confirmation. Expected: same payment retained as Voided, valid paid $0, installment and deal balance $500, deal reopened appropriately, no promise created. No void has been performed by Codex. Verify this operation before requesting any further transaction. Production and application code remain unchanged.

#### Promise reschedule — PASS (database and observed screens)

Read-only staging verification after the user's reschedule confirms unchanged $200/$100 non-voided payments, $300 collected and $200 balance on the Active deal. Promise chain: original `89a47e54-bf10-426b-82cb-31c9dc756097` remains Partial Paid ($300 historical); child `dc554db3-4789-4a0d-b9d1-4180005ddd86` is Rescheduled ($200 historical, September 15); new child `3e06946a-c686-41bd-b972-beba358801b5` is Pending ($200, September 20). Only the new child contributes to active balance.

Customer Detail, Account Summary and Promise History show $200 balance and one active promise; all three historical/current promise rows remain visible in history. Due Payments September 20 shows one $200 promise and $200 combined total; September 15 shows zero promises/total and no fixture row. Reports and Dashboard both retain $12,500 financed, $6,600 collected and $5,900 balance. Dashboard verification completed on resume. These totals precede the next fixture setup. No payment, historical promise, or production row was modified by verification. CSV verification remains pending.

#### Broken-promise manual fixture — awaiting user

Prepared new synthetic staging deal `STG-WEB-0912-BROKEN`, ID `e4dde5bb-05aa-4684-822a-25d8a032cf9e`, using the existing synthetic customer only. Total/monthly $500, start August 1, due day 1, term 1, maturity September 1, Active; read-only baseline confirms zero payments and promises. Only a new staging fixture deal was inserted.

Manual test: Take Payment, September 1 installment, $200 Cash, payment date September 1, 2026, promised date September 10, 2026; save/confirm once. These intentionally past dates test overdue behavior without changing the system clock or editing old promises. Expected valid paid $200, remaining $300 and one actionable overdue promise. Verify stored versus effective Broken status according to existing implementation after user confirmation, then compare Due Payments, Dashboard and history. Do not mark this scenario passed before verification.

#### Additional $100 promise payment — PASS (database and observed screens)

User completed the manual Promise History partial payment. Read-only staging verification confirms two distinct non-voided payments: original $200 `0d8e21be-0ce1-4b03-85bf-e46e1aa79a46` (Active) and new $100 `9ac8f174-8751-418b-9f6b-c9e067bcf361` (Partial), both applied to September 1. Total valid paid $300 against $500; balance $200; deal Active. Partial is an existing valid non-voided payment status.

Historical promise `89a47e54-bf10-426b-82cb-31c9dc756097` remains Partial Paid with its historical $300 remaining. Its child `dc554db3-4789-4a0d-b9d1-4180005ddd86` is Pending, due $500, cumulative paid $300, remaining $200, promised September 15. Only the child contributes to the current obligation. No historical repair or data alteration was performed during verification.

Customer Detail, schedule and Account Summary show $300 paid/$200 remaining. Promise History retains two rows but shows one active promise and $200 balance. Due Payments selected September 15 shows one promise, promise amount/combined Total Due $200, zero scheduled dues: the historical $300 is not added. Dashboard and Reports agree on $12,500 financed, $6,600 deal collected and $5,900 deal balance. A new receipt and CSV export for this step were not separately inspected; those checks remain pending rather than inferred from these screen passes.

Next manual scenario: reschedule the current Pending $200 promise from September 15 to September 20, 2026. No payment should be entered. Expected two payments totaling $300 unchanged, $200 current obligation, previous promise historical, and one current promise on September 20. Await user confirmation before read-only verification or another transaction.

#### Test 1 — manual full payment: PASS (financial workflow)

After the user confirmed submission, read-only staging inspection found exactly one new payment: `a807626a-cd10-40c4-b305-6ff263267804`, amount due/paid $500, payment and due date 2026-09-01, method Cash, status Active. Deal `STG-WEB-0911-FULL` is Paid Off; valid paid $500, total $500, balance $0, promise count zero. No further payment was submitted by Codex.

| Full-payment verification | Result |
| --- | --- |
| Database payment count / amount / status | PASS — one $500 Active record |
| Customer Detail and schedule | PASS — one payment; installment Paid, remaining $0; 100% paid; no promises |
| Paid Off | PASS — database and Customer Detail agree |
| Receipt | PASS — RK-STG-WEB-0911-FULL-267804, $500 Cash, $500 paid to date, $0 balance; date matches database |
| Account Summary | PASS — $500 collected/applied, $0 balance, no open installments/promises |
| Dashboard money totals | PASS — financed $12,000; collected $6,300 (up $500); balance $5,700 (down $500); past due $4,200 (down $500) |
| Reports money totals | PASS — receivable $12,000; deal collected $6,300; deal balance $5,700; Paid Off count 5 |
| Due Payments | PASS — selected original date September 1; fixture absent; remaining portfolio scheduled/combined dues $4,200 |

Separate nonfinancial discrepancy: Dashboard labels `deals.length` as Active Deals in two places (`src/pages/Dashboard.jsx`), showing 21 although staging and Reports show 16 Active and 5 Paid Off. Financial totals agree. This count-label defect is documented, not fixed in this verification step. Browser console also captured a border/borderColor shorthand conflict warning and a missing React key warning in PaymentHistory; no fatal runtime failure prevented these checks. No application/SQL implementation changes or repeated test runs occurred.

#### Test 2 — partial without promise: awaiting user

##### Completed action — partial WITH promise: PASS for observed financial checks

The user reported completion. Read-only staging verification found one Active $200 payment (`0d8e21be-0ce1-4b03-85bf-e46e1aa79a46`), payment date September 12, applied due date September 1; deal remains Active with $300 remaining. One root Pending promise (`89a47e54-bf10-426b-82cb-31c9dc756097`) exists: original due September 1, promised September 15, amount due $500, paid now $200, remaining $300, no parent.

Correction to the instructions below: `PaymentForm.jsx` explicitly requires a promised date for partial payments. Telling the user to leave it blank was a test-instruction error. This action validates partial-plus-promise, not partial-without-promise. The latter remains NOT TESTED through the browser because the current form disallows it; do not silently change this business rule or remove the saved promise. Whether promise-free partials should be enabled remains a product decision.

Cross-screen checks: Customer Detail shows $200 paid, $300 balance, 40% progress, one payment, one Pending promise and $300 open promise balance. Schedule is Partial ($500 due/$200 paid/$300 remaining). Promise History and Account Summary each show one current $300 promise for September 15. Receipt `RK-STG-WEB-0911-PARTIAL-A79A46` shows $200 Cash, $200 paid to date, $300 balance. Dashboard and Reports both show $12,500 financed, $6,500 deal collected, $6,000 deal balance. The Dashboard fixture row shows $300 remaining. Due Payments for September 15 shows exactly one $300 promise, zero scheduled dues, combined Total Due $300—not $500 or $800. Same-day scheduled-plus-promise overlap and fresh CSV export remain separate uncompleted checks.

No payment/promise data was changed during verification, and no code changes were made. Next manual step: on this deal's Promise History, choose Partial, pay $100 Cash with payment date September 12 and new promised date September 15, then Save Partial Payment and accept confirmation. Expected cumulative valid paid $300 and current authoritative remaining $200; verify old/new promise relationship and exclude historical balance before any further payment.

Prepared synthetic staging-only deal `STG-WEB-0911-PARTIAL`, ID `3d08678d-c29e-4465-a60b-45c4134c861e`, using the existing synthetic customer. Fixture setup inserted only a new staging deal; subsequent transaction verification remains read-only. Total/monthly $500, start August 1, due day 1, term 1, maturity September 1, Active. Baseline has zero payments and promises. User should pay $200 Cash against September 1, leave promised date blank, and confirm completion. Expected valid paid $200, remaining $300, no promise. Do not submit the later $100 until the $200 result is verified. Portfolio totals quoted for Test 1 above were captured before adding this new $500 fixture.

User-directed payment and confirmation clicks replace payment-dialog automation. Codex will verify staging records after each completed manual action and compare accessible application screens before advancing. Do not bypass or alter confirmation logic. Earlier automation blockers do not establish application defects.

Test 1 baseline rechecked through the Supabase plugin against staging project `lsgzpvhyuswmvpxokhdt`: `STG-WEB-0911-FULL` / `17b3e9d6-e745-4186-8868-9ceb6441549a` is Active, total $500, monthly $500, start 2026-08-01, due day 1, term 1, maturity 2026-09-01. Payment count is zero, non-voided paid is $0, and promise count is zero. These fields match the previously observed single September 1 installment and $500 remaining balance. Test 1 is awaiting manual $500 payment submission; it is not yet PASS. After the user confirms completion, re-read payment IDs/status/amounts and deal/promise state, then check Dashboard, Customer Detail, Due Payments, Reports, Account Summary and receipt. Do not advance to the next transaction before verification.

Used the existing `http://127.0.0.1:5181` server without restarting Vite. Read-only inspection of its served Supabase client confirmed only `https://lsgzpvhyuswmvpxokhdt.supabase.co`; credentials were not printed. The server continued returning HTTP 200 during browser-control failures. Normal synthetic-user login succeeded in both the in-app browser and Chrome. In-app Dashboard refresh retained authentication. Navigation to Add Deal, Customer Detail and Add Payment succeeded. No warning/error console entries were captured before the confirmation-dialog stall; post-stall runtime inspection could not complete.

### Fresh fixture and observed amounts

Created `STG-WEB-0911-FULL`, deal ID `17b3e9d6-e745-4186-8868-9ceb6441549a`, through the browser Add Deal form. Synthetic customer only; no customer PII copied. Start August 1, 2026; due day 1; monthly payment $500; term 1; total $500. Customer Detail showed exactly one installment due September 1, maturity September 1, $0 paid, $500 remaining, Active status and no promises. Account Summary agreed. Dashboard portfolio financed/balance increased by $500 to $12,000/$6,200 while collected remained $5,800; the new row showed $500 due, $0 paid, $500 remaining.

The in-app Create Deal click timed out but the deal was subsequently confirmed saved; it was not resubmitted. In Chrome, Take Payment opened Add Payment with the correct deal. Selecting September 1 and entering $500 produced a $500 allocation and $0 remaining preview. Save opened a confirmed JavaScript confirmation. Dialog acceptance and subsequent DOM inspection timed out with `Emulation.setFocusEmulationEnabled`. A read-only staging query after this attempt confirmed **zero payments, zero promises, Active deal status**. This is not a saved-payment PASS. Do not blindly retry; inspect the dialog and persisted state first.

Chrome's password-save prompt was dismissed without storing the credentials. Native access to the Codex app itself was denied by Computer Use's application safety restriction, not a missing macOS permission. Chrome native inspection did not expose an actionable payment confirmation after the timeout. The requested `localhost:5181` browser fallback also timed out during navigation. These are category C tooling failures; no application change was made to work around them. A user-assisted confirmation was requested to unblock the live Chrome page.

### Current-working-tree browser acceptance matrix

PASS applies only to the evidence stated here. Earlier API/SQL passes and older browser-fixture checks remain recorded above, but do not replace fresh browser acceptance. NOT TESTED includes attempted workflows whose completion could not be verified.

| Business flow | Result | Evidence or exact remaining gap |
| --- | --- | --- |
| Deal creation | PASS | Fresh synthetic deal persisted once and reopened in Customer Detail. |
| Schedule generation | NOT TESTED | Normal one-month schedule passes; fresh browser February/30/31-day cases remain untested. |
| Full payment | NOT TESTED | Allocation preview correct; confirmation tooling stalled, zero saved payments. |
| Partial payment | NOT TESTED | Fresh browser sequence not reached after confirmation stall. |
| Partial payment + promise | NOT TESTED | Fresh browser sequence not reached. |
| Additional payment against promise | NOT TESTED | Fresh active promise and subsequent payments not created. |
| Promise reschedule | NOT TESTED | Fresh browser promise sequence not reached. |
| Broken promise | NOT TESTED | Controlled fresh browser overdue case not reached. |
| Full-payment void | NOT TESTED | No full payment saved on fresh fixture. |
| Partial-promise-payment void | NOT TESTED | Fresh payment/promise sequence not reached. |
| Multiple payments then void one | NOT TESTED | Fresh $200/$100/void sequence not reached. |
| Paid Off status | NOT TESTED | Fresh fixture remains unpaid and Active. |
| Paid Off reopening | NOT TESTED | Requires completed full-payment and void sequence. |
| Rapid double-click protection | NOT TESTED | Confirmation handling blocks a conclusive actual-browser duplicate test. |
| Same-request retry / lost response | NOT TESTED | Actual-browser uncertain committed response not simulated; API/helper passes are separate. |
| Legitimate separate payments | NOT TESTED | Two intentional browser payments not yet saved. |
| Due Payments duplicate prevention | NOT TESTED | Fresh scheduled-plus-promise and partial-plus-promise comparisons remain. |
| Dashboard totals | NOT TESTED | Initial new-deal $500 delta agrees; post-payment/void comparisons remain. |
| Customer Detail totals | NOT TESTED | Initial $0 paid/$500 remaining agrees; transaction scenarios remain. |
| Reports totals | NOT TESTED | Fresh fixture report comparisons not reached. |
| CSV export | NOT TESTED | Fresh fixture export not downloaded/compared. |
| Receipt | NOT TESTED | No completed fresh payment/receipt. |
| Account Summary | NOT TESTED | Initial $0 collected/$500 balance agrees; post-payment/void verification remains. |
| Browser refresh | PASS | Authenticated Dashboard survived reload on existing server. |
| Logout/login persistence | NOT TESTED | Initial login passed; logout/login after a completed payment remains. |

No confirmed application defect or financial discrepancy was discovered in this continuation. No implementation or SQL changes were made. Existing passing build, units, schedule-parity, authenticated staging integration and SQL tests were not rerun unnecessarily; latest lint remains 99 errors / 5 warnings. Only this report was edited.

**Local financial acceptance is incomplete.** The immediate blocker is reliable browser confirmation control (or a user-assisted confirmation) followed by completion of the fresh-fixture matrix, including exports and actual-browser retry behavior. Keep the existing server running, recheck the fresh fixture before any retry, and resume from the pending full-payment workflow. Review completed local acceptance before committing. Vercel remains deferred; Electron is out of scope. No production modification, deployment, commit or push occurred.

## Post-release authenticated check

User production login and refresh verified; Dashboard, Deals, Due Payments, Reports and Add Payment render. See production-change-register.md for exact evidence and the existing $1,000 portfolio balance aggregation difference. No production transaction was submitted for testing; first real payment verification remains pending. No historical repair or Git commit/push.

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
