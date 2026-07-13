# Econet — ISP Accounting & Monthly Voucher App

Replaces the monthly Excel workbook: partner collections, commissions,
bonuses, deposits, dues, business costs/profit, a bKash cash ledger, and
printable per-partner vouchers.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express (TypeScript) REST API
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** email/password login (bcrypt + JWT) with two roles — `admin` (full access) and `staff` (Monthly Entry + Vouchers only)

All money fields are stored as `Decimal` (never floats); rounding to 2
decimal places happens only at the edges (`backend/src/calc.ts`, `round2`).

## Run with Docker (recommended)

```bash
docker compose up --build
```

This starts Postgres, runs migrations, seeds the **July-26** demo month
(13 partners, matching the original workbook), and serves the app at:

- **http://localhost:5173** — the only port meant to be reachable
  externally. nginx serves the frontend and reverse-proxies `/api/*` to
  the backend container internally.

**Network exposure is intentionally locked down:**

| Service | Reachable from |
|---|---|
| `frontend` (nginx) | anywhere — this is the one public port |
| `backend` (API) | `127.0.0.1` on the host only (for local `curl`/debugging), plus other containers via `backend:4000` — never the internet |
| `db` (Postgres) | other containers only, via `db:5432` — no host port published at all |

If you deploy this on a machine with a public IP, only port `5173`
(or whatever you map it to behind a reverse proxy/HTTPS) should be
opened in your firewall/security group. Don't publish `4000` or `5432`
publicly — the backend has no rate limiting on login, and the DB uses
placeholder credentials by default.

**Demo logins:**
- `admin@econet.local` / `changeme123` — full access
- `staff@econet.local` / `changeme123` — restricted to Monthly Entry + Vouchers

**Rotate these before any real/public deployment** — either edit
`backend/prisma/seed.ts` before first run, or log in as admin and use
the **Users** screen to deactivate the seeded accounts and create your
own.

Seeding only runs once meaningfully (it's idempotent via upsert) but
re-runs on every container start by default. To disable it on
subsequent runs (e.g. once you have real data you don't want touched):

```bash
RUN_SEED=false docker compose up
```

Set a real `JWT_SECRET` and DB password for anything beyond local use:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

(Also change `POSTGRES_PASSWORD` and `DATABASE_URL` in
`docker-compose.yml` from the placeholder `econet`/`econet` if this
will hold real data.)

### Running Prisma commands against the containerized DB

Since Postgres has no published port, run migration/seed commands
inside the backend container rather than from the host:

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend node dist/prisma/seed.js
```

## Run locally without Docker

### Backend

```bash
cd backend
cp .env.example .env      # point DATABASE_URL at your Postgres
npm install
npx prisma migrate dev
npm run seed               # seeds July-26 demo data, prints totals
npm run dev                 # http://localhost:4000
```

Run the calculation unit tests:

```bash
npm test
```

### Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL, defaults to http://localhost:4000/api
npm install
npm run dev                 # http://localhost:5173
```

## Adding a new month

1. Go to **Months** → pick the month/year → check "carry forward" to
   roll each partner's `dueAfterBonus` from the currently selected month
   into the new month's `lastMonthDue` → **Create Month**.
2. Switch to the new month with the selector in the header.
3. Fill in **Monthly Entry** (users, collection, commission %, bonus %,
   discount) per partner — computed columns (commission amount, business
   amount, bonus, dues) update live and save per row.
4. Log deposits on **Deposits** as they come in — "Total Deposit" on the
   entry always reflects the sum of that partner's deposits, never a
   typed value.
5. Edit **Costs** for the month; the "Bonus" line is auto-computed from
   the sum of all partners' bonus amounts (use "Recompute Bonus line" if
   you change entries after the line was created).
6. Check **Dashboard** for totals and profit.
7. **Close** the month once finalized (Months screen).

## Printing a voucher

Go to **Vouchers**, pick a partner (or use Prev/Next), and click **Print**
— the browser print dialog opens with a print-optimized layout (nav/buttons
hidden, one page, black on white). Use **Print all** to stack every
partner's voucher for the month, one per page.

## User roles & permissions

Two roles, enforced both on the API (`requireRole` middleware,
`backend/src/middleware/auth.ts`) and in the UI (nav filtering + route
guards, `frontend/src/App.tsx` and `components/Layout.tsx`):

| | `admin` | `staff` |
|---|---|---|
| Monthly Entry, Vouchers | ✅ | ✅ |
| Partners, Months (read) | ✅ | ✅ (needed to populate dropdowns) |
| Dashboard, Deposits, Costs, Transactions | ✅ | ❌ |
| Partners/Months (create/edit), Users | ✅ | ❌ |

Manage users from the **Users** screen (admin-only): create a new
login with a role, or toggle a user's role/active status. A
deactivated account is rejected at login (`403`). There's no user
self-signup — accounts are created by an admin only.

## Project layout

```
backend/
  prisma/schema.prisma   data model
  prisma/seed.ts          July-26 seed data + math verification printout
  src/calc.ts              all derived-value formulas (single source of truth)
  src/routes/               REST endpoints
  src/__tests__/calc.test.ts  unit tests, using the seed numbers as fixtures
frontend/
  src/pages/                 one file per screen
  src/api/                    typed fetch client
  src/components/VoucherCard.tsx  the printable voucher
docker-compose.yml
```

## Business rules encoded in `calc.ts`

```
commissionAmount = totalCollection * commissionPct
businessAmount   = totalCollection - commissionAmount
bonusAmount       = businessAmount * bonusPct
dueWithBonus       = businessAmount - totalDeposit - discount + lastMonthDue
dueAfterBonus       = businessAmount - totalDeposit - bonusAmount - discount + lastMonthDue
profit               = totalBusinessAmount - totalCost
ledgerBalance         = Σ receive - Σ send
```

`totalDeposit` is always derived from the Deposits table — it cannot be
typed directly on an entry.
