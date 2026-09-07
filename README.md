# MicroLoan Admin (Next.js + Neon + Vercel)

A rewrite of the MicroLoan Admin Panel using Next.js (App Router), the Neon
serverless Postgres driver, and Server Actions — no separate backend/API
needed, and no native binaries (no Prisma) so it deploys cleanly on Vercel.

## Features

Everything from the PHP version, ported over:
- Admin login (JWT session cookie, bcrypt password hashing)
- Borrower management (add/view, search)
- Loan registration with automatic installment schedule generation
  (daily / weekly / monthly, flat interest)
- Loan approval workflow (pending → approved → active → completed / rejected / defaulted)
- Loan collection with automatic partial-payment and overpayment roll-over
  to the next installment, plus a printable/shareable receipt
- Notifications (due-soon / overdue installments, generated automatically)
- Reports — pick **Single User Report** (one borrower's full loan + payment
  history) or **All Users Report** (every borrower's credit/debt summary) —
  either can be **shared straight to WhatsApp, Messenger, or any other app**
  via the Share button (uses the native share sheet on mobile, with a direct
  WhatsApp link and a "copy text" fallback on desktop)

**Not included in this version** (the PHP version has these, this one doesn't
yet): document uploads, PDF/Excel file exports, multi-admin user management.
Document uploads would need a file storage add-on (e.g. Vercel Blob) since
serverless functions have no persistent disk — happy to add this if you want it.

## 1. Create your Neon database

1. Go to [neon.tech](https://neon.tech) and create a free project.
2. Open the **SQL Editor** in your Neon dashboard, paste the contents of
   `schema.sql` from this project, and run it. This creates all the tables
   and a default admin login.
3. From your Neon dashboard, copy the **pooled connection string** (starts
   with `postgresql://...`).

Default admin login (change this after your first login):
- Email: `admin@microloan.com`
- Password: `admin123`

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```
DATABASE_URL="<your Neon connection string>"
SESSION_SECRET="<a long random string>"
```

Generate a `SESSION_SECRET` with:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Run locally

```
npm install
npm run dev
```

Visit http://localhost:3000 and log in.

## 4. Deploy to Vercel

1. Push this project to a GitHub repo.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. In the project's **Environment Variables** settings, add `DATABASE_URL`
   and `SESSION_SECRET` (same values as your `.env.local`).
4. Deploy. That's it — no build configuration needed.

## Project structure

```
schema.sql              Postgres schema for Neon (run once in Neon's SQL Editor)
middleware.ts            Route protection (redirects to /login if not signed in)
lib/
  db.ts                  Neon serverless SQL client
  jwt.ts                 Pure JWT sign/verify (safe for Edge Middleware)
  auth.ts                Session cookie helpers (Server Components/Actions only)
  utils.ts                Money formatting, installment schedule math, share-text builders
  data.ts                 All read queries (dashboard, borrowers, loans, reports, etc.)
  actions.ts              All mutations (Server Actions: login, CRUD, payments, etc.)
app/
  login/                  Login page
  (app)/                  Everything behind the sidebar layout
    page.tsx              Dashboard
    borrowers/             Borrower list / add / view
    loans/                  Loan list / registration / detail + approval
    collections/            Collection list / collect-payment form / receipt
    notifications/          Due-soon / overdue / payment notifications
    reports/                 Single-user or all-users credit reports, shareable
```

## Notes on the installment/collection logic

Same rules as the original PHP version:
- Registering a loan immediately generates its full installment schedule
  (flat interest, annualized using a 365-day year for daily loans, 52 weeks
  for weekly, 12 months for monthly).
- A loan starts as **pending** and needs to be approved (then marked active)
  before it shows up as collectible on the Collections page.
- On the Collect Payment page, the amount field auto-fills from the selected
  installment's remaining balance but stays fully editable — entering more
  than what's due on that installment automatically rolls the extra into the
  next unpaid installment(s).
- The dashboard/notifications page automatically flags installments as
  **overdue** once their due date passes, and generates "due soon" reminders
  a few days ahead.

## Security notes

- Passwords are hashed with bcrypt.
- Sessions are signed JWTs in an httpOnly cookie — not readable or forgeable
  from client-side JS.
- All database queries use parameterized tagged-template SQL (no string
  concatenation), so there's no SQL injection surface.
- Set a strong, random `SESSION_SECRET` in production — never reuse the
  example value.
