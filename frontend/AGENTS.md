# Repository Guidelines

## Project Structure & Module Organization
RK PayTrack is a React 19/Vite payment-tracking application with an Electron desktop wrapper. Run frontend commands from this directory (`frontend/`).

- `src/pages/`: route-level screens such as Dashboard, Deals, and AddPayment.
- `src/components/`: reusable forms, tables, receipts, and navigation controls.
- `src/api/`: domain-specific data access modules, named `*Api.js`.
- `src/auth/`: authentication context; `src/supabaseClient.js`: shared database client.
- `src/utils/`: money, date, payment schedule, and export helpers.
- `src/assets/` and `public/`: imported and static assets; `src/index.css`: shared styles.
- `electron/main.cjs`: desktop entry point; `build-assets/`: packaging resources.
- `dist/` and `release/`: generated web builds and desktop installers. Do not edit generated output.

## Build, Test, and Development Commands
- `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server.
- `npm run electron:dev`: start Vite and launch Electron after port 5173 is ready.
- `npm run lint`: run ESLint, including React Hooks and React Refresh checks.
- `npm run build`: generate the production web bundle in `dist/`.
- `npm run preview`: serve the production bundle locally.
- `npm run electron:build`: build and package the desktop application. Platform scripts include `build:win`, `build:mac:intel`, and `build:mac:apple`.

## Coding Style & Naming Conventions
Use JavaScript/JSX with ES modules; retain CommonJS for Electron's `.cjs` entry point. Use PascalCase component/page filenames and camelCase functions, variables, and utility filenames. Follow surrounding indentation and quote conventions; existing formatting varies. Prefer two-space indentation for new modules. ESLint is configured; no dedicated formatter is configured. Keep data access in `src/api/` and reusable calculations in `src/utils/`.

## Testing Guidelines
No automated test framework, test script, or coverage threshold is configured. Run lint and a production build, then manually exercise affected flows. For payment changes, verify balances, due dates, skipped payments, and receipt output. Check Electron when changing desktop behavior. Document verification steps and any failures in the pull request.

## Commit & Pull Request Guidelines
Recent commits use plain descriptive subjects, such as “Fetch all payments for dashboard”; no strict prefix convention is evident. Write focused, action-oriented subjects. Pull requests should explain the change, link relevant issues, list validation performed, and include screenshots for visible UI changes.

## Security & Configuration
Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` locally. Vite exposes `VITE_` variables to clients; never place privileged service credentials there. Do not commit credentials or customer/payment data.

## RK PayTrack Business Rules

RK PayTrack is a production dealership financing and payment-tracking
application. Changes to financial logic must be treated carefully.

### Deals
- A deal represents a customer financing agreement.
- Deals may have statuses such as Active, Paid Off, Closed, Repo,
  Cancelled, or Defaulted.
- Core schedule fields are:
  - start_date
  - due_day
  - monthly_payment
  - term
- Do not change deal status automatically unless existing business
  logic explicitly requires it.

### Payment Schedule
- Installment schedules are generated from:
  - deal start date
  - due day
  - monthly payment
  - term
- Preserve existing due-date calculation behavior.
- Do not regenerate or overwrite an existing payment schedule without
  understanding the impact on recorded payments and promises.
- Schedule calculations belong in reusable utilities rather than UI
  components whenever possible.

### Payments
- Payments are associated with a deal and usually a due installment.
- Support full and partial payments.
- Voided payments must never contribute to collected totals,
  balances, reports, or payoff calculations.
- Financial totals must be derived from authoritative payment data;
  do not maintain duplicate client-side balance calculations unless
  existing architecture requires it.
- When modifying payment logic, verify:
  - amount paid
  - remaining installment amount
  - customer balance
  - payment history
  - receipt data
  - dashboard totals
  - reports

### Promises to Pay
- A promise represents a customer's commitment to pay on a future date.
- Promise states may include Pending, Broken, Paid, Cancelled,
  and Rescheduled.
- Do not show cancelled or superseded/rescheduled promises as active dues.
- Avoid creating duplicate active promises for the same installment.
- A promise becomes broken only according to the existing date and
  payment rules.
- Changes to promise logic must also be checked against:
  - Dashboard
  - Due Payments
  - Customer Detail
  - Promise History
  - Reports

### Balance Calculation
- Voided payments must be excluded.
- Balance changes must remain consistent across Dashboard, Deals,
  Customer Detail, Reports, receipts, and account summaries.
- Never introduce a second conflicting balance formula.
- Before changing balance logic, identify the existing authoritative
  calculation.

## Supabase Rules

Supabase is the production database/backend.

- Inspect existing tables, columns, constraints, indexes, RLS policies,
  functions, and relationships before proposing schema changes.
- Use the Supabase plugin when live database inspection is needed.
- Do not assume the README is more current than the actual database.
- Do not delete production data.
- Do not run destructive SQL unless the user explicitly requests it.
- Prefer backward-compatible schema changes.
- Do not rename or remove production columns without identifying all
  application references first.
- Never expose the Supabase service-role key in frontend code.
- `VITE_SUPABASE_ANON_KEY` is client-visible and must never be replaced
  with privileged credentials.
- Preserve Row Level Security unless a change is explicitly required
  and its security impact has been reviewed.
- Keep Supabase access in `src/api/` when practical rather than
  spreading database queries throughout React components.

## Vercel Rules

The browser version of RK PayTrack is deployed through Vercel.

- Use the Vercel plugin when deployment status, project configuration,
  environment variables, domains, or deployment logs need inspection.
- Do not overwrite production environment variables blindly.
- Never print secret environment-variable values in responses,
  commits, logs, or source code.
- Run `npm run build` before considering a frontend change complete.
- Treat Vercel deployment configuration separately from Electron
  packaging configuration.

## Electron Rules

RK PayTrack also ships as a desktop application.

- Browser functionality and Electron functionality should remain
  compatible unless a change explicitly targets one platform.
- Do not modify generated files under `dist/` or `release/`.
- Make Electron changes in `electron/`.
- Verify `npm run build` before packaging.
- When desktop behavior changes, verify `npm run electron:dev`.
- Do not change application IDs, signing settings, installer names,
  or build targets unless specifically requested.

## Change Workflow

Before changing existing functionality:

1. Locate the relevant page/component.
2. Locate associated API modules.
3. Locate associated utility/calculation modules.
4. Search the repository for all callers of functions being changed.
5. Understand the current behavior before modifying it.
6. Make the smallest coherent change.
7. Run:
   - `npm run lint`
   - `npm run build`
8. Fix errors caused by the change.
9. Manually verify affected financial workflows.

For financial/business-logic changes also verify:
- Dashboard
- Deals
- Customer Detail
- Add Payment
- Due Payments
- Promises
- Reports
- Receipts/account summaries when applicable

## Git Rules

- Do not push directly to production-oriented branches unless requested.
- Do not force-push.
- Do not rewrite Git history.
- Do not commit `.env` files, credentials, customer exports, or
  generated installers.
- Keep commits focused on the requested change.
- Do not combine unrelated refactoring with feature or bug-fix work.

## Working With Plugins

When external state matters, prefer querying the appropriate plugin
instead of guessing.

- GitHub: repository files, branches, commits, issues, and pull requests.
- Supabase: live database schema and backend configuration.
- Vercel: deployments, project configuration, logs, domains, and
  environment configuration.

Repository source code remains the source of truth for application
behavior. The live Supabase project is the source of truth for the
current production database schema.

## Codex Behavior

- Read existing implementation before writing replacement code.
- Do not invent database columns, tables, environment variables, or APIs.
- Search the repository when uncertain.
- Prefer fixing the root cause instead of adding workaround logic.
- Preserve unrelated existing behavior.
- Explain any migration or destructive operation before performing it.
- For substantial changes, summarize:
  - files changed
  - behavior changed
  - database impact
  - validation performed
  - remaining risks or manual checks
