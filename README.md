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
