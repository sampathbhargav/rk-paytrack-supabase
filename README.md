# RK PayTrack Supabase

RK PayTrack is a dealership payment tracking application built for managing customer deals, installment schedules, payments, balances, promises to pay, payment receipts, reports, and collection follow-ups.

The application is designed for dealership finance and payment operations where customers may pay monthly, make partial payments, miss due dates, request more time, or promise to pay on a future date.

---

## Overview

RK PayTrack helps dealership staff track customer accounts from the beginning of a deal through payoff, default, repo, cancellation, or closure.

The system supports:

- Customer and deal management
- Monthly installment schedule tracking
- Payment recording
- Partial payment tracking
- Promise-to-pay tracking
- Broken promise follow-up
- Due payment dashboard
- Past-due customer tracking
- Payment receipts
- Account summaries
- Calendar reminders for collections
- CSV reports
- Policy Center
- Help Center
- Desktop packaging with Electron

---

## Key Features

### Deal Management

- Add and manage customer deals
- Track deal tag, customer name, phone, truck, VIN, deal type, and status
- Store total amount, monthly payment, start date, due day, term, and maturity date
- Edit deal information when schedule details are missing or changed
- Mark deals as Active, Paid Off, Closed, Repo, Cancelled, or Defaulted

### Payment Tracking

- Record customer payments
- Track payment date, due date, amount due, amount paid, remaining amount, method, type, and notes
- Support full payments and partial payments
- Prevent voided payments from affecting totals
- Automatically update deal paid-off status when balance reaches zero

### Due Schedule

- Generate monthly installment schedules from deal start date, due day, term, and monthly payment
- Show installment status as Paid, Partial, Due, or Past Due
- Show remaining balance per installment
- Display promise status connected to an installment
- Add calendar reminders for unpaid installments

### Payment Promises

- Track customer promises to pay
- Record original due date, promised date, amount due, amount paid now, remaining amount, and notes
- Automatically update broken promises when promised dates pass
- Support pending, broken, paid, cancelled, and rescheduled statuses
- Avoid duplicate active promises for the same installment

### Dashboard

- View daily collection priorities
- See due today payments
- See past-due scheduled installments
- See promises due today
- See broken promises
- View total financed, collected, and pending balance
- View balance by deal type

### Due Payments Page

- Select a date and view scheduled payments due on that date
- View promises due on the selected date
- Identify active deals missing schedule setup
- Quickly switch between Today, Tomorrow, and Yesterday
- Refresh current data from Supabase

### Reports

The Reports page provides management-level summaries and CSV exports.

Current reports include:

- Full Deals Report
- Past Due Scheduled Payments
- Due Today
- Past Due Promises
- Paid Off Deals
- Defaulted Deals
- Registration Money
- Monthly Collection Report

Reports dashboard includes:

- Top summary cards
- Monthly collection bar chart
- Deal status donut chart
- Balance by deal type chart
- Aging report
- Payment method breakdown
- Last refreshed time

### Payment Receipts

- Generate receipts for already-paid payments
- Print or save receipts as PDF
- Show customer, deal, payment amount, payment method, due date, and remaining balance
- Prevent receipts for voided payments

### Account Summary

- Print customer account summary
- Include deal details, payment history, promise history, total paid, and current balance

### Calendar Reminders

RK PayTrack supports collection reminders in two ways:

- Google Calendar reminder links for individual due items
- ICS calendar files for Apple Calendar, Outlook, and Google Calendar import

The Customer Detail page can also generate reminders for all unpaid due dates at once.

### Policy Center

The Policy Center includes internal policy templates such as:

- Acceptable Use Policy
- Terms of Use
- Privacy Policy
- Data Retention Policy
- User Access Policy
- Security Policy
- Backup and Disaster Recovery Policy
- Incident Response Policy
- Software Disclaimer

### Help Center

The Help Center provides employee training articles, including:

- Getting Started
- Customer Detail Page
- How to Add a Payment
- Due Schedule
- Payment Promises
- Receipts and Account Summary
- Reports
- Calendar Reminders
- Voiding a Payment
- Common Mistakes to Avoid

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- React Router
- Inline component styling

### Database

- Supabase
- PostgreSQL

### Desktop Packaging

- Electron
- electron-builder

### Development Tools

- Node.js
- npm
- Git
- GitHub

---

## Project Structure

```text
rk-paytrack-supabase/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   ├── dealsApi.js
│   │   │   ├── paymentsApi.js
│   │   │   └── promisesApi.js
│   │   │
│   │   ├── components/
│   │   │   ├── AccountSummaryPrint.jsx
│   │   │   ├── DealForm.jsx
│   │   │   ├── DealTable.jsx
│   │   │   ├── DueSchedule.jsx
│   │   │   ├── PaymentForm.jsx
│   │   │   ├── PaymentHistory.jsx
│   │   │   ├── PaymentReceipt.jsx
│   │   │   ├── PromiseHistory.jsx
│   │   │   └── SearchBar.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── AddDeal.jsx
│   │   │   ├── AddPayment.jsx
│   │   │   ├── CustomerDetail.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Deals.jsx
│   │   │   ├── DuePayments.jsx
│   │   │   ├── EditDeal.jsx
│   │   │   ├── HelpCenter.jsx
│   │   │   ├── LegalPolicies.jsx
│   │   │   ├── Promises.jsx
│   │   │   └── Reports.jsx
│   │   │
│   │   ├── utils/
│   │   │   ├── calendarUtils.js
│   │   │   ├── duePaymentsUtils.js
│   │   │   ├── exportUtils.js
│   │   │   ├── moneyUtils.js
│   │   │   └── statusCalculator.js
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── supabaseClient.js
│   │
│   ├── electron/
│   ├── build-assets/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── supabase/
│   └── database schema or migration files
│
├── README.md
└── .gitignore


# RK PayTrack Supabase

RK PayTrack is a dealership payment tracking application built for managing customer deals, installment schedules, payments, balances, promises to pay, payment receipts, reports, and collection follow-ups.

The application is designed for dealership finance and payment operations where customers may pay monthly, make partial payments, miss due dates, request more time, or promise to pay on a future date.

---

## Overview

RK PayTrack helps dealership staff track customer accounts from the beginning of a deal through payoff, default, repo, cancellation, or closure.

The system supports:

- Customer and deal management
- Monthly installment schedule tracking
- Payment recording
- Partial payment tracking
- Promise-to-pay tracking
- Broken promise follow-up
- Due payment dashboard
- Past-due customer tracking
- Payment receipts
- Account summaries
- Calendar reminders for collections
- CSV reports
- Policy Center
- Help Center
- Desktop packaging with Electron

---

## Key Features

### Deal Management

- Add and manage customer deals
- Track deal tag, customer name, phone, truck, VIN, deal type, and status
- Store total amount, monthly payment, start date, due day, term, and maturity date
- Edit deal information when schedule details are missing or changed
- Mark deals as Active, Paid Off, Closed, Repo, Cancelled, or Defaulted

### Payment Tracking

- Record customer payments
- Track payment date, due date, amount due, amount paid, remaining amount, method, type, and notes
- Support full payments and partial payments
- Prevent voided payments from affecting totals
- Automatically update deal paid-off status when balance reaches zero

### Due Schedule

- Generate monthly installment schedules from deal start date, due day, term, and monthly payment
- Show installment status as Paid, Partial, Due, or Past Due
- Show remaining balance per installment
- Display promise status connected to an installment
- Add calendar reminders for unpaid installments

### Payment Promises

- Track customer promises to pay
- Record original due date, promised date, amount due, amount paid now, remaining amount, and notes
- Automatically update broken promises when promised dates pass
- Support pending, broken, paid, cancelled, and rescheduled statuses
- Avoid duplicate active promises for the same installment

### Dashboard

- View daily collection priorities
- See due today payments
- See past-due scheduled installments
- See promises due today
- See broken promises
- View total financed, collected, and pending balance
- View balance by deal type

### Due Payments Page

- Select a date and view scheduled payments due on that date
- View promises due on the selected date
- Identify active deals missing schedule setup
- Quickly switch between Today, Tomorrow, and Yesterday
- Refresh current data from Supabase

### Reports

The Reports page provides management-level summaries and CSV exports.

Current reports include:

- Full Deals Report
- Past Due Scheduled Payments
- Due Today
- Past Due Promises
- Paid Off Deals
- Defaulted Deals
- Registration Money
- Monthly Collection Report

Reports dashboard includes:

- Top summary cards
- Monthly collection bar chart
- Deal status donut chart
- Balance by deal type chart
- Aging report
- Payment method breakdown
- Last refreshed time

### Payment Receipts

- Generate receipts for already-paid payments
- Print or save receipts as PDF
- Show customer, deal, payment amount, payment method, due date, and remaining balance
- Prevent receipts for voided payments

### Account Summary

- Print customer account summary
- Include deal details, payment history, promise history, total paid, and current balance

### Calendar Reminders

RK PayTrack supports collection reminders in two ways:

- Google Calendar reminder links for individual due items
- ICS calendar files for Apple Calendar, Outlook, and Google Calendar import

The Customer Detail page can also generate reminders for all unpaid due dates at once.

### Policy Center

The Policy Center includes internal policy templates such as:

- Acceptable Use Policy
- Terms of Use
- Privacy Policy
- Data Retention Policy
- User Access Policy
- Security Policy
- Backup and Disaster Recovery Policy
- Incident Response Policy
- Software Disclaimer

### Help Center

The Help Center provides employee training articles, including:

- Getting Started
- Customer Detail Page
- How to Add a Payment
- Due Schedule
- Payment Promises
- Receipts and Account Summary
- Reports
- Calendar Reminders
- Voiding a Payment
- Common Mistakes to Avoid

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- React Router
- Inline component styling

### Database

- Supabase
- PostgreSQL

### Desktop Packaging

- Electron
- electron-builder

### Development Tools

- Node.js
- npm
- Git
- GitHub

---

## Project Structure

```text
rk-paytrack-supabase/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   ├── dealsApi.js
│   │   │   ├── paymentsApi.js
│   │   │   └── promisesApi.js
│   │   │
│   │   ├── components/
│   │   │   ├── AccountSummaryPrint.jsx
│   │   │   ├── DealForm.jsx
│   │   │   ├── DealTable.jsx
│   │   │   ├── DueSchedule.jsx
│   │   │   ├── PaymentForm.jsx
│   │   │   ├── PaymentHistory.jsx
│   │   │   ├── PaymentReceipt.jsx
│   │   │   ├── PromiseHistory.jsx
│   │   │   └── SearchBar.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── AddDeal.jsx
│   │   │   ├── AddPayment.jsx
│   │   │   ├── CustomerDetail.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Deals.jsx
│   │   │   ├── DuePayments.jsx
│   │   │   ├── EditDeal.jsx
│   │   │   ├── HelpCenter.jsx
│   │   │   ├── LegalPolicies.jsx
│   │   │   ├── Promises.jsx
│   │   │   └── Reports.jsx
│   │   │
│   │   ├── utils/
│   │   │   ├── calendarUtils.js
│   │   │   ├── duePaymentsUtils.js
│   │   │   ├── exportUtils.js
│   │   │   ├── moneyUtils.js
│   │   │   └── statusCalculator.js
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── supabaseClient.js
│   │
│   ├── electron/
│   ├── build-assets/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── supabase/
│   └── database schema or migration files
│
├── README.md
└── .gitignore
```

---

## Environment Variables

Create a `.env` file inside the `frontend` folder.

```bash
cd frontend
touch .env
```

Add your Supabase project values:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not commit `.env` to GitHub.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sampathbhargav/rk-paytrack-supabase.git
```

### 2. Go into the project folder

```bash
cd rk-paytrack-supabase
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

### 4. Start the development server

```bash
npm run dev
```

The app should run locally at:

```text
http://localhost:5173
```

---

## Build for Production

From the `frontend` folder, run:

```bash
npm run build
```

The production build will be created in:

```text
frontend/dist/
```

---

## Electron Desktop Build

### Build for macOS

```bash
npm run build:mac
```

If needed, run Electron Builder directly:

```bash
COPYFILE_DISABLE=1 CSC_IDENTITY_AUTO_DISCOVERY=false ./node_modules/.bin/electron-builder --mac dmg --arm64 --publish never
```

For Intel Mac:

```bash
COPYFILE_DISABLE=1 CSC_IDENTITY_AUTO_DISCOVERY=false ./node_modules/.bin/electron-builder --mac dmg --x64 --publish never
```

Check Mac architecture:

```bash
uname -m
```

- `arm64` means Apple Silicon
- `x86_64` means Intel Mac

Generated desktop files should appear in:

```text
frontend/release/
```

The `release/` folder should not be committed to GitHub.

---

## Important Business Logic

### Deal Schedule Logic

Due schedules are calculated from:

- Start date
- Due day
- Monthly payment
- Term

Example:

```text
Start Date: 04/09/2026
Due Day: 9
Term: 6

Generated due dates:
05/09/2026
06/09/2026
07/09/2026
08/09/2026
09/09/2026
10/09/2026
```

If any required schedule field is missing, the deal will not appear correctly in Due Payments.

Required schedule fields:

- Start Date
- Due Day
- Monthly Payment
- Term

### Payment Logic

Payments are connected to a deal and a due date.

A payment can be:

- Full Payment
- Partial Payment
- Deferred Payment
- Promise Payment

Voided payments are excluded from totals.

### Promise Logic

Promises track future payment commitments from customers.

A promise usually includes:

- Original due date
- Promised date
- Amount due
- Amount paid now
- Remaining amount
- Promise status
- Notes

Broken promises are updated when the promised date passes and the customer has not paid the remaining amount.

### Deal Status Logic

Common statuses include:

- Active
- Paid Off
- Closed
- Repo
- Cancelled
- Defaulted

Defaulted, closed, repo, cancelled, and paid-off deals are generally excluded from active due payment calculations.

---

## Main Pages

### Dashboard

Daily overview for collections and finance activity.

### Deals

Search, filter, and manage all customer deals.

### Customer Detail

View one customer deal in detail, including schedule, payment history, promises, receipts, reminders, and account summary.

### Add Deal

Create a new customer and deal.

### Add Payment

Record a customer payment, partial payment, or deferred/promise payment.

### Due Payments

View payments and promises due on a selected date.

### Promises

View and filter all payment promises.

### Reports

View charts and export CSV reports.

### Policy Center

View internal usage, security, privacy, access, and compliance policy templates.

### Help Center

Read employee training articles for using the application.

---

## CSV Export

CSV exports are available for reports such as:

- Full Deals Report
- Past Due Scheduled Payments
- Due Today
- Past Due Promises
- Paid Off Deals
- Defaulted Deals
- Registration Money
- Monthly Collection

CSV files may contain customer and financial information. Handle exported files carefully.

---

## Calendar Reminder Support

RK PayTrack can create collection reminders for unpaid due dates.

Supported options:

- Google Calendar single event link
- ICS file download
- Multi-event ICS file for all unpaid due dates

ICS files can be imported into:

- Apple Calendar
- Google Calendar
- Microsoft Outlook

---

## Security Notes

Never commit sensitive information to GitHub.

Do not commit:

```text
.env
Supabase service role key
Database passwords
API tokens
Private certificates
Desktop release files
```

Only the Supabase anon key should be used in the frontend.

For production use, enable Supabase Row Level Security and role-based access controls.

---

## Recommended `.gitignore`

```gitignore
# Dependencies
node_modules/
**/node_modules/

# Build outputs
dist/
build/
release/
**/dist/
**/build/
**/release/

# Electron outputs
*.dmg
*.exe
*.AppImage
*.zip
*.app

# Environment files
.env
.env.local
.env.*.local

# Mac files
.DS_Store
._*

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Supabase local
.supabase/

# Cache files
.fastembed_cache/
**/.fastembed_cache/
```

---

## Common Commands

### Install dependencies

```bash
npm install
```

### Run development server

```bash
npm run dev
```

### Build web app

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

### Build macOS desktop app

```bash
npm run build:mac
```

---

## Troubleshooting

### Vite command not found

This usually means dependencies are missing.

```bash
cd frontend
npm install
npm run build
```

### Electron build gets stuck

Clean cache and reinstall dependencies.

```bash
pkill -f npm
pkill -f node
pkill -f electron
pkill -f electron-builder

rm -rf node_modules
rm -f package-lock.json
rm -rf dist release
rm -rf ~/.npm/_cacache
rm -rf ~/Library/Caches/electron
rm -rf ~/Library/Caches/electron-builder

npm install --verbose
npm run build
npm run build:mac
```

### GitHub password authentication is not supported

GitHub no longer supports password authentication over HTTPS.

Use GitHub CLI:

```bash
brew install gh
gh auth login
gh auth setup-git
```

Then push again:

```bash
git push -u origin main
```

### Error: src refspec main does not match any

This means there is no commit yet.

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

### Error: bad tree object

This usually means the local Git repository is corrupted.

For a new project, reset Git:

```bash
rm -rf .git
git init
git branch -M main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/sampathbhargav/rk-paytrack-supabase.git
git push -u origin main
```

### Push is too large or times out

Make sure large generated files are not committed.

```bash
find . -type f -size +50M -print
```

Check tracked files:

```bash
git ls-files | grep -E "node_modules|release|dist|\.env|\.dmg|\.app|fastembed"
```

If large files were already committed, remove them from Git history or reset Git before pushing.

---

## Future Improvements

Possible future improvements:

- User login
- Role-based permissions
- Admin, manager, employee, and view-only roles
- Activity logs
- Audit history for deal edits and payment voids
- SMS reminders
- Email reminders
- Advanced report filters
- PDF report exports
- Automated backups
- Supabase Row Level Security policies
- Multi-location support
- Customer communication history
- Import tools for old spreadsheets

---

## Author

Developed for RK PayTrack dealership payment tracking operations.