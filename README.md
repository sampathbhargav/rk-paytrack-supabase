# RK PayTrack Supabase

RK PayTrack Supabase is a payment tracking application built to manage dealership customer deals, payment schedules, due dates, promises to pay, deferrals, and payment history.

This project is designed for dealership finance/payment operations where customers may make monthly payments, miss payment dates, make new promises, or request deferrals.

---

## Features

- Add and manage customer deals
- Track deal start date, maturity date, and monthly due date
- View monthly payment schedules
- Record customer payments
- Track partial payments
- Track missed payments
- Track customer promises to pay
- Update promise dates when a customer promises a new date
- Manage deferred payments
- View payments due today
- View overdue payments
- Store data using Supabase
- Frontend built with React
- Desktop packaging support with Electron

---

## Tech Stack

### Frontend

- React
- Vite
- JavaScript
- Electron

### Backend / Database

- Supabase
- PostgreSQL

### Tools

- Git
- GitHub
- npm
- Node.js

---

## Project Structure

```text
rk-paytrack-supabase/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   └── server files if used
│
├── supabase/
│   └── database migrations or schema files
│
├── README.md
├── .gitignore
└── package.json
```

---

## Important Folders Not Committed to GitHub

The following files and folders should not be committed to GitHub:

```text
node_modules/
dist/
build/
release/
.env
.env.local
*.dmg
*.exe
*.AppImage
*.zip
```

These files are ignored using `.gitignore`.

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

### 4. Create environment file

Create a `.env` file inside the `frontend` folder:

```bash
touch .env
```

Add your Supabase values:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Do not commit `.env` to GitHub.

---

## Running the App

From the `frontend` folder, run:

```bash
npm run dev
```

The app should start locally, usually at:

```text
http://localhost:5173
```

---

## Building the App

To create a production build:

```bash
npm run build
```

The build output will be created in:

```text
frontend/dist/
```

---

## Electron Desktop Build

If Electron build scripts are configured, use:

```bash
npm run build:mac
```

or:

```bash
npm run build:win
```

Generated desktop files should be inside:

```text
frontend/release/
```

The `release/` folder should not be committed to GitHub.

---

## Payment Tracking Logic

RK PayTrack is designed around dealership payment workflows.

A deal may include:

- Customer name
- Phone number
- Deal tag
- Truck details
- Finance type
- Start date
- Monthly payment amount
- Due date
- Term
- Maturity date
- Total balance
- Payment history

A customer payment record may include:

- Payment date
- Amount paid
- Payment method
- Notes
- Remaining balance

A promise-to-pay record may include:

- Original due date
- Promised payment date
- Promise status
- Updated promise date
- Notes

A deferral record may include:

- Deferred payment amount
- Original due date
- New due date
- Reason for deferral
- Approval notes

---

## Common Customer Payment Situations

### Customer pays on time

The payment is recorded against the scheduled due date.

### Customer misses payment

The payment becomes overdue and should appear in the overdue list.

### Customer promises to pay later

The promise date is saved. If the customer misses that promise date, the system should allow a new promise date to be recorded while preserving the old promise history.

### Customer makes partial payment

The partial amount is recorded, and the remaining amount continues as due or overdue.

### Customer gets a deferral

The due amount can be moved to a later date depending on the dealership’s business rules.

---

## GitHub Setup

Initialize Git:

```bash
git init
git branch -M main
```

Add files:

```bash
git add .
git commit -m "Initial commit"
```

Add remote:

```bash
git remote add origin https://github.com/sampathbhargav/rk-paytrack-supabase.git
```

Push to GitHub:

```bash
git push -u origin main
```

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

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Supabase local
.supabase/

# Cache/model files
.fastembed_cache/
**/.fastembed_cache/
```

---

## Troubleshooting

### GitHub says password authentication is not supported

GitHub no longer supports account password authentication for Git push over HTTPS.

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

---

### Error: src refspec main does not match any

This means there is no commit on the `main` branch yet.

Fix:

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

---

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

---

### Push is too large or times out

Make sure these folders are not committed:

```text
node_modules/
dist/
release/
```

Check large files:

```bash
find . -type f -size +50M -print
```

Check tracked files:

```bash
git ls-files | grep -E "node_modules|release|dist|\.env|\.dmg|\.app|fastembed"
```

If large files were already committed, reset Git and recommit after creating `.gitignore`.

---

## Security Notes

Do not upload private keys, passwords, tokens, or Supabase secret keys to GitHub.

Never commit:

```text
.env
Supabase service role key
Database passwords
API tokens
Private certificates
```

Only the Supabase anon key should be used in the frontend environment file.

---

## Future Improvements

Possible future features:

- Customer search
- Payment calendar
- SMS reminders
- Daily due payment dashboard
- Promise-to-pay history
- Deferral approval tracking
- PDF receipt generation
- Dealer payment summary reports
- User login and role-based access
- Backup and export options

---

## Author

Developed for RK PayTrack dealership payment tracking operations.
