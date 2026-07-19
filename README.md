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

This starts Postgres, runs migrations, and serves the app at:

- **http://localhost:5173** — the only port meant to be reachable
  externally. nginx serves the frontend and reverse-proxies `/api/*` to
  the backend container internally.

**Network exposure is intentionally locked down:**

| Service | Reachable from |
|---|---|
| `frontend` (nginx) | anywhere — this is the one public port |
| `backend` (API) | `127.0.0.1` on the host only (for local `curl`/debugging), plus other containers via `backend:4000` — never the internet |
| `db` (Postgres) | other containers via `db:5432`, plus `127.0.0.1` on the host (needed for `npx prisma migrate dev`, which writes migration files to the repo and can't run inside the container image) — never the internet |

If you deploy this on a machine with a public IP, only port `5173`
(or whatever you map it to behind a reverse proxy/HTTPS) should be
opened in your firewall/security group. Don't publish `4000` or `5432`
publicly — the backend has no rate limiting on login, and the DB uses
placeholder credentials by default.

Seeding is **off by default** (`RUN_SEED=false`) — a fresh `docker
compose up` starts with an empty database and no login exists yet. To
get the July-26 demo data (13 partners, matching the original
workbook) plus two demo logins for local testing:

```bash
RUN_SEED=true docker compose up
```

**Demo logins** (only exist if you've run with `RUN_SEED=true`):
- `admin@econet.local` / `changeme123` — full access
- `staff@econet.local` / `changeme123` — restricted to Monthly Entry + Vouchers

**Rotate these before any real/public deployment** — either edit
`backend/prisma/seed.ts` before first run, or log in as admin and use
the **Users** screen to deactivate the seeded accounts and create your
own. Seeding is idempotent (upsert-based), so leaving `RUN_SEED=true`
on for a real deployment won't duplicate data, but it will keep
resetting the demo partners/month's admin-set fields back to seed
values on every restart — turn it off once you have real data.

To wipe all business data (partners, months, entries, deposits, costs,
transactions) while keeping user accounts, run this from `backend/`
with `DATABASE_URL` pointed at the target database:

```bash
npm run clear-data
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
3. On **Monthly Entry**, add each partner's users/collection via the
   "Add a collection entry" form — this can be submitted as many times as
   needed during the month (morning batch, afternoon batch, a correction
   run, etc.); a partner's total is the sum of everything submitted so
   far, shown live in the summary table above. Once submitted, only an
   admin can edit or delete an individual entry (see the log at the
   bottom of the page) — this is enforced by the API, not just hidden in
   the UI. Admins additionally set commission %, bonus %, discount, and
   last month due per partner in the same summary table.
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
| Monthly Entry — add a Users/Collection submission (repeatable) | ✅ | ✅ |
| Monthly Entry — edit or delete an existing submission | ✅ | ❌ |
| Monthly Entry — Commission/Bonus %, Discount, Last Month Due, all computed columns (commission/business/bonus amounts, deposit, dues) | ✅ | ❌ not shown at all |
| Vouchers (full breakdown, printing) | ✅ | ✅ |
| Partners, Months (read) | ✅ | ✅ (needed to populate dropdowns) |
| Dashboard, Deposits, Costs, Transactions | ✅ | ❌ |
| Partners/Months (create/edit), Users | ✅ | ❌ |

A partner's monthly **Users**/**Collection** total is not a single
editable field — it's the sum of every `CollectionEntry` row submitted
for that partner+month (`backend/prisma/schema.prisma`), the same
pattern deposits already use for `totalDeposit`. `staff` can add a new
row as many times as needed during the month (`POST
/api/collection-entries`); editing or deleting an existing row is
admin-only (`PATCH`/`DELETE /api/collection-entries/:id`,
`requireRole("admin")`) — enforced server-side, not just hidden in the
UI. The Monthly Entry screen shows a live-computed total per partner,
an add form, and a log of every submission (admin sees Edit/Delete on
each row; staff sees the log read-only, so they can confirm what
they've entered).

Commission %, bonus %, discount, and last month due are separate,
admin-only parameters on `PartnerMonthEntry`
(`backend/src/routes/entries.ts`) and, along with every amount computed
from them, are withheld by the API entirely for a staff session — not
just hidden in the UI, and any attempt to set them via a raw API call
is silently ignored server-side. Vouchers are the one place staff
*does* see the full commission/bonus/due breakdown, since printing
that for partners is their job.

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
